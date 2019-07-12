import React, { PureComponent } from 'react';
import appEvents from '../../app_events';
import TopSection from './TopSection';
import BottomSection from './BottomSection';
import config from 'app/core/config';

const homeUrl = config.appSubUrl || '/';

export class SideMenu extends PureComponent {
  toggleSideMenuSmallBreakpoint = () => {
    appEvents.emit('toggle-sidemenu-mobile');
  };

  render() {
    return [
      <a href={homeUrl} className="sidemenu__logo" key="logo">
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
      </a>,
      <div className="sidemenu__logo_small_breakpoint" onClick={this.toggleSideMenuSmallBreakpoint} key="hamburger">
        <i className="fa fa-bars" />
        <span className="sidemenu__close">
          <i className="fa fa-times" />
          &nbsp;Close
        </span>
      </div>,
      <TopSection key="topsection" />,
      <BottomSection key="bottomsection" />,
    ];
  }
}
