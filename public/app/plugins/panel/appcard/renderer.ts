import _ from 'lodash';
import { GrafanaThemeType } from '@grafana/data/src/types/theme';
import { getValueFormat } from '@grafana/data/src/valueFormats/valueFormats';
import { getColorFromHexRgbOrName } from '@grafana/data/src/utils/namedColorsPalette';
import { stringToJsRegex, ScopedVars } from '@grafana/data';
import { ColumnStyle } from '@grafana/ui/src/components/Table/TableCellBuilder';
import { dateTime } from '@grafana/data';
import { TemplateSrv } from 'app/features/templating/template_srv';
import { TableRenderModel, ColumnRender } from './types';

export class AppCardRenderer {
  formatters: any[];
  appName: string;

  constructor(
    private panel: {
      styles: ColumnStyle[];
      pageSize: number;
      linkRow: boolean;
      linkUrl: string;
      linkNewTab: boolean;
    },
    private table: TableRenderModel,
    private isUtc: boolean,
    private sanitize: (v: any) => any,
    private templateSrv: TemplateSrv,
    private theme: GrafanaThemeType,
    private appNameFilter: string,
    private borderClass: string
  ) {
    this.initColumns();
  }

  setTable(table: TableRenderModel) {
    this.table = table;

    this.initColumns();
  }

  initColumns() {
    this.formatters = [];

    for (let colIndex = 0; colIndex < this.table.columns.length; colIndex++) {
      const column = this.table.columns[colIndex];
      column.title = column.text;

      for (let i = 0; i < this.panel.styles.length; i++) {
        const style = this.panel.styles[i];

        const regex = stringToJsRegex(style.pattern);
        if (column.text.match(regex)) {
          column.style = style;

          if (style.alias) {
            column.title = column.text.replace(regex, style.alias);
          }

          break;
        }
      }

      this.formatters[colIndex] = this.createColumnFormatter(column);
    }
  }

  defaultCellFormatter(v: any, style: ColumnStyle) {
    if (v === null || v === void 0 || v === undefined) {
      return '';
    }

    if (_.isArray(v)) {
      v = v.join(', ');
    }

    if (style && style.sanitize) {
      return this.sanitize(v);
    } else {
      return _.escape(v);
    }
  }

