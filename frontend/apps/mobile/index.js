import { notify, appControl } from '@rootstock/shared/util';
import { mobileNotificationAdapter, mobileAppControl } from '@rootstock/ui/mobile';
import { configureAuth, setupAuthInterceptor } from '@rootstock/auth/auth-data-access';
import * as SecureStore from 'expo-secure-store';
import 'expo-router/entry';

notify.setAdapter(mobileNotificationAdapter);
appControl.setAdapter(mobileAppControl);

const secureStorageAdapter = {
  getItem: async (key) => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key, value) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key) => {
    await SecureStore.deleteItemAsync(key);
  },
};

configureAuth(secureStorageAdapter, 'mobile');
setupAuthInterceptor();
