import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { spacing } from '@rootstock/ui/theme';
import { AppTheme } from '@rootstock/ui/mobile';

export default function PermissionDeniedScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.error }]}>
        Permission Denied
      </Text>
      <Text variant="bodyLarge" style={styles.message}>
        You do not have permission to access this screen.
      </Text>
      <Button 
        mode="contained" 
        onPress={() => router.replace('/')}
        style={styles.button}
      >
        Go to Dashboard
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    marginBottom: spacing.md,
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    opacity: 0.7,
  },
  button: {
    marginTop: spacing.md,
  },
});
