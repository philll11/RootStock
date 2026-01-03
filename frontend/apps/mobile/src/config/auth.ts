import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureAuth, setupAuthInterceptor } from '@rootstock/iam/auth/auth-data-access';
import { router } from 'expo-router';

export function initAuth() {
  // Configure Auth Store to use AsyncStorage and set platform to 'mobile'
  configureAuth(AsyncStorage, 'mobile');

  // Setup Axios Interceptor to handle 401s and Token Refresh
  setupAuthInterceptor(() => {
    // On Session Expired (Refresh failed)
    // The auth store will be cleared by the interceptor, triggering the useAuthSession listener
    // But we can also force a navigation here if needed, though the listener in _layout should handle it.
    console.log('Session expired, redirecting to login...');
    router.replace('/login');
  });
}
