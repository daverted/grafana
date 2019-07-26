import coreModule from 'app/core/core_module';

export class ManageLabelsModalCtrl {
  eventId: string;
  eventEnv: string;
  eventName: string;
  eventLabels: string;
  envLabels = [];
  originalLabels = [];
  isLoading: boolean;
  isNew: boolean;
  newLabel: string;
  allCheck: boolean;
  filter: string;

  dismiss: () => void;
  isSaving: boolean;

  /** @ngInject */
  constructor(private templateSrv, private $scope, private $rootScope) {
    this.isLoading = true;
    this.isNew = false;
    this.allCheck = false;

    this.isSaving = false;

    try {
      // apiKey and apiUrl must exist as page variables

      const apiKey = this.templateSrv.index.apiKey.current.value;
      const apiUrl = this.templateSrv.index.apiUrl.current.value;
      const apiVer = this.templateSrv.index.apiVer.current.value;

      $.ajax({
        url: apiUrl + '/api/v' + apiVer + '/services/' + this.eventEnv + '/labels',
        headers: { 'x-api-key': apiKey },
        method: 'GET',
        error: err => {
          this.$rootScope.appEvent('alert-error', [err]);
          console.error(err);
        },
        success: data => {
          try {
            this.$scope.$apply(() => {
              this.isLoading = false;

              const labels = JSON.parse(data).labels;
              const eventLabelsArray = this.eventLabels.split(', ');

              for (let i = 0, l = labels.length; i < l; i++) {
                labels[i].checked = false;
                for (let j = 0, k = eventLabelsArray.length; j < k; j++) {
                  if (labels[i].name === eventLabelsArray[j]) {
                    labels[i].checked = true;
                  }
                }
              }

              this.envLabels = labels;
              this.originalLabels = JSON.parse(JSON.stringify(labels)); // deep clone
            });
          } catch (ex) {
            console.error(ex);
          }
        },
      });
    } catch (e) {
      console.error('Caught exception in ManageLabelsModalCtrl constructor');
      console.error(e);
    }
  }

  checkAll() {
    this.envLabels.forEach(label => {
      if (this.filter === undefined || label.name.includes(this.filter)) {
        label.checked = this.allCheck;
      }
    });
  }

  uncheckAll() {
    this.allCheck = false;
  }

  createNew() {
    this.isNew = true;
  }

  selectOld() {
    this.isNew = false;
  }

  save() {
    if (this.isNew) {
      if (this.newLabel === undefined || this.newLabel.trim() === '') {
        return;
      }
      this.isSaving = true;
      try {
        // apiKey and apiUrl must exist as page variables
        const apiKey = this.templateSrv.index.apiKey.current.value;
        const apiUrl = this.templateSrv.index.apiUrl.current.value;
        const apiVer = this.templateSrv.index.apiVer.current.value;

        $.ajax({
          url: apiUrl + '/api/v' + apiVer + '/services/' + this.eventEnv + '/labels',
          headers: { 'x-api-key': apiKey },
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({
            name: this.newLabel,
          }),
          error: err => {
            this.$rootScope.appEvent('alert-error', [err.responseText]);
            this.dismiss();
          },
          success: data => {
            this.$rootScope.appEvent('alert-success', ['Label saved']);
            this.dismiss();
          },
        });
      } catch (e) {
        console.error('Caught exception in ManageLabelsModalCtrl.save()');
        console.error(e);
      }
    } else {
      this.isSaving = true;

      // apiKey and apiUrl must exist as page variables
      const apiKey = this.templateSrv.index.apiKey.current.value;
      const apiUrl = this.templateSrv.index.apiUrl.current.value;
      const apiVer = this.templateSrv.index.apiVer.current.value;

      const add = [];
      const remove = [];
      const urls = [];

      this.envLabels.forEach((label, i) => {
        if (
          label.type === 'USER' &&
          !label.name.includes('.infra') &&
          this.originalLabels[i].checked !== label.checked
        ) {
          if (label.checked) {
            add.push(label.name);
          } else {
            remove.push(label.name);
          }
        }
      });

      this.eventId
        .toString()
        .split(',')
        .forEach(id => {
          urls.push(apiUrl + '/api/v' + apiVer + '/services/' + this.eventEnv + '/events/' + id + '/labels');
        });

      try {
        const ajax = url => {
          $.ajax({
            url: url,
            headers: { 'x-api-key': apiKey },
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ add: add, remove: remove }),
            error: err => {
              this.$rootScope.appEvent('alert-error', [err.responseText]);
              this.dismiss();
            },
            success: data => {
              if (urls.length > 0) {
                const url = urls.pop();
                ajax(url);
              } else {
                this.$rootScope.appEvent('alert-success', ['Labels saved']);
                this.dismiss();
              }
            },
          });
        };

        const url = urls.pop();
        ajax(url);
      } catch (e) {
        console.error('Caught exception in ManageLabelsModalCtrl.save()');
        console.error(e);
      }

      this.dismiss();
    }
  }
}

export function manageLabelsModalDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/components/ManageLabelsModal/template.html',
    controller: ManageLabelsModalCtrl,
    controllerAs: 'ctrl',
    scope: {
      dismiss: '&',
      eventName: '<',
      eventId: '<',
      eventEnv: '<',
      eventLabels: '<',
      filter: '=',
      newLabel: '=',
    },
    bindToController: true,
  };
}

coreModule.directive('manageLabelsModal', manageLabelsModalDirective);
