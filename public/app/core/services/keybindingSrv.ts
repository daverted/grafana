import _ from 'lodash';

import appEvents from 'app/core/app_events';
import { store } from 'app/store/store';
import { AppEventEmitter, CoreEvents } from 'app/types';

import Mousetrap from 'mousetrap';
import { PanelEvents } from '@grafana/data';
import 'mousetrap-global-bind';
import { ContextSrv } from './context_srv';
import { ILocationService, IRootScopeService } from 'angular';
import { GrafanaRootScope } from 'app/routes/GrafanaCtrl';
import { getLocationSrv } from '@grafana/runtime';
import { coreModule } from '../core';

export class KeybindingSrv {
  helpModal: boolean;
  modalOpen = false;
  timepickerOpen = false;

  /** @ngInject */
  constructor(
    private $rootScope: GrafanaRootScope,
    private $location: ILocationService,
    private contextSrv: ContextSrv
  ) {
    // clear out all shortcuts on route change
    $rootScope.$on('$routeChangeSuccess', () => {
      Mousetrap.reset();
      // rebind global shortcuts
      this.setupGlobal();
    });

    this.setupGlobal();
    appEvents.on(CoreEvents.showModal, () => (this.modalOpen = true));
    appEvents.on(CoreEvents.timepickerOpen, () => (this.timepickerOpen = true));
    appEvents.on(CoreEvents.timepickerClosed, () => (this.timepickerOpen = false));
  }

  setupGlobal() {
    this.bind(['?', 'h'], this.showHelpModal);
    this.bind('g h', this.goToHome);

    if (this.contextSrv.isGrafanaAdmin) {
      this.bind('g a', this.openAlerting);
      this.bind('g p', this.goToProfile);
      this.bind('s o', this.openSearch);
      this.bind('f', this.openSearch);
    }

    this.bindGlobal('esc', this.exit);
  }

  globalEsc() {
    const anyDoc = document as any;
    const activeElement = anyDoc.activeElement;

    // typehead needs to handle it
    const typeaheads = document.querySelectorAll('.slate-typeahead--open');
    if (typeaheads.length > 0) {
      return;
    }

    // second check if we are in an input we can blur
    if (activeElement && activeElement.blur) {
      if (
        activeElement.nodeName === 'INPUT' ||
        activeElement.nodeName === 'TEXTAREA' ||
        activeElement.hasAttribute('data-slate-editor')
      ) {
        anyDoc.activeElement.blur();
        return;
      }
    }

    // ok no focused input or editor that should block this, let exist!
    this.exit();
  }

  openSearch() {
    appEvents.emit(CoreEvents.showDashSearch);
  }

  openAlerting() {
    this.$location.url('/alerting');
  }

  goToHome() {
    this.$location.url('/');
  }

  goToProfile() {
    this.$location.url('/profile');
  }

  showHelpModal() {
    appEvents.emit(CoreEvents.showModal, { templateHtml: '<help-modal></help-modal>' });
  }

  exit() {
    appEvents.emit(CoreEvents.hideModal);

    if (this.modalOpen) {
      this.modalOpen = false;
      return;
    }

    if (this.timepickerOpen) {
      this.$rootScope.appEvent(CoreEvents.closeTimepicker);
      this.timepickerOpen = false;
      return;
    }

    // close settings view
    const search = this.$location.search();
    if (search.editview) {
      delete search.editview;
      this.$location.search(search);
      return;
    }

    if (search.fullscreen) {
      appEvents.emit(PanelEvents.panelChangeView, { fullscreen: false, edit: false });
      return;
    }

    if (search.kiosk) {
      this.$rootScope.appEvent(CoreEvents.toggleKioskMode, { exit: true });
    }
  }

  bind(keyArg: string | string[], fn: () => void) {
    Mousetrap.bind(
      keyArg,
      (evt: any) => {
        evt.preventDefault();
        evt.stopPropagation();
        evt.returnValue = false;
        return this.$rootScope.$apply(fn.bind(this));
      },
      'keydown'
    );
  }

  bindGlobal(keyArg: string, fn: () => void) {
    Mousetrap.bindGlobal(
      keyArg,
      (evt: any) => {
        evt.preventDefault();
        evt.stopPropagation();
        evt.returnValue = false;
        return this.$rootScope.$apply(fn.bind(this));
      },
      'keydown'
    );
  }

  unbind(keyArg: string, keyType?: string) {
    Mousetrap.unbind(keyArg, keyType);
  }

  showDashEditView() {
    const search = _.extend(this.$location.search(), { editview: 'settings' });
    this.$location.search(search);
  }

