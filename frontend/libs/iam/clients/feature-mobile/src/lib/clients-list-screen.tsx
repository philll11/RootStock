import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { List, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useGetClients } from '@rootstock/iam/clients/clients-data-access';
import { ListLayout, AppTheme } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

export const ClientsListScreen = () => {
  const router = useRouter();
  const theme = useTheme() as AppTheme;
  const { data: clients = [], isLoading } = useGetClients();
  const { can } = usePermission();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ListLayout
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
    >
      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            left={(props) => <List.Icon {...props} icon="domain" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() =>
              router.push(`/iam/clients/${item._id}`)
            }
            style={styles.listItem}
          />
        )}
      />
    </ListLayout>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 80,
  },
  listItem: {
    paddingHorizontal: spacing.sm,
  },
});
