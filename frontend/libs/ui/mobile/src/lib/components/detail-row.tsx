import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface DetailRowProps {
  label: string;
  value: string | number | null | undefined;
  placeholder?: string;
}

export const DetailRow = ({ label, value, placeholder = '-' }: DetailRowProps) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginTop: 4 }}>
        {value || placeholder}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
});
