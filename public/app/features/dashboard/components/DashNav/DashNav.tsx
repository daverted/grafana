// Libaries
import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';

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
import { DashboardModel } from '../../state';
import { StoreState } from 'app/types';

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

  constructor(props: Props) {
    super(props);
    this.playlistSrv = this.props.$injector.get('playlistSrv');
  }

  onDahboardNameClick = () => {
    appEvents.emit('show-dash-search');
  };

  onFolderNameClick = () => {
    appEvents.emit('show-dash-search', {
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
    appEvents.emit('toggle-kiosk-mode');
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

    appEvents.emit('show-modal', {
      src: 'public/app/features/dashboard/components/ShareModal/template.html',
      scope: modalScope,
    });
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
    const homeUrl = '/d/lg0U4qriz/home';

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
    return [
      <VarMenu key="1" variableName="environments" dashboard={dashboard} />,
      <VarMenu key="2" variableName="applications" dashboard={dashboard} />,
      <VarMenu key="3" variableName="deployments" dashboard={dashboard} />,
      <VarMenu key="4" variableName="servers" dashboard={dashboard} />,
    ];
  }

  renderOverOpsLinks() {
    const user = this.props.$injector.get('contextSrv').user;
    const variables = this.props.$injector.get('variableSrv').variables;
    let host = '';
    let port = '443';
    let proto = 'http://';

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
    });

    const logout = () => {
      $.post(proto + host + '/app/account/logout', { is_full_logout: true }, (data: any, textStatus: string) => {
        window.location.reload();
      }).fail(() => {
        console.warn('fallback to grafana logout');
        window.location.assign('/logout');
      });
    };

    return (
      <div className="oo-links">
        {/* <Tooltip content="What's New"></Tooltip> */}
        <div className="menu-item">
          <div className="variable-link-wrapper dropdown">
            <a className="variable-value-link no-border dropdown-toggle" data-toggle="dropdown" href="#">
              <i className="fas fa-ellipsis-v" />
            </a>
            <ul className="dropdown-menu pull-right" role="menu">
              <li>
                <span className="user name">{user.name}</span>
              </li>
              <li>
                <span className="user email">{user.email}</span>
              </li>
              <li>
                <a href="/profile">Profile</a>
              </li>
              <li className="divider" />
              <li>
                <a href="#" onClick={this.onToggleTVMode}>
                  <i className="fa fa-desktop" />
                  Cycle view mode
                </a>
              </li>
              <li className="divider" />
              <li>
                <span className="header">Platform</span>
              </li>
              <li>
                <a href={proto + host + '/'} target="_blank">
                  Event Explorer
                </a>
              </li>
              <li>
                <a href="/d/mTGNNTfiz/settings" target="_blank">
                  Settings
                </a>
              </li>
              <li className="disabled">
                <a href="#">Alerts</a>
              </li>
              <li className="divider" />
              <li>
                <span className="header">Help</span>
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
                <a href="https://support.overops.com/hc/en-us" target="_blank">
                  Support Center
                </a>
              </li>
              <li>
                <a href="https://support.overops.com/hc/en-us/community/topics" target="_blank">
                  OverOps Community
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
    return (
      <div className="navbar">
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
      </div>
    );
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
