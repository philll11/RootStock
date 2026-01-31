import { AppControlAdapter } from '@/utils';
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
