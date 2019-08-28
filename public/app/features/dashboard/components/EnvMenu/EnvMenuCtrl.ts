import angular, { ILocationService } from 'angular';
import _ from 'lodash';
import { VariableSrv } from 'app/features/templating/all';

export class EnvMenuCtrl {
  variables: any;
  dashboard: any;

  /** @ngInject */
  constructor(private variableSrv: VariableSrv, private $location: ILocationService) {
    _.each(this.variableSrv.variables, variable => {
      if (variable.name === 'environments') {
        this.variables = [variable];
      }
    });
  }

  annotationStateChanged() {
    this.dashboard.startRefresh();
  }

  variableUpdated(variable: any) {
    this.variableSrv.variableUpdated(variable, true);
  }

  openEditView(editview: any) {
    const search = _.extend(this.$location.search(), { editview: editview });
    this.$location.search(search);
  }
}

export function envmenuDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/components/EnvMenu/template.html',
    controller: EnvMenuCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      dashboard: '=',
    },
  };
}

angular.module('grafana.directives').directive('dashboardEnvmenu', envmenuDirective);
