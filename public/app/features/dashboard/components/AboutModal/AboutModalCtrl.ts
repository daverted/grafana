import coreModule from 'app/core/core_module';

export class AboutModalCtrl {
  modalTitle: string;
  aboutTitle: string;
  subTitle: string;
  text: string;
  videoUrl: string;
  screenshotUrl: string;
  installUrl: string;
  learnMoreUrl: string;
  demoUrl: string;

  dismiss: () => void;

  /** @ngInject */
  constructor() {}
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
      aboutTitle: '<',
      subTitle: '<',
      text: '<',
      videoUrl: '<',
      screenshotUrl: '<',
      installUrl: '<',
      learnMoreUrl: '<',
      demoUrl: '<',
    },
    bindToController: true,
  };
}

coreModule.directive('aboutModal', aboutModalDirective);
