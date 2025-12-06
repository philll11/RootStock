import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, List, FAB, useTheme, Searchbar, Text, ActivityIndicator, Chip } from 'react-native-paper';
import { useClients } from '@rootstock/clients/clients-data-access';
import { AppTheme } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export const ClientsListScreen = ({ navigation, onMenuPress }: any) => {
  const theme = useTheme() as AppTheme;
  const { clients, isLoading, searchClients } = useClients();
  const { can } = usePermission();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter clients based on search query locally for now, or use the searchClients from hook if it supports it
  // The current useClients hook returns all clients, but also exports a searchClients function.
  // For simplicity in this list view, we'll filter the 'clients' array.
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        {onMenuPress ? (
          <Appbar.Action icon="menu" onPress={onMenuPress} />
        ) : (
          <Appbar.BackAction onPress={() => navigation.goBack()} />
        )}
        <Appbar.Content title="Clients" />
      </Appbar.Header>

      <View style={styles.content}>
        <Searchbar
          placeholder="Search clients"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator animating={true} size="large" />
          </View>
        ) : (
          <FlatList
            data={filteredClients}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  No clients found
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                left={props => <List.Icon {...props} icon="domain" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => navigation.navigate('ClientForm', { clientId: item._id })}
                style={styles.listItem}
              />
            )}
          />
        )}
      </View>

      {can(PERMISSIONS.CLIENT_CREATE) && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={() => navigation.navigate('ClientForm')}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  searchBar: {
    margin: 16,
  },
  listContent: {
    paddingBottom: 80, // Space for FAB
  },
  listItem: {
    paddingHorizontal: 8,
  },
  chipContainer: {
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
