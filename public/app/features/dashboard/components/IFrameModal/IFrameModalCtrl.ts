import coreModule from 'app/core/core_module';
import { appEvents } from 'app/core/core';

export class IFrameModalCtrl {
  url: string;

  dismiss: () => void;

  /** @ngInject */
  constructor() {
    // listen for modal iframe events
    window.addEventListener('message', messageHandler);

    const dismiss = this.dismiss;

    function messageHandler(event: any) {
      // aptrinsic also uses this mechanism, so only match messages like:
      // { success: true, message: 'done' }
      if (typeof event.data.success === 'boolean' && typeof event.data.message === 'string') {
        // message currently does not differentiate between successfully saving and just closing
        // appEvents.emit('alert-success', ['Alerts Settings Success']);
        if (!event.data.success) {
          appEvents.emit('alert-error', ['Alert Settings Error: ' + event.data.message]);
        }

        // dismiss the modal
        dismiss();

        // clean up
        window.removeEventListener('message', messageHandler);
      }
    }
  }
}

export function iFrameModalDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/components/IFrameModal/template.html',
    controller: IFrameModalCtrl,
    controllerAs: 'ctrl',
    scope: {
      dismiss: '&',
      url: '<',
    },
    bindToController: true,
  };
}

coreModule.directive('iFrameModal', iFrameModalDirective);
