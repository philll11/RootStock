import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Stack } from 'expo-router';
import { LoadingScreen } from './loading-screen';
import { ErrorScreen } from './error-screen';
import { AppTheme } from '../mobile-theme';

interface ResourceEditLayoutProps {
  title?: string;
  isLoading: boolean;
  error?: any;
  children: React.ReactNode;
}

export function ResourceEditLayout({
  title,
  isLoading,
  error,
  children,
}: ResourceEditLayoutProps) {
  const theme = useTheme<AppTheme>();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message="Error loading resource" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {title && (
        <Stack.Screen options={{ title }} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
