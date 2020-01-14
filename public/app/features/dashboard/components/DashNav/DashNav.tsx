// Libaries
import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import ReactGridLayout, { ItemCallback } from 'react-grid-layout';
import classNames from 'classnames';
// @ts-ignore
import sizeMe from 'react-sizeme';

// Utils & Services
import { appEvents } from 'app/core/app_events';
import { PlaylistSrv } from 'app/features/playlist/playlist_srv';

// Components
import { DashNavButton } from './DashNavButton';
import { DashNavTimeControls } from './DashNavTimeControls';
import { Tooltip } from '@grafana/ui';
import { VarMenu } from '../../components/VarMenu';

// State
import { updateLocation } from 'app/core/actions';

// Types
import { GRID_CELL_HEIGHT, GRID_CELL_VMARGIN, GRID_COLUMN_COUNT } from 'app/core/constants';
import { DashboardPanel } from '../../dashgrid/DashboardPanel';
import { DashboardModel, PanelModel } from '../../state';
import { StoreState, CoreEvents } from 'app/types';

// Mixpanel
import { MixpanelWindow } from 'app/features/mixpanel/Mixpanel';
declare let window: MixpanelWindow;

let lastGridWidth = 1400;
let ignoreNextWidthChange = false;

interface GridWrapperProps {
  size: { width: number };
  layout: ReactGridLayout.Layout[];
  onLayoutChange: (layout: ReactGridLayout.Layout[]) => void;
  children: JSX.Element | JSX.Element[];
  onDragStop: ItemCallback;
  onResize: ItemCallback;
  onResizeStop: ItemCallback;
  onWidthChange: () => void;
  className: string;
  isResizable?: boolean;
  isDraggable?: boolean;
  isFullscreen?: boolean;
}

function GridWrapper({
  size,
  layout,
  onLayoutChange,
  children,
  onDragStop,
  onResize,
  onResizeStop,
  onWidthChange,
  className,
  isResizable,
  isDraggable,
  isFullscreen,
}: GridWrapperProps) {
  const width = size.width > 0 ? size.width : lastGridWidth;

  // logic to ignore width changes (optimization)
  if (width !== lastGridWidth) {
    if (ignoreNextWidthChange) {
      ignoreNextWidthChange = false;
    } else if (!isFullscreen && Math.abs(width - lastGridWidth) > 8) {
      onWidthChange();
      lastGridWidth = width;
    }
  }

  return (
    <ReactGridLayout
      width={lastGridWidth}
      className={className}
      isDraggable={isDraggable}
      isResizable={isResizable}
      containerPadding={[0, 0]}
      useCSSTransforms={false}
      margin={[GRID_CELL_VMARGIN, GRID_CELL_VMARGIN]}
      cols={GRID_COLUMN_COUNT}
      rowHeight={GRID_CELL_HEIGHT}
      draggableHandle=".grid-drag-handle"
      layout={layout}
      onResize={onResize}
      onResizeStop={onResizeStop}
      onDragStop={onDragStop}
      onLayoutChange={onLayoutChange}
    >
      {children}
    </ReactGridLayout>
  );
}

const SizedReactLayoutGrid = sizeMe({ monitorWidth: true })(GridWrapper);

export interface OwnProps {
  dashboard: DashboardModel;
  editview: string;
  isEditing: boolean;
  isFullscreen: boolean;
  $injector: any;
  updateLocation: typeof updateLocation;
  onAddPanel: () => void;
}

export interface StateProps {
  location: any;
}

type Props = StateProps & OwnProps;

export class DashNav extends PureComponent<Props> {
  playlistSrv: PlaylistSrv;
  panelMap: { [id: string]: PanelModel };

  constructor(props: Props) {
    super(props);
    this.playlistSrv = this.props.$injector.get('playlistSrv');
  }

  buildLayout() {
    const layout = [];
    this.panelMap = {};

    for (const panel of this.props.dashboard.panels) {
      const stringId = panel.id.toString();
      this.panelMap[stringId] = panel;

      if (!panel.gridPos) {
        console.log('panel without gridpos');
        continue;
      }

      const panelPos: any = {
        i: stringId,
        x: panel.gridPos.x,
        y: panel.gridPos.y,
        w: panel.gridPos.w,
        h: panel.gridPos.h,
      };

      if (panel.type === 'row') {
        panelPos.w = GRID_COLUMN_COUNT;
        panelPos.h = 1;
        panelPos.isResizable = false;
        panelPos.isDraggable = panel.collapsed;
      }

      layout.push(panelPos);
    }

    return layout;
  }

