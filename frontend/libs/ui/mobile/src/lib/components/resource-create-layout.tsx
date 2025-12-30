import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Stack } from 'expo-router';

interface ResourceCreateLayoutProps {
  title?: string;
  children: React.ReactNode;
}

export function ResourceCreateLayout({
  title,
  children,
}: ResourceCreateLayoutProps) {
  const theme = useTheme();

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
