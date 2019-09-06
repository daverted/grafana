import coreModule from 'app/core/core_module';

export class AboutModalCtrl {
  modalTitle: string;
  title: string;
  subTitle: string;
  text: string;
  videoURL: string;
  screenshotURL: string;
  installURL: string;
  learnMoreURL: string;
  demoURL: string;

  dismiss: () => void;

  /** @ngInject */
  constructor(private templateSrv: any) {
    // values exist as page variables
    const templateService = this.templateSrv.index;

    console.log(templateService);

    this.title = templateService.aboutTitle ? templateService.aboutTitle.current.value || '' : '';
    this.subTitle = templateService.aboutSubTitle ? templateService.aboutSubTitle.current.value || '' : '';
    this.text = templateService.aboutText ? templateService.aboutText.current.value || '' : '';
    this.videoURL = templateService.aboutVideoURL ? templateService.aboutVideoURL.current.value || '' : '';
    this.screenshotURL = templateService.aboutScreenshotURL
      ? templateService.aboutScreenshotURL.current.value || ''
      : '';
    this.installURL = templateService.aboutInstallURL ? templateService.aboutInstallURL.current.value || '' : '';
    this.learnMoreURL = templateService.aboutLearnMoreURL ? templateService.aboutLearnMoreURL.current.value || '' : '';
    this.demoURL = templateService.aboutDemoURL ? templateService.aboutDemoURL.current.value || '' : '';
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
