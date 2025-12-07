import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar, Alert } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen, ForgotPasswordScreen } from '@rootstock/auth/auth-feature-mobile';
import { DashboardScreen } from './screens/DashboardScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import * as SecureStore from 'expo-secure-store';
import { configureAuth, useAuth, setupAuthInterceptor } from '@rootstock/auth/auth-data-access';
import { ThemeProvider } from '@rootstock/ui/mobile';
import { ClientsListScreen, ClientFormScreen } from '@rootstock/clients/clients-feature-mobile';
import { OrchardsListScreen, OrchardFormScreen } from '@rootstock/orchards/orchards-feature-mobile';
import { UsersListScreen, UserFormScreen } from '@rootstock/users/users-feature-mobile';
import { RolesListScreen, RoleFormScreen } from '@rootstock/roles/roles-feature-mobile';
import { DrawerProvider, useDrawer } from '@rootstock/ui/mobile';
import { AppDrawer } from './components/AppDrawer';
import { ProtectedScreen } from './components/ProtectedScreen';
import { PermissionDeniedScreen } from './screens/PermissionDeniedScreen';
import { PERMISSIONS } from '@rootstock/shared/util';

const queryClient = new QueryClient();

configureAuth({
  getItem: async (key) => SecureStore.getItemAsync(key),
  setItem: async (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: async (key) => SecureStore.deleteItemAsync(key),
}, 'mobile');

// Initialize Axios interceptors
setupAuthInterceptor(() => {
  Alert.alert('Session Expired', 'Please log in again.');
});

const Stack = createNativeStackNavigator();

const ClientsListScreenWrapper = (props: any) => {
  const { toggleDrawer } = useDrawer();
  return (
    <ProtectedScreen permission={PERMISSIONS.CLIENT_VIEW}>
      <ClientsListScreen {...props} onMenuPress={toggleDrawer} />
    </ProtectedScreen>
  );
};

const OrchardsListScreenWrapper = (props: any) => {
  const { toggleDrawer } = useDrawer();
  return (
    <ProtectedScreen permission={PERMISSIONS.ORCHARD_VIEW}>
      <OrchardsListScreen {...props} onMenuPress={toggleDrawer} />
    </ProtectedScreen>
  );
};

const UsersListScreenWrapper = (props: any) => {
  const { toggleDrawer } = useDrawer();
  return (
    <ProtectedScreen permission={PERMISSIONS.USER_VIEW}>
      <UsersListScreen {...props} onMenuPress={toggleDrawer} />
    </ProtectedScreen>
  );
};

const RolesListScreenWrapper = (props: any) => {
  const { toggleDrawer } = useDrawer();
  return (
    <ProtectedScreen permission={PERMISSIONS.ROLE_VIEW}>
      <RolesListScreen {...props} onMenuPress={toggleDrawer} />
    </ProtectedScreen>
  );
};

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="UsersList" component={UsersListScreenWrapper} />
          <Stack.Screen name="UserForm" component={UserFormScreen} />
          <Stack.Screen name="RolesList" component={RolesListScreenWrapper} />
          <Stack.Screen name="RoleForm" component={RoleFormScreen} />
          <Stack.Screen name="ClientsList" component={ClientsListScreenWrapper} />
          <Stack.Screen name="ClientForm" component={ClientFormScreen} />
          <Stack.Screen name="OrchardsList" component={OrchardsListScreenWrapper} />
          <Stack.Screen name="OrchardForm" component={OrchardFormScreen} />
          <Stack.Screen name="PermissionDenied" component={PermissionDeniedScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export const navigationRef = createNavigationContainerRef();

export const App = () => {
  const [currentRoute, setCurrentRoute] = React.useState<string | undefined>();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SafeAreaProvider>
          <DrawerProvider>
            <NavigationContainer
              ref={navigationRef}
              onReady={() => {
                setCurrentRoute(navigationRef.getCurrentRoute()?.name);
              }}
              onStateChange={() => {
                setCurrentRoute(navigationRef.getCurrentRoute()?.name);
              }}
            >
              <AppNavigator />
              <AppDrawer navigationRef={navigationRef} currentRoute={currentRoute} />
            </NavigationContainer>
          </DrawerProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
