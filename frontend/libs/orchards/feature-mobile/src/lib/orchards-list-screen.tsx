// frontend/libs/orchards/feature-mobile/src/lib/orchards-list-screen.tsx
import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, List, FAB, useTheme, Searchbar, Text, ActivityIndicator } from 'react-native-paper';
import { useOrchards, Orchard } from '@rootstock/orchards/orchards-data-access';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { AppTheme } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';

export function OrchardsListScreen({ navigation, onMenuPress }: any) {
  const theme = useTheme() as AppTheme;
  const { orchards, isLoading } = useOrchards();
  const { can } = usePermission();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrchards = orchards.filter(orchard => {
    const clientName = typeof orchard.clientId === 'object' ? orchard.clientId.name : '';
    return orchard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handlePress = (orchard: Orchard) => {
    navigation.navigate('OrchardForm', { orchardId: orchard._id });
  };

  const handleCreate = () => {
    navigation.navigate('OrchardForm');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        {onMenuPress ? (
          <Appbar.Action icon="menu" onPress={onMenuPress} />
        ) : (
          <Appbar.BackAction onPress={() => navigation.goBack()} />
        )}
        <Appbar.Content title="Orchards" />
      </Appbar.Header>

      <View style={styles.content}>
        <Searchbar
          placeholder="Search orchards"
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
            data={filteredOrchards}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  No orchards found
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                description={typeof item.clientId === 'object' ? item.clientId.name : 'Unknown Client'}
                left={props => <List.Icon {...props} icon="tree" />}
                right={props => (
                  <View style={styles.statusContainer}>
                     {!item.isActive && <Text style={{ color: theme.colors.error, marginRight: spacing.sm }}>Inactive</Text>}
                     <List.Icon {...props} icon="chevron-right" />
                  </View>
                )}
                onPress={() => handlePress(item)}
                style={styles.listItem}
              />
            )}
          />
        )}
      </View>

      {can(PERMISSIONS.ORCHARD_CREATE) && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={handleCreate}
        />
      )}
    </View>
  );
}

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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});