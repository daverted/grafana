import coreModule from 'app/core/core_module';

export class AboutModalCtrl {
  modalTitle: string;
  title: string;
  body: string;
  youTubeImg: string;
  youTubeUrl: string;
  installUrl: string;
  learnUrl: string;
  demoUrl: string;

  dismiss: () => void;

  /** @ngInject */
  constructor(private templateSrv: any) {
    // values exist as page variables
    const templateService = this.templateSrv.index;

    this.title = templateService.aboutTitle ? templateService.aboutTitle.current.value || '' : '';
    this.body = templateService.aboutBody ? templateService.aboutBody.current.value || '' : '';
    this.youTubeImg = templateService.aboutYouTubeImg ? templateService.aboutYouTubeImg.current.value || '' : '';
    this.youTubeUrl = templateService.aboutYouTubeUrl ? templateService.aboutYouTubeUrl.current.value || '' : '';
    this.installUrl = templateService.aboutInstallUrl ? templateService.aboutInstallUrl.current.value || '' : '';
    this.learnUrl = templateService.aboutLearnUrl ? templateService.aboutLearnUrl.current.value || '' : '';
    this.demoUrl = templateService.aboutDemoUrl ? templateService.aboutDemoUrl.current.value || '' : '';
  }
}

export function aboutModalDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/components/AboutModal/template.html',
    controller: AboutModalCtrl,
    controllerAs: 'ctrl',
    scope: {
      dismiss: '&',
      modalTitle: '<',
    },
    bindToController: true,
  };
}

coreModule.directive('aboutModal', aboutModalDirective);
