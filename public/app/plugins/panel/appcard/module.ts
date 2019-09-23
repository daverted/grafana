import _ from 'lodash';
import $ from 'jquery';
import { MetricsPanelCtrl } from 'app/plugins/sdk';
import config from 'app/core/config';
import { transformDataToTable } from './transformers';
import { tablePanelEditor } from './editor';
import { columnOptionsTab } from './column_options';
import { AppCardRenderer } from './renderer';
import { isTableData } from '@grafana/data';
import { TemplateSrv } from 'app/features/templating/template_srv';

class AppCardPanelCtrl extends MetricsPanelCtrl {
  static templateUrl = 'module.html';

  pageIndex: number;
  dataRaw: any;
  table: any;
  renderer: any;
  appNameFilter: string;
  cardMode: string;

  panelDefaults: any = {
    targets: [{}],
    transform: 'timeseries_to_columns',
    pageSize: null,
    showHeader: true,
    fixedWidth: false,
    styles: [
      {
        type: 'date',
        pattern: 'Time',
        alias: 'Time',
        dateFormat: 'YYYY-MM-DD HH:mm:ss',
      },
      {
        unit: 'short',
        type: 'number',
        alias: '',
        decimals: 2,
        colors: ['rgba(245, 54, 54, 0.9)', 'rgba(237, 129, 40, 0.89)', 'rgba(50, 172, 45, 0.97)'],
        colorMode: null,
        pattern: '/.*/',
        thresholds: [],
      },
    ],
    columns: [],

    fontSize: '100%',
    sort: { col: 0, desc: true },
  };

  /** @ngInject */
  constructor(
    $scope: any,
    $injector: any,
    templateSrv: TemplateSrv,
    private annotationsSrv: any,
    private $sanitize: any,
    private variableSrv: any
  ) {
    super($scope, $injector);

    this.pageIndex = 0;

    if (this.panel.styles === void 0) {
      this.panel.styles = this.panel.columns;
      this.panel.columns = this.panel.fields;
      delete this.panel.columns;
      delete this.panel.fields;
    }

    this.panel.timeRanges = [
      { title: 'hour', value: 'now-1h', option: '1h' },
      { title: '3 hours', value: 'now-3h', option: '3h' },
      { title: '6 hours', value: 'now-6h', option: '6h' },
      { title: '12 hours', value: 'now-12h', option: '12h' },
      { title: '24 hours', value: 'now-24h', option: '24h' },
      { title: '48 hours', value: 'now-48h', option: '48h' },
      { title: '7 days', value: 'now-7d', option: '7d' },
      { title: '14 days', value: 'now-14d', option: '14d' },
      { title: '30 days', value: 'now-30d', option: '30d' },
    ];

    // default time range
    this.panel.timeRange = { title: '24 hours', value: 'now-24h' };

    // default mode
    this.setCardMode('');

    // set correct time range if possible -- from grafana time
    // for (let i = 0, l = this.panel.timeRanges.length; i<l; i++) {
    //   const element = this.panel.timeRanges[i];
    //   if (element.value === this.timeSrv.time.from) {
    //     this.panel.timeRange = element;
    //     break;
    //   }
    // }

    // set correct time from tal's custom time variable
    this.variableSrv.variables.forEach((variable: any) => {
      if (variable.name === 'timeRange') {
        for (let i = 0, l = this.panel.timeRanges.length; i < l; i++) {
          const element = this.panel.timeRanges[i];
          if (variable.current.value === element.option) {
            this.panel.timeRange = element;
            break;
          }
        }
      }
    });

    _.defaults(this.panel, this.panelDefaults);

    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('init-panel-actions', this.onInitPanelActions.bind(this));
  }

  setCardMode(mode: string) {
    this.cardMode = mode ? 'mode-' + mode : 'mode-card';
  }

  onInitEditMode() {
    this.addEditorTab('Options', tablePanelEditor, 2);
    this.addEditorTab('Column Styles', columnOptionsTab, 3);
  }

  onInitPanelActions(actions: any[]) {
    actions.push({ text: 'Export CSV', click: 'ctrl.exportCsv()' });
  }

  issueQueries(datasource: any) {
    this.pageIndex = 0;

    if (this.panel.transform === 'annotations') {
      return this.annotationsSrv
        .getAnnotations({
          dashboard: this.dashboard,
          panel: this.panel,
          range: this.range,
        })
        .then((anno: any) => {
          this.loading = false;
          this.dataRaw = anno;
          this.pageIndex = 0;
          this.render();
          return { data: this.dataRaw }; // Not used
        });
    }

    return super.issueQueries(datasource);
  }

  onDataError(err: any) {
    this.dataRaw = [];
    this.render();
  }

  onDataReceived(dataList: any) {
    this.dataRaw = dataList;
    this.pageIndex = 0;

    // automatically correct transform mode based on data
    if (this.dataRaw && this.dataRaw.length) {
      if (isTableData(this.dataRaw[0])) {
        this.panel.transform = 'table';
      } else {
        if (this.dataRaw[0].type === 'docs') {
          this.panel.transform = 'json';
        } else {
          if (this.panel.transform === 'table' || this.panel.transform === 'json') {
            this.panel.transform = 'timeseries_to_rows';
          }
        }
      }
    }

    this.render();
  }

  onFilter() {
    this.render();
  }

  render() {
    this.table = transformDataToTable(this.dataRaw, this.panel);
    this.table.sort(this.panel.sort);

    this.renderer = new AppCardRenderer(
      this.panel,
      this.table,
      this.dashboard.isTimezoneUtc(),
      this.$sanitize,
      this.templateSrv,
      config.theme.type,
      this.panel.appNameFilter,
      ''
    );

    return super.render(this.table);
  }

