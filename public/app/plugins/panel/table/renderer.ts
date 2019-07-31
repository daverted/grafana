import _ from 'lodash';
import { getValueFormat, getColorFromHexRgbOrName, GrafanaThemeType, ScopedVars } from '@grafana/ui';
import { stringToJsRegex } from '@grafana/data';
import { ColumnStyle } from '@grafana/ui/src/components/Table/TableCellBuilder';
import { dateTime } from '@grafana/data';
import { TemplateSrv } from 'app/features/templating/template_srv';
import { TableRenderModel, ColumnRender } from './types';

export class TableRenderer {
  formatters: any[];
  colorState: any;

  constructor(
    private panel: { styles: ColumnStyle[]; pageSize: number },
    private table: TableRenderModel,
    private isUtc: boolean,
    private sanitize: (v: any) => any,
    private templateSrv: TemplateSrv,
    private theme?: GrafanaThemeType
  ) {
    this.initColumns();
  }

  setTable(table: TableRenderModel) {
    this.table = table;

    this.initColumns();
  }

  initColumns() {
    this.formatters = [];
    this.colorState = {};

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

  getColorForValue(value: number, style: ColumnStyle) {
    if (!style.thresholds) {
      return null;
    }
    for (let i = style.thresholds.length; i > 0; i--) {
      if (value >= style.thresholds[i - 1]) {
        return getColorFromHexRgbOrName(style.colors[i], this.theme);
      }
    }
    return getColorFromHexRgbOrName(_.first(style.colors), this.theme);
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
              this.setColorState(v, column.style);
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
              this.setColorState(v, column.style);
              return this.defaultCellFormatter(map.text, column.style);
            }
          }
        }

        if (v === null || v === void 0) {
          return '-';
        }

        this.setColorState(v, column.style);
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

        this.setColorState(v, column.style);
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

        const template = (icon, v) => {
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
              this.setColorState(value, column.style);
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

  setColorState(value: any, style: ColumnStyle) {
    if (!style.colorMode) {
      return;
    }

    if (value === null || value === void 0 || _.isArray(value)) {
      return;
    }

    const numericValue = Number(value);
    if (isNaN(numericValue)) {
      return;
    }

    this.colorState[style.colorMode] = this.getColorForValue(numericValue, style);
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

  renderCell(columnIndex: number, rowIndex: number, value: any, addWidthHack = false) {
    value = this.formatColumnValue(columnIndex, value);

    const column = this.table.columns[columnIndex];
    let cellStyle = '';
    let textStyle = '';
    const cellClasses = [];
    let cellClass = '';

    if (this.colorState.cell) {
      cellStyle = ' style="background-color:' + this.colorState.cell + '"';
      cellClasses.push('table-panel-color-cell');
      this.colorState.cell = null;
    } else if (this.colorState.value) {
      textStyle = ' style="color:' + this.colorState.value + '"';
      this.colorState.value = null;
    }
    // because of the fixed table headers css only solution
    // there is an issue if header cell is wider the cell
    // this hack adds header content to cell (not visible)
    let columnHtml = '';
    if (addWidthHack) {
      columnHtml =
        '<div class="table-panel-width-hack">' +
        (column.style && column.style.noHeader ? '' : this.table.columns[columnIndex].title) +
        '</div>';
    }

    if (value === undefined) {
      cellStyle = ' style="display:none;"';
      column.hidden = true;
    } else {
      column.hidden = false;
    }

    if (column.hidden === true) {
      return '';
    }

    if (column.style && column.style.preserveFormat) {
      cellClasses.push('table-panel-cell-pre');
    }

    if (column.style && column.style.fontawesome) {
      const scopedVars = this.renderRowVariables(rowIndex);
      const icon = this.templateSrv.replace(column.style.fontawesome, scopedVars);

      value = `
        <i class="${icon}" style="padding-right:.5rem"></i>${value}
      `;
    }

    // get scoped vars
    const scopedVars = this.renderRowVariables(rowIndex);
    scopedVars['__cell'] = { value: value, text: value ? value.toString() : '' };

    if (column.style && column.style.link) {
      // Render cell as link

      const cellLink = this.templateSrv.replace(column.style.linkUrl, scopedVars, encodeURIComponent);
      const cellLinkTooltip = this.templateSrv.replace(column.style.linkTooltip, scopedVars);
      const cellTarget = column.style.linkTargetBlank ? '_blank' : '';

      cellClasses.push('table-panel-cell-link');

      if (column.style && column.style.eventActions) {
        cellClasses.push('actions-wrapper');
      }

      const dataLinkTooltip =
        column.style && column.style.mouseoverTooltip ? 'data-link-tooltip-mouseover' : 'data-link-tooltip';

      if (value !== '') {
        columnHtml +=
          ` <a href="${cellLink}" target="${cellTarget}" ${dataLinkTooltip} ` +
          `data-original-title="${cellLinkTooltip}" data-placement="right"${textStyle}> `;
        if (column.style && column.style.eventActions) {
          columnHtml += `<span class="ellipsis">${value}</span>`;
        } else {
          columnHtml += value;
        }
        columnHtml += ` </a> `;
      }
    } else {
      columnHtml += value;
    }

    let ticketUrl = '';
    let eventId = '';
    let envId = '';
    let labels = '';

    if (column.style && column.style.eventActions) {
      this.table.columns.forEach((col, ndx) => {
        if (col.text === 'Jira issue url') {
          ticketUrl = scopedVars['__cell_' + ndx].value;
        } else if (col.text === 'Id') {
          eventId = scopedVars['__cell_' + ndx].value;
        } else if (col.text === 'Env id') {
          envId = scopedVars['__cell_' + ndx].value;
        } else if (col.text === 'Labels') {
          labels = scopedVars['__cell_' + ndx].value;
        }
      });

      columnHtml += '<div class="oo-actions">';

      columnHtml += '<span class="oo-actions-strike">';

      columnHtml +=
        '<i class="oo-svg inbox oo-action-inbox" data-link-tooltip data-placement="right"' +
        'data-original-title="Move to Inbox" ' +
        `data-event-id="${eventId}" data-env-id="${envId}"></i>`;

      columnHtml += '</span><span class="oo-actions-no-strike">';

      //// TODO implement 'graph this event' action
      // columnHtml += '<i class="oo-svg graph" data-link-tooltip ' +
      //   'data-original-title="Plot this event as a series onto the dashboard graph." ' +
      //   'data-placement="right"></i><span class="divider"></span>';

      //// TODO implement 'new timer' action
      // columnHtml += '<i class="oo-svg timer" data-link-tooltip ' +
      //   'data-original-title="Add a timer to know when and why a method\'s execution time ' +
      //   'exceeds a target millisecond threshold." data-placement="right"></i><span class="divider"></span>';

      columnHtml +=
        '<i class="oo-svg resolve oo-action-resolve" data-link-tooltip data-placement="right"' +
        'data-original-title="Mark as Resolved: Should the event reoccur after the code is ' +
        'redeployed, you will receive an alert and the event will be marked as &quot;Resurfaced&quot;." ' +
        `data-event-id="${eventId}" data-env-id="${envId}"></i><span class="divider"></span>`;

      columnHtml +=
        '<i class="oo-svg archive oo-action-archive" data-link-tooltip data-placement="right"' +
        'data-original-title="Hide this event: The event will no longer appear in the dashboard or alerts."' +
        `data-event-id="${eventId}" data-env-id="${envId}"></i><span class="divider"></span>`;

      columnHtml +=
        '<div class="dropdown">' +
        '<a class="dropdown-toggle" role="button" data-toggle="dropdown" href="#">' +
        '<i class="oo-svg more" data-link-tooltip data-placement="right" ' +
        'data-original-title="More Actions"></i>' +
        '</a>' +
        '<ul class="dropdown-menu pull-right" role="menu">';

      if (ticketUrl !== '') {
        columnHtml += `<li>
              <a tabindex="-1" href="//${ticketUrl}" target="_blank">
                <i class="fas fa-ticket-alt"></i> View Ticket
              </a>
            </li>`;
      } else {
        columnHtml += `<li class="disabled">
              <a tabindex="-1" href="#">
                <i class="fas fa-ticket-alt"></i> No Ticket
              </a>
            </li>`;
      }

      columnHtml += `<li>
            <a tabindex="-1" href="" role="button" class="oo-action-manage-labels"
              data-toggle="modal" data-event-id="${eventId}" data-env-id="${envId}"
              data-value="${value}" data-labels="${labels}">
              <i class="oo-svg manage-labels"></i> Manage Labels
            </a>
          </li>`;

      columnHtml += `<li>
            <a tabindex="-1" href="#" class="oo-action-snapshot" data-event-id="${eventId}" data-env-id="${envId}">
              <i class="oo-svg snapshot"></i> Force Snapshot
            </a>
          </li>`;

      columnHtml += '</ul></div>'; // dropdown
      columnHtml += '</span>'; // .oo-actions-no-strike
      columnHtml += '</div>'; // .oo-actions
    }

    if (column.filterable) {
      cellClasses.push('table-panel-cell-filterable');
      columnHtml += `
        <a class="table-panel-filter-link" data-link-tooltip data-original-title="Filter out value" data-placement="bottom"
           data-row="${rowIndex}" data-column="${columnIndex}" data-operator="!=">
          <i class="fa fa-search-minus"></i>
        </a>
        <a class="table-panel-filter-link" data-link-tooltip data-original-title="Filter for value" data-placement="bottom"
           data-row="${rowIndex}" data-column="${columnIndex}" data-operator="=">
          <i class="fa fa-search-plus"></i>
        </a>`;
    }

    if (column.style && column.style.type === 'fontawesome') {
      cellClasses.push('text-center');
    }

    if (cellClasses.length) {
      cellClass = ' class="' + cellClasses.join(' ') + '"';
    }

    columnHtml = '<td' + cellClass + cellStyle + textStyle + '>' + columnHtml + '</td>';
    return columnHtml;
  }

  render(page: number) {
    const pageSize = this.panel.pageSize || 100;
    const startPos = page * pageSize;
    const endPos = Math.min(startPos + pageSize, this.table.rows.length);
    let html = '';

    let renderedColumns = 0;
    for (let y = startPos; y < endPos; y++) {
      const row = this.table.rows[y];
      let cellHtml = '';
      let rowStyle = '';
      const rowClasses = [];
      let rowClass = '';
      renderedColumns = 0;
      for (let i = 0; i < this.table.columns.length; i++) {
        cellHtml += this.renderCell(i, y, row[i], y === startPos);
        if (!this.table.columns[i].hidden) {
          renderedColumns++;
        }
      }

      if (this.colorState.row) {
        rowStyle = ' style="background-color:' + this.colorState.row + '"';
        rowClasses.push('table-panel-color-row');
        this.colorState.row = null;
      }

      if (rowClasses.length) {
        rowClass = ' class="' + rowClasses.join(' ') + '"';
      }

      html += '<tr ' + rowClass + rowStyle + '>' + cellHtml + '</tr>';
    }

    // add bottom whitespace for actions dropdown menu
    html += `<tr><td colspan="${renderedColumns}" style="border:none">&nbsp;</td></tr>
       <tr><td colspan="${renderedColumns}" style="border:none">&nbsp;</td></tr>
       <tr><td colspan="${renderedColumns}" style="border:none">&nbsp;</td></tr>`;

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
