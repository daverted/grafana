// Libraries
import React, { PureComponent } from 'react';

// Utils & Services
import { AngularComponent, getAngularLoader } from '@grafana/runtime';

// Types
import { DashboardModel } from '../../state/DashboardModel';

export interface Props {
  dashboard: DashboardModel | null;
  variableName: string | '';
}

export class VarMenu extends PureComponent<Props> {
  element: HTMLElement;
  angularCmp: AngularComponent;

  componentDidMount() {
    const loader = getAngularLoader();

    const template = '<dashboard-varmenu dashboard="dashboard" variable-name="variableName" />';
    const scopeProps = {
      dashboard: this.props.dashboard,
      variableName: this.props.variableName,
    };

    this.angularCmp = loader.load(this.element, scopeProps, template);
  }

  componentWillUnmount() {
    if (this.angularCmp) {
      this.angularCmp.destroy();
    }
  }

  render() {
    return <div ref={element => (this.element = element)} />;
  }
}
