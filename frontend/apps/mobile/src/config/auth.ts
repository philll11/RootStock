import { configureAuth, setupAuthInterceptor } from '@rootstock/iam/auth/auth-data-access';
import { router } from 'expo-router';
import { SecureStorageAdapter } from './secure-storage';

export function initAuth() {
  // Configure Auth Store to use SecureStorageAdapter and set platform to 'mobile'
  configureAuth(SecureStorageAdapter, 'mobile');

  // Setup Axios Interceptor to handle 401s and Token Refresh
  setupAuthInterceptor(() => {
    // On Session Expired (Refresh failed)
    // The auth store will be cleared by the interceptor, triggering the useAuthSession listener
    // But we can also force a navigation here if needed, though the listener in _layout should handle it.
    router.replace('/login');
  });
}
