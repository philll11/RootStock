import 'react-native-get-random-values';
import { notify } from '@/utils/notifications';
import { appControl } from '@/utils/app-control';
import { mobileNotificationAdapter } from '@/services/notifications.mobile';
import { mobileAppControl } from '@/services/app-control.mobile';
import { configureAuth, setupAuthInterceptor } from '@/features/iam/auth/data';
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
