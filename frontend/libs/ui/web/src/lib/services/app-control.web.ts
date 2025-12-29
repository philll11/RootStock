import { AppControlAdapter } from '@rootstock/shared/util';

export const webAppControl: AppControlAdapter = {
  reload: () => {
    window.location.reload();
  },
};