  setupDashboardBindings(scope: IRootScopeService & AppEventEmitter, dashboard: any) {
    this.bind('mod+o', () => {
      dashboard.graphTooltip = (dashboard.graphTooltip + 1) % 3;
      appEvents.emit(CoreEvents.graphHoverClear);
      dashboard.startRefresh();
    });

    this.bind('mod+s', () => {
      scope.appEvent(CoreEvents.saveDashboard);
    });

    this.bind('t z', () => {
      scope.appEvent(CoreEvents.zoomOut, 2);
    });

    this.bind('ctrl+z', () => {
      scope.appEvent(CoreEvents.zoomOut, 2);
    });

    this.bind('t left', () => {
      scope.appEvent(CoreEvents.shiftTime, -1);
    });

    this.bind('t right', () => {
      scope.appEvent(CoreEvents.shiftTime, 1);
    });

    // edit panel
    this.bind('e', () => {
      if (dashboard.meta.focusPanelId && dashboard.meta.canEdit) {
        appEvents.emit(PanelEvents.panelChangeView, {
          fullscreen: true,
          edit: true,
          panelId: dashboard.meta.focusPanelId,
          toggle: true,
        });
      }
    });

    // view panel
    this.bind('v', () => {
      if (dashboard.meta.focusPanelId) {
        appEvents.emit(PanelEvents.panelChangeView, {
          fullscreen: true,
          panelId: dashboard.meta.focusPanelId,
          toggle: true,
        });
      }
    });

    // delete panel
    this.bind('p r', () => {
      if (dashboard.meta.focusPanelId && dashboard.meta.canEdit) {
        appEvents.emit(CoreEvents.removePanel, dashboard.meta.focusPanelId);
        dashboard.meta.focusPanelId = 0;
      }
    });

    // share panel
    this.bind('p s', () => {
      if (dashboard.meta.focusPanelId) {
        const shareScope: any = scope.$new();
        const panelInfo = dashboard.getPanelInfoById(dashboard.meta.focusPanelId);
        shareScope.panel = panelInfo.panel;
        shareScope.dashboard = dashboard;

        appEvents.emit(CoreEvents.showModal, {
          src: 'public/app/features/dashboard/components/ShareModal/template.html',
          scope: shareScope,
        });
      }
    });

    // inspect panel
    this.bind('p i', () => {
      if (dashboard.meta.focusPanelId) {
        getLocationSrv().update({ partial: true, query: { inspect: dashboard.meta.focusPanelId } });
      }
    });

    // toggle panel legend
    this.bind('p l', () => {
      if (dashboard.meta.focusPanelId) {
        const panelInfo = dashboard.getPanelInfoById(dashboard.meta.focusPanelId);
        if (panelInfo.panel.legend) {
          const panelRef = dashboard.getPanelById(dashboard.meta.focusPanelId);
          panelRef.legend.show = !panelRef.legend.show;
          panelRef.render();
        }
      }
    });

    // toggle all panel legends
    this.bind('d l', () => {
      dashboard.toggleLegendsForAll();
    });

    if (this.contextSrv.isGrafanaAdmin) {
      // collapse all rows
      this.bind('d shift+c', () => {
        dashboard.collapseRows();
      });

      // expand all rows
      this.bind('d shift+e', () => {
        dashboard.expandRows();
      });

      this.bind('d n', () => {
        this.$location.url('/dashboard/new');
      });
    }

    this.bind('d r', () => {
      dashboard.startRefresh();
    });

    if (this.contextSrv.isGrafanaAdmin) {
      this.bind('d s', () => {
        this.showDashEditView();
      });
    }

    this.bind('d k', () => {
      appEvents.emit(CoreEvents.toggleKioskMode);
    });

    this.bind('d v', () => {
      appEvents.emit(CoreEvents.toggleViewMode);
    });

    if (this.contextSrv.isGrafanaAdmin) {
      //Autofit panels
      this.bind('d a', () => {
        // this has to be a full page reload
        const queryParams = store.getState().location.query;
        const newUrlParam = queryParams.autofitpanels ? '' : '&autofitpanels';
        window.location.href = window.location.href + newUrlParam;
      });
    }
  }
}

coreModule.service('keybindingSrv', KeybindingSrv);

/**
 * Code below exports the service to react components
 */

let singletonInstance: KeybindingSrv;

export function setKeybindingSrv(instance: KeybindingSrv) {
  singletonInstance = instance;
}

export function getKeybindingSrv(): KeybindingSrv {
  return singletonInstance;
}
