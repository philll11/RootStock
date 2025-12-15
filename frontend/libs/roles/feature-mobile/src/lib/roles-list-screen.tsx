// frontend/libs/roles/feature-mobile/src/lib/roles-list-screen.tsx
import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, List, FAB, useTheme, Searchbar, Text, ActivityIndicator } from 'react-native-paper';
import { useRoles } from '@rootstock/roles/roles-data-access';
import { useDrawer, AppTheme } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

export const RolesListScreen = ({ navigation }: any) => {
  const theme = useTheme() as AppTheme;
  const { toggleDrawer } = useDrawer();
  const { roles, isLoading } = useRoles();
  const { can } = usePermission();
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.Action icon="menu" onPress={toggleDrawer} />
        <Appbar.Content title="Roles" />
      </Appbar.Header>

      <View style={styles.content}>
        <Searchbar
          placeholder="Search roles"
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
            data={filteredRoles}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  No roles found
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                description={item.description}
                left={props => <List.Icon {...props} icon="shield-account" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => navigation.navigate('RoleForm', { roleId: item._id })}
                style={styles.listItem}
              />
            )}
          />
        )}
      </View>

      {can(PERMISSIONS.ROLE_CREATE) && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={() => navigation.navigate('RoleForm')}
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