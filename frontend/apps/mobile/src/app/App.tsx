import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'react-native';
import { LoginScreen } from './screens/LoginScreen';

const queryClient = new QueryClient();

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          <LoginScreen />
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
};

export default App;
