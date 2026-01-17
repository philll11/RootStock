import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, useTheme, Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetBlocks } from '@rootstock/assets/blocks/blocks-data-access';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { 
  ResourceListLayout, 
  AppTheme, 
  OfflineItemWrapper, 
  OfflineStatusIcon, 
  useEntitySyncStatus, 
  getOfflineStatusText, 
  useNetworkStatus 
} from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';
import { notify } from '@rootstock/shared/util';

const BlockListItem = React.memo(({ item, router, theme }: { item: any; router: any; theme: AppTheme }) => {
  const syncStatus = useEntitySyncStatus(item);
  const isOptimistic = syncStatus !== 'synced';

  return (
    <OfflineItemWrapper status={syncStatus}>
      <List.Item
        title={item.name}
        titleStyle={isOptimistic ? { fontStyle: 'italic' } : undefined}
        description={
          isOptimistic
            ? getOfflineStatusText(syncStatus)
            : `${item.recordId} • ${item.plantings.length} plantings`
        }
        left={(props) => (
          <List.Icon
            {...props}
            icon="grid"
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
        onPress={() => router.push(`/assets/blocks/${item._id}`)}
        style={styles.listItem}
      />
    </OfflineItemWrapper>
  );
});

export const BlocksListScreen = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { orchardId } = useLocalSearchParams<{ orchardId: string }>();
  const { data: blocks, isLoading, refetch, isRefetching } = useGetBlocks(orchardId);
  const { can } = usePermission();
  const { isOnline } = useNetworkStatus();
  const canCreate = can(PERMISSIONS.BLOCK_CREATE);

  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = async () => {
    if (!isOnline) {
      notify.info('You are offline. Cannot refresh list.', 'Offline');
      return;
    }
    await refetch();
  };

  const filteredBlocks =
    blocks?.filter((b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <ResourceListLayout
      title="Blocks"
      isLoading={isLoading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search blocks"
      emptyText="No blocks found"
      isEmpty={!isLoading && filteredBlocks.length === 0}
      onAdd={
        canCreate
          ? () =>
            router.push(
              orchardId
                ? `/assets/blocks/create?orchardId=${orchardId}`
                : '/assets/blocks/create'
            )
          : undefined
      }
      onBack={orchardId ? () => router.back() : undefined}
      onRefresh={handleRefresh}
      isRefreshing={isRefetching}
    >
      <FlatList
        data={filteredBlocks}
        keyExtractor={(item) => item._id}
        refreshing={isRefetching}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <BlockListItem item={item} router={router} theme={theme} />}
      />
    </ResourceListLayout>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingBottom: 80 },
  listItem: { paddingHorizontal: spacing.sm },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
});