  createColumnFormatter(column: ColumnRender) {
    if (!column.style) {
      return this.defaultCellFormatter;
    }

    if (column.style.type === 'hidden') {
      return (v: any): undefined => undefined;
    }

    if (column.style.type === 'date') {
      return (v: any) => {
        if (v === undefined || v === null) {
          return '-';
        }

        if (_.isArray(v)) {
          v = v[0];
        }

        // if is an epoch (numeric string and len > 12)
        if (_.isString(v) && !isNaN(v as any) && v.length > 12) {
          v = parseInt(v, 10);
        }

        let date = dateTime(v);

        if (this.isUtc) {
          date = date.utc();
        }

        return date.format(column.style.dateFormat);
      };
    }

    if (column.style.type === 'string') {
      return (v: any): any => {
        if (_.isArray(v)) {
          v = v.join(', ');
        }

        const mappingType = column.style.mappingType || 0;

        if (mappingType === 1 && column.style.valueMaps) {
          for (let i = 0; i < column.style.valueMaps.length; i++) {
            const map = column.style.valueMaps[i];

            if (v === null) {
              if (map.value === 'null') {
                return map.text;
              }
              continue;
            }

            // Allow both numeric and string values to be mapped
            if ((!_.isString(v) && Number(map.value) === Number(v)) || map.value === v) {
              return this.defaultCellFormatter(map.text, column.style);
            }
          }
        }

        if (mappingType === 2 && column.style.rangeMaps) {
          for (let i = 0; i < column.style.rangeMaps.length; i++) {
            const map = column.style.rangeMaps[i];

            if (v === null) {
              if (map.from === 'null' && map.to === 'null') {
                return map.text;
              }
              continue;
            }

            if (Number(map.from) <= Number(v) && Number(map.to) >= Number(v)) {
              return this.defaultCellFormatter(map.text, column.style);
            }
          }
        }

        if (v === null || v === void 0) {
          return '-';
        }

        return this.defaultCellFormatter(v, column.style);
      };
    }

    if (column.style.type === 'number') {
      const valueFormatter = getValueFormat(column.unit || column.style.unit);

      return (v: any): any => {
        if (v === null || v === void 0) {
          return '-';
        }

        if (isNaN(v) || _.isArray(v)) {
          return this.defaultCellFormatter(v, column.style);
        }

        return valueFormatter(v, column.style.decimals, null);
      };
    }

    if (column.style.type === 'html') {
      return (value: any) => {
        return value;
      };
    }

    if (column.style.type === 'fontawesome') {
      return (value: any) => {
        const mappingType = column.style.mappingType || 0;

        const template = (icon: any, v: any) => {
          if (column.style.valueAsTooltip) {
            return `<i class="${icon}" data-link-tooltip data-original-title="${v}" data-placement="right"></i>`;
          }
          return `<i class="${icon}"></i>`;
        };

        if (mappingType === 1 && column.style.valueMaps) {
          for (let i = 0; i < column.style.valueMaps.length; i++) {
            const map = column.style.valueMaps[i];
            if (value === null) {
              if (map.value === 'null') {
                return template(map.text, map.value);
              }
              continue;
            }

            // Allow both numeric and string values to be mapped
            if ((!_.isString(value) && Number(map.value) === Number(value)) || map.value === value) {
              return template(this.defaultCellFormatter(map.text, column.style), map.value);
            }
          }
        }

        const sanitized = this.sanitize(value);
        return template(sanitized, sanitized);
      };
    }

    return (value: any) => {
      return this.defaultCellFormatter(value, column.style);
    };
  }

  renderRowVariables(rowIndex: number) {
    const scopedVars: ScopedVars = {};
    let cellVariable;
    const row = this.table.rows[rowIndex];
    for (let i = 0; i < row.length; i++) {
      cellVariable = `__cell_${i}`;
      scopedVars[cellVariable] = { value: row[i], text: row[i] ? row[i].toString() : '' };
    }
    return scopedVars;
  }

  formatColumnValue(colIndex: number, value: any) {
    return this.formatters[colIndex] ? this.formatters[colIndex](value) : value;
  }

  // sets column.hidden field
  hideColumns(columnIndex: number) {
    if (this.table.columns[columnIndex].style) {
      this.table.columns[columnIndex].hidden = this.table.columns[columnIndex].style.type === 'hidden' ? true : false;
    }
  }

  getColorForValue(value: number, style: ColumnStyle) {
    if (!style.thresholds || !style.colors) {
      return null;
    }
    for (let i = style.thresholds.length; i > 0; i--) {
      if (value >= style.thresholds[i - 1]) {
        return getColorFromHexRgbOrName(style.colors[i], this.theme);
      }
    }

    const color = getColorFromHexRgbOrName(_.first(style.colors), this.theme);
    return color;
  }

  getColorState(value: any, style: ColumnStyle) {
    if (!style.colorMode) {
      return '';
    }

    if (value === null || value === void 0 || _.isArray(value)) {
      return '';
    }

    const numericValue = Number(value);
    if (isNaN(numericValue)) {
      return '';
    }

    return this.getColorForValue(numericValue, style);
  }