  updateGridPos = (item: ReactGridLayout.Layout, layout: ReactGridLayout.Layout[]) => {
    this.panelMap[item.i].updateGridPos(item);

    // react-grid-layout has a bug (#670), and onLayoutChange() is only called when the component is mounted.
    // So it's required to call it explicitly when panel resized or moved to save layout changes.
    this.onLayoutChange(layout);
  };

  onDahboardNameClick = () => {
    appEvents.emit(CoreEvents.showDashSearch);
  };

  onFolderNameClick = () => {
    appEvents.emit(CoreEvents.showDashSearch, {
      query: 'folder:current',
    });
  };

  onClose = () => {
    if (this.props.editview) {
      this.props.updateLocation({
        query: { editview: null },
        partial: true,
      });
    } else {
      this.props.updateLocation({
        query: { panelId: null, edit: null, fullscreen: null, tab: null },
        partial: true,
      });
    }
  };

  onToggleTVMode = () => {
    appEvents.emit(CoreEvents.toggleKioskMode);
  };

  onSave = () => {
    const { $injector } = this.props;
    const dashboardSrv = $injector.get('dashboardSrv');
    dashboardSrv.saveDashboard();
  };

  onOpenSettings = () => {
    this.props.updateLocation({
      query: { editview: 'settings' },
      partial: true,
    });
  };

  onStarDashboard = () => {
    const { dashboard, $injector } = this.props;
    const dashboardSrv = $injector.get('dashboardSrv');

    dashboardSrv.starDashboard(dashboard.id, dashboard.meta.isStarred).then((newState: any) => {
      dashboard.meta.isStarred = newState;
      this.forceUpdate();
    });
  };

  onPlaylistPrev = () => {
    this.playlistSrv.prev();
  };

  onPlaylistNext = () => {
    this.playlistSrv.next();
  };

  onPlaylistStop = () => {
    this.playlistSrv.stop();
    this.forceUpdate();
  };

  onOpenShare = () => {
    const $rootScope = this.props.$injector.get('$rootScope');
    const modalScope = $rootScope.$new();
    modalScope.tabIndex = 0;
    modalScope.dashboard = this.props.dashboard;

    appEvents.emit(CoreEvents.showModal, {
      src: 'public/app/features/dashboard/components/ShareModal/template.html',
      scope: modalScope,
    });
  };

  onLayoutChange = (newLayout: ReactGridLayout.Layout[]) => {
    for (const newPos of newLayout) {
      this.panelMap[newPos.i].updateGridPos(newPos);
    }

    this.props.dashboard.sortPanelsByGridPos();

    // Call render() after any changes.  This is called when the layout loads
    this.forceUpdate();
  };

  onWidthChange = () => {
    for (const panel of this.props.dashboard.panels) {
      panel.resizeDone();
    }
    this.forceUpdate();
  };

  onResize: ItemCallback = (layout, oldItem, newItem) => {
    this.panelMap[newItem.i].updateGridPos(newItem);
  };

  onResizeStop: ItemCallback = (layout, oldItem, newItem) => {
    this.updateGridPos(newItem, layout);
    this.panelMap[newItem.i].resizeDone();
  };

  onDragStop: ItemCallback = (layout, oldItem, newItem) => {
    this.updateGridPos(newItem, layout);
  };

  onOpenAbout = () => {
    const templateService = this.props.$injector.get('templateSrv').index;
    const aboutFields = templateService.aboutFields;

    const modalTitle = this.props.dashboard.title + ' Dashboard';

    if (!aboutFields || !aboutFields.current || aboutFields.current.isNone) {
      appEvents.emit('alert-error', ['Not Found', 'About "' + modalTitle + '" content not found']);
      return;
    }

    try {
      const about = JSON.parse(aboutFields.current.value);

      const template = `<about-modal dismiss="dismiss()" modal-title="model.modalTitle" about-title="model.title"
        sub-title="model.subTitle" text="model.text" video-url="model.videoURL"
        screenshot-url="model.screenshotURL" install-url="model.installURL"
        learn-more-url="model.learnMoreURL" demo-url="model.demoURL"></about-modal>`;

      appEvents.emit('show-modal', {
        templateHtml: template,
        modalClass: 'modal--narrow',
        model: {
          modalTitle: about.title,
          title: '',
          subTitle: about.subTitle,
          text: about.text,
          videoURL: about.videoURL,
          screenshotURL: about.screenshotURL,
          installURL: about.installURL,
          learnMoreURL: about.learnMoreURL,
          demoURL: about.demoURL,
        },
      });
    } catch (e) {
      appEvents.emit('alert-error', ['Parse Error', 'Unable to parse "' + modalTitle + '" JSON']);
      console.error(e);
      return;
    }
  };

