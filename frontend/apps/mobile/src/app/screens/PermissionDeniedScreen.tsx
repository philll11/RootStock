// frontend/apps/mobile/src/app/screens/PermissionDeniedScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '@rootstock/ui/theme';

export const PermissionDeniedScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();

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
        onPress={() => navigation.navigate('Dashboard')}
        style={styles.button}
      >
        Go to Dashboard
      </Button>
    </View>
  );
};

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