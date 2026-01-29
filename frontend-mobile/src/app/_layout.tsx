import { useEffect } from 'react';
import { Stack, useRouter, useSegments, Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AppThemeProvider } from '@/src/core/theme/ThemeProvider';
import { DrawerProvider } from '@/src/core/contexts/DrawerContext';
import AppDrawerOverlay from '@/src/shared/components/navigation/AppDrawer';
import { setupAuthInterceptor } from '@/src/core/auth/interceptor';
import { useAuthSession } from '@/src/core/auth/hooks/useAuthSession';
import { useAuthStore } from '@/src/core/auth/store';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthSession();
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    // Hydrate auth state from secure storage on mount
    hydrate();

    // Setup Axios Interceptors
    setupAuthInterceptor(() => {
      // On session expiry (401), redirect to login
      router.replace('/login' as Href);
    });
  }, [router, hydrate]);

  useEffect(() => {
    // Hide the splash screen when the root layout is mounted
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    // Basic Route Protection
    if (!isAuthLoading) {
      const inAuthGroup = segments[0] === '(root)';

      if (!isAuthenticated && inAuthGroup) {
        // Redirect to login if accessing protected route without auth
        router.replace('/login' as Href);
      } else if (isAuthenticated && (segments[0] as string) === 'login') {
        // Redirect to dashboard if already logged in and on login page
        router.replace('/(root)/dashboard' as Href);
      }
    }
  }, [isAuthenticated, segments, isAuthLoading, router]);

  return (
    <AppThemeProvider>
      <DrawerProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(root)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <AppDrawerOverlay />
      </DrawerProvider>
    </AppThemeProvider>
  );
}