  toggleColumnSort(col: any, colIndex: any) {
    // remove sort flag from current column
    if (this.table.columns[this.panel.sort.col]) {
      this.table.columns[this.panel.sort.col].sort = false;
    }

    if (this.panel.sort.col === colIndex) {
      if (this.panel.sort.desc) {
        this.panel.sort.desc = false;
      } else {
        this.panel.sort.col = null;
      }
    } else {
      this.panel.sort.col = colIndex;
      this.panel.sort.desc = true;
    }
    this.render();

    return false;
  }

  setTimeRange(timeRange: any, index: any) {
    // update panel
    this.panel.timeRange = timeRange;

    // update time variable
    // this.timeSrv.setTime({
    //   from: timeRange.value,
    //   to: 'now'
    // });

    // update custom time variable
    this.variableSrv.variables.forEach((variable: any) => {
      if (variable.name === 'timeRange') {
        this.variableSrv.setOptionAsCurrent(variable, {
          text: timeRange.option,
          value: timeRange.option,
          selected: true,
        });
        this.variableSrv.updateUrlParamsWithCurrentVariables();
        this.timeSrv.refreshDashboard();
      }
    });
  }

  exportCsv() {
    const scope = this.$scope.$new(true);
    scope.tableData = this.renderer.render_values();
    scope.panel = 'table';
    this.publishAppEvent('show-modal', {
      templateHtml: '<export-data-modal panel="panel" data="tableData"></export-data-modal>',
      scope,
      modalClass: 'modal--narrow',
    });
  }

  link(scope: any, elem: JQuery, attrs: any, ctrl: AppCardPanelCtrl) {
    let data: any;
    const panel = ctrl.panel;
    let pageCount = 0;

    function getTableHeight() {
      let panelHeight = ctrl.height;

      if (pageCount > 1) {
        panelHeight -= 26;
      }

      return panelHeight - 31 + 'px';
    }

    function appendCards(cardElem: JQuery) {
      ctrl.renderer.setTable(data);
      cardElem.empty();
      cardElem.html(ctrl.renderer.render(ctrl.pageIndex));
    }

    // function switchPage(e: any) {
    //   const el = $(e.currentTarget);
    //   ctrl.pageIndex = parseInt(el.text(), 10) - 1;
    //   renderPanel();
    // }

    function appendPaginationControls(footerElem: JQuery) {
      footerElem.empty();

      const pageSize = panel.pageSize || 100;
      pageCount = Math.ceil(data.rows.length / pageSize);
      if (pageCount === 1) {
        return;
      }

      const startPage = Math.max(ctrl.pageIndex - 3, 0);
      const endPage = Math.min(pageCount, startPage + 9);

      const paginationList = $('<ul></ul>');

      for (let i = startPage; i < endPage; i++) {
        const activeClass = i === ctrl.pageIndex ? 'active' : '';
        const pageLinkElem = $(
          '<li><a class="table-panel-page-link pointer ' + activeClass + '">' + (i + 1) + '</a></li>'
        );
        paginationList.append(pageLinkElem);
      }

      footerElem.append(paginationList);
    }

    function renderPanel() {
      const rootElem = elem.find('.app-card-panel-scroll');
      const cardElem = elem.find('.app-cards');
      const footerElem = elem.find('.app-card-panel-footer');

      elem.css({ 'font-size': panel.fontSize });

      appendCards(cardElem);
      appendPaginationControls(footerElem);

      rootElem.css({ 'max-height': getTableHeight() });
    }

    // hook up link tooltips
    elem.tooltip({
      selector: '[data-link-tooltip]',
    });

    // wire up mouseover tooltips
    const drilldownTooltip = $('<div id="tooltip" class="">hello</div>"');

    elem.mouseleave(() => {
      drilldownTooltip.detach();
    });

    elem.mousemove(e => {
      const target = $(e.target);
      let linkTT;

      if (target.data('linkTooltipMouseover') !== undefined) {
        linkTT = target;
      } else {
        linkTT = target.parents('[data-link-tooltip-mouseover]');
      }

      if (linkTT.length < 1) {
        drilldownTooltip.detach();
        return;
      }

      const originalTitle = linkTT.data('originalTitle');

      if (originalTitle !== undefined && originalTitle !== '') {
        drilldownTooltip.text(originalTitle);
        drilldownTooltip.place_tt(e.pageX - 10, e.pageY + 20);
      }
    });

    // function addFilterClicked(e: any) {
    //   const filterData = $(e.currentTarget).data();
    //   const options = {
    //     datasource: panel.datasource,
    //     key: data.columns[filterData.column].text,
    //     value: data.rows[filterData.row][filterData.column],
    //     operator: filterData.operator,
    //   };

    //   ctrl.variableSrv.setAdhocFilter(options);
    // }

    // elem.on('click', '.table-panel-page-link', switchPage);
    // elem.on('click', '.table-panel-filter-link', addFilterClicked);

    // const unbindDestroy = scope.$on('$destroy', () => {
    //   elem.off('click', '.table-panel-page-link');
    //   elem.off('click', '.table-panel-filter-link');
    //   unbindDestroy();
    // });

    ctrl.events.on('render', (renderData: any) => {
      data = renderData || data;
      if (data) {
        renderPanel();
      }
      ctrl.renderingCompleted();
    });
  }
}

export { AppCardPanelCtrl, AppCardPanelCtrl as PanelCtrl };
