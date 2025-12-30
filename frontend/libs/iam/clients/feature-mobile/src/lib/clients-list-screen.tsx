import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, useTheme, Text } from 'react-native-paper';
import { useClients } from '@rootstock/clients/clients-data-access';
import { ListLayout, AppTheme } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

export const ClientsListScreen = ({ navigation }: any) => {
  const theme = useTheme() as AppTheme;
  const { clients, isLoading } = useClients();
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
          ? () => navigation.navigate('ClientForm')
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
              navigation.navigate('ClientForm', { clientId: item._id })
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
