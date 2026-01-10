import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useNetworkStatus } from '../hooks/use-network-status';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, iconSizes, radius, typography } from '@rootstock/ui/theme';
import { AppTheme } from '../mobile-theme';

export function SyncIndicator() {
  const theme = useTheme<AppTheme>();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const { isOnline } = useNetworkStatus();

  if (isOnline && isFetching === 0 && isMutating === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
      {!isOnline ? (
        <>
          <MaterialCommunityIcons name="cloud-off-outline" size={iconSizes.md} color={theme.colors.error} />
          <Text style={[styles.text, { color: theme.colors.error }]}>Offline</Text>
        </>
      ) : (
        <>
          <ActivityIndicator size={iconSizes.sm} color={theme.colors.primary} />
          <Text style={[styles.text, { color: theme.colors.primary }]}>Syncing...</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    marginRight: spacing.sm,
  },
  text: {
    fontSize: typography.sizes.xs,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
});
