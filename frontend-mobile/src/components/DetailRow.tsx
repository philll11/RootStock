import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { spacing } from '@/theme';
import { AppTheme } from '@/theme/mobile-theme';

interface DetailRowProps {
  label: string;
  value?: string | number | null;
  children?: React.ReactNode;
}

export const DetailRow = ({ label, value, children }: DetailRowProps) => {
  const theme = useTheme<AppTheme>();

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" style={{ color: theme.colors.secondary }}>
        {label}
      </Text>
      {children ? (
        children
      ) : (
        <Text variant="bodyLarge" style={styles.value}>
          {value || '-'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  value: {
    marginTop: spacing.xs / 2,
  },
});
