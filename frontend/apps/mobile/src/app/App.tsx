import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@rootstock/auth/mobile-feature-login';
import { DashboardScreen } from './screens/DashboardScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import * as SecureStore from 'expo-secure-store';
import { configureAuth, useAuth, setupAuthInterceptor } from '@rootstock/auth/data-access';
import { ThemeProvider } from '@rootstock/ui/mobile';
import { ClientsListScreen, ClientFormScreen } from '@rootstock/clients/mobile-feature-clients';
import { UsersListScreen, UserFormScreen } from '@rootstock/users/mobile-feature-users';
import { DrawerProvider, useDrawer } from '@rootstock/ui/mobile';
import { AppDrawer } from './components/AppDrawer';

const queryClient = new QueryClient();

configureAuth({
  getItem: async (key) => SecureStore.getItemAsync(key),
  setItem: async (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: async (key) => SecureStore.deleteItemAsync(key),
}, 'mobile');

// Initialize Axios interceptors
setupAuthInterceptor();

const Stack = createNativeStackNavigator();

const ClientsListScreenWrapper = (props: any) => {
  const { toggleDrawer } = useDrawer();
  return <ClientsListScreen {...props} onMenuPress={toggleDrawer} />;
};

const UsersListScreenWrapper = (props: any) => {
  const { toggleDrawer } = useDrawer();
  return <UsersListScreen {...props} onMenuPress={toggleDrawer} />;
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
          <Stack.Screen name="ClientsList" component={ClientsListScreenWrapper} />
          <Stack.Screen name="ClientForm" component={ClientFormScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
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
