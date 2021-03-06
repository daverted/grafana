import _ from 'lodash';
import $ from 'jquery';
import { MetricsPanelCtrl } from 'app/plugins/sdk';
import config from 'app/core/config';
import { transformDataToTable } from './transformers';
import { tablePanelEditor } from './editor';
import { columnOptionsTab } from './column_options';
import { TableRenderer } from './renderer';
import { isTableData } from '@grafana/data';
import { TemplateSrv } from 'app/features/templating/template_srv';
import { PanelEvents } from '@grafana/data';
import { CoreEvents } from 'app/types';
import { appEvents } from 'app/core/core';

class TablePanelCtrl extends MetricsPanelCtrl {
  static templateUrl = 'module.html';

  pageIndex: number;
  dataRaw: any;
  table: any;
  renderer: any;

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

    _.defaults(this.panel, this.panelDefaults);

    this.events.on(PanelEvents.dataReceived, this.onDataReceived.bind(this));
    this.events.on(PanelEvents.dataSnapshotLoad, this.onDataReceived.bind(this));
    this.events.on(PanelEvents.editModeInitialized, this.onInitEditMode.bind(this));
    this.events.on(PanelEvents.initPanelActions, this.onInitPanelActions.bind(this));
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

  render() {
    this.table = transformDataToTable(this.dataRaw, this.panel);
    this.table.sort(this.panel.sort);

    this.renderer = new TableRenderer(
      this.panel,
      this.table,
      this.dashboard.isTimezoneUtc(),
      this.$sanitize,
      this.templateSrv,
      config.theme.type
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
  }

  exportCsv() {
    const scope = this.$scope.$new(true);
    scope.tableData = this.renderer.render_values();
    scope.panel = 'table';
    this.publishAppEvent(CoreEvents.showModal, {
      templateHtml: '<export-data-modal panel="panel" data="tableData"></export-data-modal>',
      scope,
      modalClass: 'modal--narrow',
    });
  }

  link(scope: any, elem: JQuery, attrs: any, ctrl: TablePanelCtrl) {
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

    function appendTableRows(tbodyElem: JQuery) {
      ctrl.renderer.setTable(data);
      tbodyElem.empty();
      tbodyElem.html(ctrl.renderer.render(ctrl.pageIndex));
    }

    function switchPage(e: any) {
      const el = $(e.currentTarget);
      ctrl.pageIndex = parseInt(el.text(), 10) - 1;
      renderPanel();
    }

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
      const panelElem = elem.parents('.panel-content');
      const rootElem = elem.find('.table-panel-scroll');
      const tbodyElem = elem.find('tbody');
      const footerElem = elem.find('.table-panel-footer');

      elem.css({ 'font-size': panel.fontSize });
      panelElem.addClass('table-panel-content');

      appendTableRows(tbodyElem);
      appendPaginationControls(footerElem);

      rootElem.css({ 'max-height': getTableHeight() });
    }

    function ooActionResolve(e: JQueryEventObject) {
      const el = $(e.currentTarget);
      try {
        // apiKey and apiUrl must exist as page variables
        const apiKey = ctrl.renderer.templateSrv.index.apiKey.current.value;
        const apiUrl = ctrl.renderer.templateSrv.index.apiUrl.current.value;
        const apiVer = ctrl.renderer.templateSrv.index.apiVer.current.value;

        const envId = el.data('envId');

        const urls: any = [];

        el.data('eventId')
          .toString()
          .split(',')
          .forEach((eventId: string) => {
            urls.push(apiUrl + '/api/v' + apiVer + '/services/' + envId + '/events/' + eventId + '/resolve');
          });

        // start spinner
        el.removeClass('oo-svg resolve').addClass('fa fa-spinner fa-spin');

        const ajax = (url: string) => {
          $.ajax({
            url: url,
            headers: { 'x-api-key': apiKey },
            method: 'POST',
            error: err => {
              // replace spinner with red x
              el.removeClass('fa fa-spinner fa-spin oo-action-resolve')
                .addClass('far fa-times-circle danger')
                .attr('data-original-title', 'Error resolving event');

              appEvents.emit('alert-error', ['Error resolving event']);
            },
            success: data => {
              if (urls.length > 0) {
                const url = urls.pop();
                ajax(url);
              } else {
                // unset spinner
                el.removeClass('fa fa-spinner fa-spin').addClass('oo-svg resolve');

                el.parents('tr').addClass('strike');
                appEvents.emit('alert-success', ['Event resolved']);

                // setTimeout(() => {
                //   ctrl.events.emit('refresh');
                // }, 1000);
              }
            },
          });
        };

        const url = urls.pop();
        ajax(url);
      } catch (e) {
        el.removeClass('oo-svg resolve fa fa-spinner fa-spin oo-action-resolve')
          .addClass('far fa-times-circle danger')
          .attr('data-original-title', 'Error resolving event');

        appEvents.emit('alert-error', ['Error resolving event']);

        console.error('Caught Exception in ooActionResolve');
        console.error(e);
      }
    }

    function ooActionArchive(e: JQueryEventObject) {
      const el = $(e.currentTarget);
      try {
        // apiKey and apiUrl must exist as page variables
        const apiKey = ctrl.renderer.templateSrv.index.apiKey.current.value;
        const apiUrl = ctrl.renderer.templateSrv.index.apiUrl.current.value;
        const apiVer = ctrl.renderer.templateSrv.index.apiVer.current.value;

        const envId = el.data('envId');

        const urls: any[] | string[] = [];

        el.data('eventId')
          .toString()
          .split(',')
          .forEach((eventId: string) => {
            urls.push(apiUrl + '/api/v' + apiVer + '/services/' + envId + '/events/' + eventId + '/delete');
          });

        // start spinner
        el.removeClass('oo-svg archive').addClass('fa fa-spinner fa-spin');

        const ajax = (url: string) => {
          $.ajax({
            url: url,
            headers: { 'x-api-key': apiKey },
            method: 'POST',
            error: err => {
              // replace spinner with red x
              el.removeClass('fa fa-spinner fa-spin oo-action-archive')
                .addClass('far fa-times-circle danger')
                .attr('data-original-title', 'Error hiding event');

              appEvents.emit('alert-error', ['Error hiding event']);
            },
            success: data => {
              if (urls.length > 0) {
                const url = urls.pop();
                ajax(url);
              } else {
                // unset spinner
                el.removeClass('fa fa-spinner fa-spin').addClass('oo-svg archive');

                el.parents('tr').addClass('strike');
                appEvents.emit('alert-success', ['Event hidden']);
              }
            },
          });
        };

        const url = urls.pop();
        ajax(url);
      } catch (e) {
        el.removeClass('oo-svg archive fa fa-spinner fa-spin oo-action-archive')
          .addClass('far fa-times-circle danger')
          .attr('data-original-title', 'Error hiding event');

        appEvents.emit('alert-error', ['Error hiding event']);

        console.error('Caught Exception in ooActionArchive');
        console.error(e);
      }
    }

    function ooActionInbox(e: JQueryEventObject) {
      const el = $(e.currentTarget);

      try {
        // apiKey and apiUrl must exist as page variables
        const apiKey = ctrl.renderer.templateSrv.index.apiKey.current.value;
        const apiUrl = ctrl.renderer.templateSrv.index.apiUrl.current.value;
        const apiVer = ctrl.renderer.templateSrv.index.apiVer.current.value;

        const envId = el.data('envId');

        const urls: any[] | string[] = [];

        el.data('eventId')
          .toString()
          .split(',')
          .forEach((eventId: string) => {
            urls.push(apiUrl + '/api/v' + apiVer + '/services/' + envId + '/events/' + eventId + '/inbox');
          });

        // start spinner
        el.removeClass('oo-svg inbox').addClass('fa fa-spinner fa-spin');

        const ajax = (url: string) => {
          $.ajax({
            url: url,
            headers: { 'x-api-key': apiKey },
            method: 'POST',
            error: err => {
              // replace spinner with red x
              el.removeClass('fa fa-spinner fa-spin oo-action-inbox')
                .addClass('far fa-times-circle danger')
                .attr('data-original-title', 'Error moving event to inbox');

              appEvents.emit('alert-error', ['Error moving event to inbox']);
            },
            success: data => {
              if (urls.length > 0) {
                const url = urls.pop();
                ajax(url);
              } else {
                // replace spinner with green check
                el.removeClass('fa fa-spinner fa-spin').addClass('oo-svg inbox');

                el.parents('tr').removeClass('strike');
                appEvents.emit('alert-success', ['Event restored']);

                // setTimeout(() => {
                //   ctrl.events.emit('refresh');
                // }, 3000);
              }
            },
          });
        };

        const url = urls.pop();
        ajax(url);
      } catch (e) {
        el.removeClass('oo-svg inbox fa fa-spinner fa-spin oo-action-inbox')
          .addClass('far fa-times-circle danger')
          .attr('data-original-title', 'Error resolving event');

        appEvents.emit('alert-error', ['Error moving event to inbox']);

        console.error('Caught Exception in ooActionInbox');
        console.error(e);
      }
    }

    function ooActionForceSnapshot(e: any) {
      const el = $(e.currentTarget);
      const elIcon = el.children('i');

      e.preventDefault();
      e.stopPropagation();

      try {
        // apiKey and apiUrl must exist as page variables
        const apiKey = ctrl.renderer.templateSrv.index.apiKey.current.value;
        const apiUrl = ctrl.renderer.templateSrv.index.apiUrl.current.value;
        const apiVer = ctrl.renderer.templateSrv.index.apiVer.current.value;

        const envId = el.data('envId');

        const urls: any[] | string[] = [];

        el.data('eventId')
          .toString()
          .split(',')
          .forEach((eventId: string) => {
            urls.push(apiUrl + '/api/v' + apiVer + '/services/' + envId + '/events/' + eventId + '/force-snapshot');
          });

        // start spinner
        elIcon.removeClass('oo-svg snapshot').addClass('fa fa-spinner fa-spin');

        const ajax = (url: string) => {
          $.ajax({
            url: url,
            headers: { 'x-api-key': apiKey },
            method: 'POST',
            error: err => {
              // replace spinner with red x
              elIcon
                .removeClass('fa fa-spinner fa-spin')
                .addClass('far fa-times-circle danger')
                .attr('data-original-title', 'Error forcing snapshot');
            },
            success: data => {
              if (urls.length > 0) {
                const url = urls.pop();
                ajax(url);
              } else {
                // replace spinner with green check
                elIcon
                  .removeClass('fa fa-spinner fa-spin')
                  .addClass('far fa-check-circle success')
                  .attr('data-original-title', 'Forced snapshot');
              }

              // TODO updates aren't instant, need to delay this
              // refresh table
              // ctrl.events.emit('refresh');
            },
          });
        };

        const url = urls.pop();
        ajax(url);
      } catch (e) {
        elIcon
          .removeClass('oo-svg snapshot fa fa-spinner fa-spin')
          .addClass('far fa-times-circle danger')
          .attr('data-original-title', 'Error forcing snapshot');
        console.error('Caught Exception in ooActionForceSnapshot');
        console.error(e);
      }
    }

    function ooActionManageLabels(e: JQueryEventObject) {
      e.preventDefault();
      e.stopPropagation();

      const el = $(e.currentTarget);

      const template =
        '<manage-labels-modal event-id="model.eventId" event-env="model.envId" filter="" ' +
        'event-name="model.eventName" event-labels="model.eventLabels" dismiss="dismiss()" ' +
        'new-label="model.newLabel">' +
        '</manage-labels-modal>';

      ctrl.publishAppEvent(CoreEvents.showModal, {
        templateHtml: template,
        modalClass: 'modal--narrow',
        model: {
          eventId: el.data('eventId'),
          envId: el.data('envId'),
          eventName: el.data('value'),
          eventLabels: el.data('labels'),
        },
      });
    }

    function iFrameModal(e: JQueryEventObject) {
      e.preventDefault();
      e.stopPropagation();

      const el = $(e.currentTarget);

      const url = el.prop('href') || 'href??';

      const template = `<i-frame-modal dismiss="dismiss()" url="model.url"></i-frame-modal>`;

      appEvents.emit('show-modal', {
        templateHtml: template,
        modalClass: 'modal--iframe',
        model: {
          url: url,
        },
      });
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

    function addFilterClicked(e: any) {
      const filterData = $(e.currentTarget).data();
      const options = {
        datasource: panel.datasource,
        key: data.columns[filterData.column].text,
        value: data.rows[filterData.row][filterData.column],
        operator: filterData.operator,
      };

      ctrl.variableSrv.setAdhocFilter(options);
    }

    elem.on('click', '.table-panel-page-link', switchPage);
    elem.on('click', '.table-panel-filter-link', addFilterClicked);

    // wire up overops event actions
    elem.on('click', '.oo-action-resolve', ooActionResolve);
    elem.on('click', '.oo-action-archive', ooActionArchive);
    elem.on('click', '.oo-action-inbox', ooActionInbox);
    elem.on('click', '.oo-action-snapshot', ooActionForceSnapshot);
    elem.on('click', '.oo-action-manage-labels', ooActionManageLabels);

    // wire up iframe modal
    elem.on('click', '[data-iframe]', iFrameModal);

    const unbindDestroy = scope.$on('$destroy', () => {
      elem.off('click', '.table-panel-page-link');
      elem.off('click', '.table-panel-filter-link');
      unbindDestroy();
    });

    ctrl.events.on(PanelEvents.render, (renderData: any) => {
      data = renderData || data;
      if (data) {
        renderPanel();
      }
      ctrl.renderingCompleted();
    });
  }
}

export { TablePanelCtrl, TablePanelCtrl as PanelCtrl };
