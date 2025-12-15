// frontend/libs/clients/feature-mobile/src/lib/clients-list-screen.tsx
import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, List, FAB, useTheme, Searchbar, Text, ActivityIndicator } from 'react-native-paper';
import { useClients } from '@rootstock/clients/clients-data-access';
import { AppTheme } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

export const ClientsListScreen = ({ navigation, onMenuPress }: any) => {
  const theme = useTheme() as AppTheme;
  const { clients, isLoading } = useClients();
  const { can } = usePermission();
  const [searchQuery, setSearchQuery] = useState('');
  
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
    margin: spacing.md,
  },
  listContent: {
    paddingBottom: 80,
  },
  listItem: {
    paddingHorizontal: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
  },
});