import angular, { ILocationService } from 'angular';
import _ from 'lodash';
import { VariableSrv } from 'app/features/templating/all';

export class VarMenuCtrl {
  variables: any;
  dashboard: any;
  variableName: any;
  label: any;

  /** @ngInject */
  constructor(private variableSrv: VariableSrv, private $location: ILocationService) {
    _.each(this.variableSrv.variables, variable => {
      if (variable.name === this.variableName) {
        this.variables = [variable];
        this.label = variable.label;
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

export function varmenuDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/components/VarMenu/template.html',
    controller: VarMenuCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {
      dashboard: '=',
      variableName: '=',
    },
  };
}

angular.module('grafana.directives').directive('dashboardVarmenu', varmenuDirective);
