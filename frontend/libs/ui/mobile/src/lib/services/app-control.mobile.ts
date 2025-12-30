import { AppControlAdapter } from '@rootstock/shared/util';
import * as Updates from 'expo-updates';

export const mobileAppControl: AppControlAdapter = {
  reload: async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.error('Failed to reload app:', error);
    }
  },
};
