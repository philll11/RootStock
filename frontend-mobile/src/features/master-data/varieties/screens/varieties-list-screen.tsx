import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, useTheme, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useGetVarieties } from '@/features/master-data/varieties/data';
import { 
  ResourceListLayout, 
  AppTheme, 
  OfflineItemWrapper, 
  OfflineStatusIcon, 
  useEntitySyncStatus, 
  getOfflineStatusText, 
  useNetworkStatus 
} from '@/components';
import { usePermission } from '@/features/iam/auth/data';
import { PERMISSIONS, notify } from '@/utils';
import { spacing } from '@/theme';

const VarietyListItem = React.memo(({ item, router, theme }: { item: any; router: any; theme: AppTheme }) => {
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
            : item.recordId
        }
        left={(props) => (
          <List.Icon
            {...props}
            icon="sprout"
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
        onPress={() => router.push(`/master-data/varieties/${item._id}`)}
        style={styles.listItem}
      />
    </OfflineItemWrapper>
  );
});

export const VarietiesListScreen = () => {
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const { data: varieties, isLoading, refetch, isRefetching } = useGetVarieties();
  const { can } = usePermission();
  const { isOnline } = useNetworkStatus();
  const canCreate = can(PERMISSIONS.VARIETY_CREATE);

  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = async () => {
    if (!isOnline) {
      notify.info('You are offline. Cannot refresh list.', 'Offline');
      return;
    }
    await refetch();
  };

  const filteredVarieties = varieties?.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <ResourceListLayout
      title="Varieties"
      isLoading={isLoading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search varieties"
      emptyText="No varieties found"
      isEmpty={!isLoading && filteredVarieties.length === 0}
      onAdd={canCreate ? () => router.push('/master-data/varieties/create') : undefined}
      onRefresh={handleRefresh}
      isRefreshing={isRefetching}
    >
      <FlatList
        data={filteredVarieties}
        keyExtractor={(item) => item._id}
        refreshing={isRefetching}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <VarietyListItem item={item} router={router} theme={theme} />}
      />
    </ResourceListLayout>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingBottom: 80 },
  listItem: { paddingHorizontal: spacing.sm },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
});