  renderCard(rowIndex: number) {
    // hard coded for now :(
    let appName = {
      text: '',
      ndx: -1,
      title: '',
      colorState: {},
      link: '',
      linkTooltip: '',
      linkTarget: '',
      dataLinkTooltip: '',
    };
    let reliabilityState = {
      text: '',
      ndx: -1,
      title: '',
      link: '',
      linkTooltip: '',
      linkTarget: '',
      dataLinkTooltip: '',
    };
    let alertStatus = { text: '', ndx: -1, title: '', link: '', linkTooltip: '', linkTarget: '', dataLinkTooltip: '' };
    let newIssues = {
      text: '',
      value: '',
      ndx: -1,
      title: '',
      colorState: {},
      link: '',
      linkTooltip: '',
      linkTarget: '',
      dataLinkTooltip: '',
    };
    let regressions = {
      text: '',
      value: '',
      ndx: -1,
      title: '',
      colorState: {},
      link: '',
      linkTooltip: '',
      linkTarget: '',
      dataLinkTooltip: '',
    };
    let transactionFailureCount = {
      text: '',
      value: '',
      ndx: -1,
      title: '',
      colorState: {},
      link: '',
      linkTooltip: '',
      linkTarget: '',
      dataLinkTooltip: '',
    };
    let slowdowns = {
      text: '',
      value: '',
      ndx: -1,
      title: '',
      colorState: {},
      link: '',
      linkTooltip: '',
      linkTarget: '',
      dataLinkTooltip: '',
    };
    let errorCount = {
      text: '',
      value: '',
      ndx: -1,
      title: '',
      colorState: {},
      link: '',
      linkTooltip: '',
      linkTarget: '',
      dataLinkTooltip: '',
    };
    let transactionCount = {
      text: '',
      value: '',
      ndx: -1,
      title: '',
      colorState: {},
      link: '',
      linkTooltip: '',
      linkTarget: '',
      dataLinkTooltip: '',
    };
    let connectedClients = {
      text: '',
      value: '',
      ndx: -1,
      title: '',
      colorState: {},
      link: '',
      linkTooltip: '',
      linkTarget: '',
      dataLinkTooltip: '',
    };

    // get scoped vars
    const scopedVars = this.renderRowVariables(rowIndex);

    this.table.columns.forEach((col, ndx) => {
      const value = scopedVars['__cell_' + ndx].value;
      const mappingType = col.style ? col.style.mappingType || 0 : 0;

      const template = (icon: any, v: any) => {
        if (col.style.valueAsTooltip) {
          return `<i class="${icon}" data-link-tooltip data-original-title="${v}" data-placement="right"></i>`;
        }
        return `<i class="${icon}"></i>`;
      };

      const templated = () => {
        // set border
        if (typeof value === 'number') {
          switch (value) {
            case 0:
              this.borderClass = 'border-success';
              break;
            case 1:
              this.borderClass = 'border-warning';
              break;
            case 2:
              this.borderClass = 'border-danger';
              break;
          }
        }

        if (mappingType === 1 && col.style.valueMaps) {
          for (let i = 0; i < col.style.valueMaps.length; i++) {
            const map = col.style.valueMaps[i];
            if (value === null) {
              if (map.value === 'null') {
                return template(map.text, map.value);
              }
              continue;
            }

            // Allow both numeric and string values to be mapped
            if ((!_.isString(value) && Number(map.value) === Number(value)) || map.value === value) {
              // this.setColorState(value, column.style);
              return template(this.defaultCellFormatter(map.text, col.style), map.value);
            }
          }
        }

        const sanitized = this.sanitize(value);
        return template(sanitized, sanitized);
      };

      let link = '';
      let linkTooltip = '';
      let linkTarget = '';
      let dataLinkTooltip = '';

      if (col.style && col.style.link) {
        // Render cell as link
        link = this.templateSrv.replace(col.style.linkUrl, scopedVars, encodeURIComponent);
        linkTooltip = this.templateSrv.replace(col.style.linkTooltip, scopedVars);
        linkTarget = col.style.linkTargetBlank ? '_blank' : '';

        dataLinkTooltip = col.style && col.style.mouseoverTooltip ? 'data-link-tooltip-mouseover' : 'data-link-tooltip';
      }

      if (col.text === 'Name') {
        this.appName = value;
        appName = {
          text: value,
          ndx: ndx,
          title: col.title,
          colorState: this.getColorState(value, col.style),
          link: link,
          linkTooltip: linkTooltip,
          linkTarget: linkTarget,
          dataLinkTooltip: dataLinkTooltip,
        };
      } else if (col.text === 'ReliabilityState') {
        reliabilityState = {
          text: templated(),
          ndx: ndx,
          title: col.title,
          link: link,
          linkTooltip: linkTooltip,
          linkTarget: linkTarget,
          dataLinkTooltip: dataLinkTooltip,
        };
      } else if (col.text === 'AlertStatus') {
        alertStatus = {
          text: templated(),
          ndx: ndx,
          title: col.title,
          link: link,
          linkTooltip: linkTooltip,
          linkTarget: linkTarget,
          dataLinkTooltip: dataLinkTooltip,
        };
      } else if (col.text === 'NewIssues') {
        newIssues = {
          text: value || '0',
          value: value,
          ndx: ndx,
          title: col.title,
          colorState: this.getColorState(value, col.style),
          link: link,
          linkTooltip: linkTooltip,
          linkTarget: linkTarget,
          dataLinkTooltip: dataLinkTooltip,
        };
      } else if (col.text === 'Regressions') {
        regressions = {
          text: value || '0',
          value: value,
          ndx: ndx,
          title: col.title,
          colorState: this.getColorState(value, col.style),
          link: link,
          linkTooltip: linkTooltip,
          linkTarget: linkTarget,
          dataLinkTooltip: dataLinkTooltip,
        };
      } else if (col.text === 'TransactionFailureCount') {
        transactionFailureCount = {
          text: value || '0',
          value: value,
          ndx: ndx,
          title: col.title,
          colorState: this.getColorState(value, col.style),
          link: link,
          linkTooltip: linkTooltip,
          linkTarget: linkTarget,
          dataLinkTooltip: dataLinkTooltip,
        };
      } else if (col.text === 'Slowdowns') {
        slowdowns = {
          text: value || '0',
          value: value,
          ndx: ndx,
          title: col.title,
          colorState: this.getColorState(value, col.style),
          link: link,
          linkTooltip: linkTooltip,
          linkTarget: linkTarget,
          dataLinkTooltip: dataLinkTooltip,
        };
      } else if (col.text === 'ErrorCount') {
        errorCount = {
          text: value || '0',
          value: value,
          ndx: ndx,
          title: col.title,
          colorState: this.getColorState(value, col.style),
          link: link,
          linkTooltip: linkTooltip,
          linkTarget: linkTarget,
          dataLinkTooltip: dataLinkTooltip,
        };
      } else if (col.text === 'TransactionCount') {
        transactionCount = {
          text: value || '0',
          value: value,
          ndx: ndx,
          title: col.title,
          colorState: this.getColorState(value, col.style),
          link: link,
          linkTooltip: linkTooltip,
          linkTarget: linkTarget,
          dataLinkTooltip: dataLinkTooltip,
        };
      } else if (col.text === 'ConnectedClients') {
        connectedClients = {
          text: value || '0',
          value: value,
          ndx: ndx,
          title: col.title,
          colorState: this.getColorState(value, col.style),
          link: link,
          linkTooltip: linkTooltip,
          linkTarget: linkTarget,
          dataLinkTooltip: dataLinkTooltip,
        };
      }
    });

    // ` <a href="${cellLink}" target="${cellTarget}" ${dataLinkTooltip} ` +
    // `data-original-title="${cellLinkTooltip}" data-placement="right"> ${value} </a> `;

    const cardHtml = `
      <h2 class="pull-left">
        <span style="margin-right:4px">
          <a href="${reliabilityState.link}" ${reliabilityState.dataLinkTooltip}
            data-original-title="${reliabilityState.linkTooltip}" data-placement="right">
            ${reliabilityState.text}
          </a>
        </span>
        <a href="${appName.link}" ${appName.dataLinkTooltip}
          data-original-title="${appName.linkTooltip}" data-placement="right">
          ${appName.text}
        </a>
      </h2>
      <span class="pull-right control">
        <a href="${alertStatus.link}" data-iframe ${alertStatus.dataLinkTooltip}
          data-original-title="${alertStatus.linkTooltip}" data-placement="right">
          ${alertStatus.text}
        </a>
      </span>
      <hr class="clear">
      <ul class="card-content">
        <li class="value-${newIssues.value}">
          <a href="${newIssues.link}" ${newIssues.dataLinkTooltip}
            data-original-title="${newIssues.linkTooltip}" data-placement="right">
            <span class="stat" style="color:${newIssues.colorState}">${newIssues.text}</span>
            <span class="desc">${newIssues.title}<span>
          </a>
        </li>
        <li class="value-${regressions.value}">
          <a href="${regressions.link}" ${regressions.dataLinkTooltip}
            data-original-title="${regressions.linkTooltip}" data-placement="right">
            <span class="stat" style="color:${regressions.colorState}">${regressions.text}</span>
            <span class="desc">${regressions.title}</span>
          </a>
        </li>
        <li class="value-${transactionFailureCount.value}">
          <a href="${transactionFailureCount.link}" ${transactionFailureCount.dataLinkTooltip}
            data-original-title="${transactionFailureCount.linkTooltip}" data-placement="right">
            <span class="stat" style="color:${transactionFailureCount.colorState}">${
      transactionFailureCount.text
    }</span>
            <span class="desc">${transactionFailureCount.title}</span>
          </a>
        </li>
        <li class="value-${errorCount.value}">
          <a href="${errorCount.link}" ${errorCount.dataLinkTooltip}
            data-original-title="${errorCount.linkTooltip}" data-placement="right">
            <span class="stat" style="color:${errorCount.colorState}">${errorCount.text}</span>
            <span class="desc">${errorCount.title}</span>
          </a>
        </li>
      </ul>
      <ul class="card-content card-footer">
        <li class="value-${transactionCount.value}">
          <a href="${transactionCount.link}" ${transactionCount.dataLinkTooltip}
            data-original-title="${transactionCount.linkTooltip}" data-placement="right">
            <span class="stat" style="color:${transactionCount.colorState}">${transactionCount.text}</span>
            <span class="desc">${transactionCount.title}</span>
          </a>
        </li>
        <li class="value-${slowdowns.value}">
          <a href="${slowdowns.link}" ${slowdowns.dataLinkTooltip}
            data-original-title="${slowdowns.linkTooltip}" data-placement="right">
            <span class="stat" style="color:${slowdowns.colorState}">${slowdowns.text}</span>
            <span class="desc">${slowdowns.title}</span>
          </a>
        </li>
        <li class="value-${connectedClients.value}">
          <a href="${connectedClients.link}" ${connectedClients.dataLinkTooltip}
            data-original-title="${connectedClients.linkTooltip}" data-placement="right">
            <span class="stat" style="color:${connectedClients.colorState}">${connectedClients.text}</span>
            <span class="desc">${connectedClients.title}</span>
          </a>
        </li>
      </ul>
    `;

    return cardHtml;
  }

  render(page: number) {
    const pageSize = this.panel.pageSize || 100;
    const startPos = page * pageSize;
    const endPos = Math.min(startPos + pageSize, this.table.rows.length);
    let html = '';

    for (let y = startPos; y < endPos; y++) {
      // still needed to hide columns
      for (let i = 0; i < this.table.columns.length; i++) {
        this.hideColumns(i);
      }

      // filter by app name
      const cardHtml = this.renderCard(y);
      if (this.appName !== undefined && this.appNameFilter !== undefined && this.appNameFilter !== '') {
        if (this.appName.includes(this.appNameFilter)) {
          html += `<div class="card ${this.borderClass}"><div class="card-body">${cardHtml}</div></div>`;
        }
      } else {
        html += `<div class="card ${this.borderClass}"><div class="card-body">${cardHtml}</div></div>`;
      }
    }

    return html;
  }

  render_values() {
    const rows = [];

    for (let y = 0; y < this.table.rows.length; y++) {
      const row = this.table.rows[y];
      const newRow = [];
      for (let i = 0; i < this.table.columns.length; i++) {
        newRow.push(this.formatColumnValue(i, row[i]));
      }
      rows.push(newRow);
    }
    return {
      columns: this.table.columns,
      rows: rows,
    };
  }
}
