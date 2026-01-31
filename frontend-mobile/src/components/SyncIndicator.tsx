import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { useIsFetching, useIsMutating, useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, iconSizes, radius, typography } from '@/theme';
import { AppTheme } from '@/theme/mobile-theme';

export function SyncIndicator() {
  const theme = useTheme<AppTheme>();
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);

  // Subscribe to Mutation Cache to track pending offline changes
  useEffect(() => {
    const updateCount = () => {
      // Defer update to next tick to avoid "Cannot update while rendering" warning
      // when navigating between screens that both access the QueryCache.
      setTimeout(() => {
        const allMutations = queryClient.getMutationCache().getAll();
        const count = allMutations.filter(
          (m) => m.state.status === 'pending'
        ).length;
        setPendingCount(count);
      }, 0);
    };

    updateCount();
    const unsubscribe = queryClient.getMutationCache().subscribe(updateCount);
    return () => unsubscribe();
  }, [queryClient, isOnline]); // Re-check when online status changes

  if (isOnline && isFetching === 0 && isMutating === 0 && pendingCount === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
      {!isOnline ? (
        pendingCount > 0 ? (
          // OFFLINE WITH PENDING CHANGES (Warning State)
          <>
            <MaterialCommunityIcons name="cloud-upload" size={iconSizes.md} color={theme.colors.tertiary} />
            <Text style={[styles.text, { color: theme.colors.tertiary }]}>
              Offline ({pendingCount} Pending)
            </Text>
          </>
        ) : (
          // OFFLINE - CLEAN STATE
          <>
            <MaterialCommunityIcons name="cloud-off-outline" size={iconSizes.md} color={theme.colors.error} />
            <Text style={[styles.text, { color: theme.colors.error }]}>Offline</Text>
          </>
        )
      ) : (
        // ONLINE - SYNCING
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
