// frontend/libs/assets/orchards/feature-mobile/src/lib/orchards-list-screen.tsx
import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, useTheme, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useGetOrchards, Orchard } from '@/features/assets/orchards/data';
import { usePermission } from '@/features/iam/auth/data';
import { PERMISSIONS, notify } from '@/utils';
import {
  ResourceListLayout,
  OfflineItemWrapper,
  OfflineStatusIcon,
  useEntitySyncStatus,
  getOfflineStatusText,
} from '@/components';
import { useNetworkStatus } from '@/hooks';
import { AppTheme } from '@/theme';
import { spacing } from '@/theme';

const OrchardListItem = React.memo(({ item, router, theme, handlePress }: { item: any; router: any; theme: AppTheme; handlePress: (item: any) => void }) => {
  const syncStatus = useEntitySyncStatus(item);
  const isOptimistic = syncStatus !== 'synced';
  const clientName = typeof item.clientId === 'object' ? item.clientId.name : 'Unknown Client';

  return (
    <OfflineItemWrapper status={syncStatus}>
      <List.Item
        title={item.name}
        titleStyle={isOptimistic ? { fontStyle: 'italic' } : undefined}
        description={
          isOptimistic
            ? getOfflineStatusText(syncStatus)
            : clientName
        }
        left={(props) => (
          <List.Icon
            {...props}
            icon="tree"
          />
        )}
        right={(props) => (
          <View style={styles.statusContainer}>
            <OfflineStatusIcon status={syncStatus} />
            {!item.isActive && !isOptimistic && (
              <Text
                style={{
                  color: theme.colors.error,
                  marginRight: spacing.sm,
                }}
              >
                Inactive
              </Text>
            )}
            <List.Icon {...props} icon="chevron-right" />
          </View>
        )}
        onPress={() => handlePress(item)}
        style={styles.listItem}
      />
    </OfflineItemWrapper>
  );
});

export function OrchardsListScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { data: orchards = [], isLoading, refetch, isRefetching } = useGetOrchards();
  const { can } = usePermission();
  const { isOnline } = useNetworkStatus();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrchards = orchards.filter((orchard) => {
    const clientName =
      typeof orchard.clientId === 'object' ? orchard.clientId.name : '';
    return (
      orchard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handlePress = (orchard: Orchard) => {
    router.push(`/assets/orchards/${orchard._id}`);
  };

  const handleRefresh = async () => {
    if (!isOnline) {
      notify.info('You are offline. Cannot refresh list.', 'Offline');
      return;
    }
    await refetch();
  };

  return (
    <ResourceListLayout
      title="Orchards"
      isLoading={isLoading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search orchards"
      emptyText="No orchards found"
      isEmpty={!isLoading && filteredOrchards.length === 0}
      onAdd={
        can(PERMISSIONS.ORCHARD_CREATE)
          ? () => router.push('/assets/orchards/create')
          : undefined
      }
      onRefresh={handleRefresh}
      isRefreshing={isRefetching}
    >
      <FlatList
        data={filteredOrchards}
        keyExtractor={(item) => item._id}
        refreshing={isRefetching}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <OrchardListItem item={item} router={router} theme={theme} handlePress={handlePress} />}
      />
    </ResourceListLayout>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 80,
  },
  listItem: {
    paddingHorizontal: spacing.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
