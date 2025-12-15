// frontend/libs/master-data/varieties/feature-mobile/src/lib/varieties-list-screen.tsx
import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, List, FAB, useTheme, Searchbar, ActivityIndicator, Text } from 'react-native-paper';
import { useVarieties } from '@rootstock/master-data/varieties/varieties-data-access';
import { useDrawer, AppTheme } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

export const VarietiesListScreen = ({ navigation }: any) => {
  const theme = useTheme() as AppTheme;
  const { toggleDrawer } = useDrawer();
  const { varietiesQuery } = useVarieties();
  const { data: varieties, isLoading } = varietiesQuery;
  const { can } = usePermission();
  const canCreate = can(PERMISSIONS.VARIETY_CREATE);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredVarieties = varieties?.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.Action icon="menu" onPress={toggleDrawer} />
        <Appbar.Content title="Varieties" />
      </Appbar.Header>

      <View style={styles.content}>
        <Searchbar
          placeholder="Search varieties"
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
            data={filteredVarieties}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  No varieties found
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                description={item.recordId}
                left={props => <List.Icon {...props} icon="sprout" />} // Use consistent icon
                right={props => (
                  <View style={styles.statusContainer}>
                    {!item.isActive && <Text style={{ color: theme.colors.error, marginRight: spacing.sm }}>Inactive</Text>}
                    <List.Icon {...props} icon="chevron-right" />
                  </View>
                )}
                onPress={() => navigation.navigate('VarietyForm', { varietyId: item._id })}
                style={styles.listItem}
              />
            )}
          />
        )}
      </View>

      {canCreate && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={() => navigation.navigate('VarietyForm')}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  searchBar: { margin: spacing.md },
  listContent: { paddingBottom: 80 },
  listItem: { paddingHorizontal: spacing.sm },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: spacing.xl, alignItems: 'center' },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  fab: { position: 'absolute', margin: spacing.md, right: 0, bottom: 0 },
});