  renderDashboardTitleSearchButton() {
    const { dashboard } = this.props;

    // const folderTitle = dashboard.meta.folderTitle;
    // const haveFolder = dashboard.meta.folderId > 0;

    return (
      <>
        {this.isSettings && <span className="navbar-settings-title">{dashboard.title} / Settings</span>}
        <div className="navbar__spacer" />
      </>
    );
  }

  renderLogo() {
    const homeUrl = '/';

    return (
      <a href={homeUrl} className="navbar__logo" key="logo">
        <svg
          className="img"
          enableBackground="new 0 0 54.2 53.4"
          version="1.1"
          viewBox="0 0 54.2 53.4"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* tslint:disable */}
          <path
            className="st2"
            d="m18.9 26.7c1.8-11.3 4.3-14.3 11.7-14.3 5.1 0 7.4 1.6 7.6 6.6h7.9c-0.5-9-5.2-13-14.3-13h-21.5l7.8 3.2c-3.9 3-6.1 8.6-7.3 16.8-0.2 1.7-0.4 2.9-0.5 4.9h8c0.2-1.9 0.3-2.7 0.6-4.2z"
          />
          <path
            className="st0"
            d="m37.6 25.8c-1.7 11.2-4.5 14.4-11.7 14.4-5 0-7.3-1.2-7.6-6.2h-8c0.6 9 5.8 12.2 15.4 12.2 12.4 0 17.7-4.7 19.9-19.9 0.2-1.5 0.4-2.3 0.4-4.3h-8c0 1-0.2 2.4-0.4 3.8z"
          />
          <path
            className="st2"
            d="m18.9 26.7c1.8-11.3 4.3-14.3 11.7-14.3 5.1 0 7.4 1.6 7.6 6.6h7.9c-0.5-9-5.2-13-14.3-13h-21.5l7.8 3.2c-3.9 3-6.1 8.6-7.3 16.8-0.2 1.7-0.4 2.9-0.5 4.9h8c0.2-1.9 0.3-2.7 0.6-4.2z"
          />
          <path
            className="st3"
            d="m37.6 25.8c-1.7 11.2-4.5 14.4-11.7 14.4-5 0-7.3-1.2-7.6-6.2h-8c0.6 9 5.8 12.2 15.4 12.2 12.4 0 17.7-4.7 19.9-19.9 0.2-1.5 0.4-2.3 0.4-4.3h-8c0 1-0.2 2.4-0.4 3.8z"
          />
          {/* tslint:enable */}
        </svg>
      </a>
    );
  }

  renderVarMenus() {
    const { dashboard } = this.props;
    return dashboard.title === 'Applications'
      ? [<VarMenu key="1" variableName="environments" dashboard={dashboard} />]
      : [
          <VarMenu key="1" variableName="environments" dashboard={dashboard} />,
          <VarMenu key="2" variableName="applications" dashboard={dashboard} />,
          // <VarMenu key="3" variableName="deployments" dashboard={dashboard} />,
          // <VarMenu key="4" variableName="servers" dashboard={dashboard} />,
        ];
  }

  integrationsModal = (e: any, data: any) => {
    const modalTitle = 'Integrations';

    const title = data.title ? data.title : '';
    const subTitle = data.subTitle ? data.subTitle : '';
    const text = data.text ? data.text : '';
    const videoURL = data.videoURL ? data.videoURL : '';
    const screenshotURL = data.screenshotURL ? data.screenshotURL : '';
    const installURL = data.installURL ? data.installURL : '';
    const learnMoreURL = data.learnMoreURL ? data.learnMoreURL : '';
    const demoURL = data.demoURL ? data.demoURL : '';

    const template = `<about-modal dismiss="dismiss()" modal-title="model.modalTitle" about-title="model.title"
      sub-title="model.subTitle" text="model.text" video-url="model.videoURL"
      screenshot-url="model.screenshotURL" install-url="model.installURL"
      learn-more-url="model.learnMoreURL" demo-url="model.demoURL"></about-modal>`;

    appEvents.emit('show-modal', {
      templateHtml: template,
      modalClass: 'modal--narrow',
      model: {
        modalTitle: modalTitle,
        title: title,
        subTitle: subTitle,
        text: text,
        videoURL: videoURL,
        screenshotURL: screenshotURL,
        installURL: installURL,
        learnMoreURL: learnMoreURL,
        demoURL: demoURL,
      },
    });

    // track event in mixpanel
    window.mixpanel.track('Integration clicked', { name: data.name });
  };

  renderIntegrations() {
    const templateService = this.props.$injector.get('templateSrv').index;
    const featureFields = templateService.featureFields;

    if (!featureFields || !featureFields.options) {
      return '';
    }

    return (
      <div className="menu-item">
        <div className="variable-link-wrapper dropdown">
          <a className="variable-value-link no-border dropdown-toggle" data-toggle="dropdown" href="#">
            Integrations <i className="fas fa-angle-down" />
          </a>
          <ul className="dropdown-menu pull-right" role="menu">
            {featureFields.options.map((option: any, index: any) => {
              try {
                const opt = JSON.parse(option.value);
                return (
                  <li key={index}>
                    <a href="#" onClick={e => this.integrationsModal(e, opt)}>
                      {opt.name}
                    </a>
                  </li>
                );
              } catch (e) {
                console.error('unable to parse featureField JSON');
                return '';
              }
            })}
          </ul>
        </div>
      </div>
    );
  }

  renderOverOpsLinks() {
    const user = this.props.$injector.get('contextSrv').user;
    const variables = this.props.$injector.get('variableSrv').variables;
    let host = '';
    let port = '443';
    let proto = 'http://';
    let environment = '';

    _.each(variables, variable => {
      if (variable.name === 'apiHost') {
        host = variable.current.value;
      }
      if (variable.name === 'apiPort') {
        port = variable.current.value;
        if (port === '443' || port === '8443') {
          proto = 'https://';
        }
      }
      if (variable.name === 'environments') {
        environment = variable.current.value;
      }
    });

    const logout = () => {
      $.post(proto + host + '/app/account/logout', { is_full_logout: true }, (data: any, textStatus: string) => {
        window.location.reload();
      }).fail(() => {
        console.warn('fallback to grafana logout');
        window.location.assign('/logout');
      });
    };

    const settings = () => {
      const settingsUrl = proto + host + '/environments';

      // if multiple, select the first
      if (Array.isArray(environment)) {
        environment = environment[0];
      }

      // no env selected
      if (environment === '' || environment === 'None') {
        return window.location.assign(settingsUrl);
      }

      // trim to get env key
      const keyIndex = environment.indexOf(': S') + 2; // +2 to remove ': '
      environment = environment.substring(keyIndex);

      return window.location.assign(settingsUrl + '/' + environment + '/settings');
    };

    return (
      <div className="oo-links">
        {/* <Tooltip content="What's New"></Tooltip> */}
        {/* this.renderIntegrations() */}
        <div className="menu-item">
          <div className="variable-link-wrapper dropdown">
            <a className="variable-value-link left-border dropdown-toggle" data-toggle="dropdown" href="#">
              <i className="fas fa-ellipsis-v" />
            </a>
            <ul className="dropdown-menu pull-right" role="menu">
              <li>
                <span className="user name">{user.name}</span>
              </li>
              <li>
                <span className="user email">{user.email}</span>
              </li>
              {/* <li className="disabled">
                <a href="#">Dark theme</a>
              </li> */}
              {/* <li className="divider" /> */}
              <li>
                <a href="#" onClick={this.onToggleTVMode}>
                  <i className="far fa-desktop" />
                  Full screen
                </a>
              </li>
              <li className="divider" />
              <li>
                <span className="header">Platform</span>
              </li>
              <li>
                <a href={proto + host + '/'}>Event Explorer</a>
              </li>
              <li>
                <a href={proto + host + '/grafana/'}>Reliability Dashboards</a>
              </li>
              <li>
                <a href="#" onClick={settings}>
                  Settings
                </a>
              </li>
              <li className="divider" />
              <li>
                <span className="header">Help</span>
              </li>
              <li>
                <a href="#" onClick={this.onOpenAbout}>
                  About this screen
                </a>
              </li>
              <li>
                <a href="https://doc.overops.com/docs/whats-new">What's New</a>
              </li>
              <li>
                <a href="https://doc.overops.com/docs/install-collector" target="_blank">
                  Install Guide
                </a>
              </li>
              <li>
                <a href="https://doc.overops.com/docs/configure-your-integrations">Integrations</a>
              </li>
              <li>
                <a href="https://support.overops.com/hc/en-us" target="_blank">
                  Support Center
                </a>
              </li>
              <li>
                <a href="https://support.overops.com/hc/en-us/community/topics" target="_blank">
                  Community
                </a>
              </li>
              <li className="divider" />
              <li>
                <a href="#" onClick={logout}>
                  Log out
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  renderNavPanels() {
    const panelElements = [];

    for (const panel of this.props.dashboard.panels) {
      if (panel.navPanel) {
        const className = panel.navPanelSelected ? 'nav-panel selected' : 'nav-panel';
        const id = panel.id.toString();
        panelElements.push(
          <div key={id} id={'nav-panel-' + id} className={className}>
            <DashboardPanel
              panel={panel}
              dashboard={this.props.dashboard}
              isEditing={false}
              isFullscreen={panel.fullscreen}
              isInView={true}
            />
          </div>
        );
      }
    }

    return panelElements;
  }

  renderNavPanelGrid() {
    const { dashboard, isFullscreen } = this.props;

    return (
      <SizedReactLayoutGrid
        className={classNames({ layout: true })}
        layout={this.buildLayout()}
        isResizable={dashboard.meta.canEdit}
        isDraggable={dashboard.meta.canEdit}
        onLayoutChange={this.onLayoutChange}
        onWidthChange={this.onWidthChange}
        onDragStop={this.onDragStop}
        onResize={this.onResize}
        onResizeStop={this.onResizeStop}
        isFullscreen={isFullscreen}
      >
        {this.renderNavPanels()}
      </SizedReactLayoutGrid>
    );
  }

  get isInFullscreenOrSettings() {
    return this.props.editview || this.props.isFullscreen;
  }

  get isSettings() {
    return this.props.editview;
  }

  renderBackButton() {
    return (
      <div className="navbar-edit">
        <Tooltip content="Go back (Esc)">
          <button className="navbar-edit__back-btn" onClick={this.onClose}>
            <i className="fa fa-arrow-left" />
          </button>
        </Tooltip>
      </div>
    );
  }

  render() {
    const { dashboard, onAddPanel, location, $injector } = this.props;
    const { canStar, canSave, canShare, showSettings, isStarred } = dashboard.meta;
    const { snapshot } = dashboard;
    const snapshotUrl = snapshot && snapshot.originalUrl;
    return [
      <div key="1" className="navbar">
        {this.renderLogo()}
        {this.renderVarMenus()}
        {this.isInFullscreenOrSettings && this.renderBackButton()}
        {this.renderDashboardTitleSearchButton()}

        <div className="navbar-buttons navbar-buttons--actions">
          {canSave && (
            <DashNavButton
              tooltip="Add panel"
              classSuffix="add-panel"
              icon="gicon gicon-add-panel"
              onClick={onAddPanel}
            />
          )}

          {canStar && (
            <DashNavButton
              tooltip="Mark as favorite"
              classSuffix="star"
              icon={`${isStarred ? 'fa fa-star' : 'fa fa-star-o'}`}
              onClick={this.onStarDashboard}
            />
          )}

          {canShare && (
            <DashNavButton
              tooltip="Share dashboard"
              classSuffix="share"
              icon="fa fa-share-square-o"
              onClick={this.onOpenShare}
            />
          )}

          {canSave && (
            <DashNavButton tooltip="Save dashboard" classSuffix="save" icon="fa fa-save" onClick={this.onSave} />
          )}

          {snapshotUrl && (
            <DashNavButton
              tooltip="Open original dashboard"
              classSuffix="snapshot-origin"
              icon="gicon gicon-link"
              href={snapshotUrl}
            />
          )}

          {showSettings && (
            <DashNavButton
              tooltip="Dashboard settings"
              classSuffix="settings"
              icon="fa fa-cog"
              onClick={this.onOpenSettings}
            />
          )}
        </div>

        {!dashboard.timepicker.hidden && (
          <div className="navbar-buttons">
            <DashNavTimeControls
              $injector={$injector}
              dashboard={dashboard}
              location={location}
              updateLocation={updateLocation}
              refreshOnly={dashboard.timepicker.refreshOnly}
            />
          </div>
        )}

        {this.renderOverOpsLinks()}
      </div>,
      <div key="2" className={dashboard.hasNavPanel ? 'navbar nav-panels' : 'd-none'}>
        {this.renderNavPanelGrid()}
      </div>,
    ];
  }
}

const mapStateToProps = (state: StoreState) => ({
  location: state.location,
});

const mapDispatchToProps = {
  updateLocation,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DashNav);
