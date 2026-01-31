import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { List, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useGetClients } from '@/features/iam/clients/data';
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

const ClientListItem = React.memo(({ item, router, theme }: { item: any; router: any; theme: AppTheme }) => {
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
            : item.code || 'Active'
        }
        left={(props) => (
          <List.Icon 
            {...props} 
            icon="domain" 
          />
        )}
        right={(props) => (
          <View style={styles.statusContainer}>
             <OfflineStatusIcon status={syncStatus} />
             <List.Icon {...props} icon="chevron-right" />
          </View>
        )}
        onPress={() =>
          router.push(`/iam/clients/${item._id}`)
        }
        style={styles.listItem}
      />
    </OfflineItemWrapper>
  );
});

export const ClientsListScreen = () => {
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const { data: clients = [], isLoading, refetch, isRefetching } = useGetClients();
  const { can } = usePermission();
  const { isOnline } = useNetworkStatus();
  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = async () => {
    if (!isOnline) {
      notify.info('You are offline. Cannot refresh list.', 'Offline');
      return;
    }
    await refetch();
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ResourceListLayout
      title="Clients"
      isLoading={isLoading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search clients"
      emptyText="No clients found"
      isEmpty={!isLoading && filteredClients.length === 0}
      onAdd={
        can(PERMISSIONS.CLIENT_CREATE)
          ? () => router.push('/iam/clients/create')
          : undefined
      }
      onRefresh={handleRefresh}
      isRefreshing={isRefetching}
    >
      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item._id}
        refreshing={isRefetching}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <ClientListItem item={item} router={router} theme={theme} />}
      />
    </ResourceListLayout>
  );
};

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
