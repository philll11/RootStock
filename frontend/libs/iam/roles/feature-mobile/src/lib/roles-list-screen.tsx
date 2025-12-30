import React, { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { List, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useRoles } from '@rootstock/roles/roles-data-access';
import { ListLayout } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

export const RolesListScreen = () => {
  const router = useRouter();
  const { roles, isLoading } = useRoles();
  const { can } = usePermission();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ListLayout
      title="Roles"
      isLoading={isLoading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search roles"
      emptyText="No roles found"
      isEmpty={!isLoading && filteredRoles.length === 0}
    >
      <FlatList
        data={filteredRoles}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={item.description}
            left={(props) => <List.Icon {...props} icon="shield-account" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push(`/iam/roles/${item._id}`)}
            style={styles.listItem}
          />
        )}
      />
      {can(PERMISSIONS.ROLE_CREATE) && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => router.push('/iam/roles/create')}
        />
      )}
    </ListLayout>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 80,
  },
  listItem: {
    backgroundColor: 'white',
    marginBottom: 1,
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
  },
});
