import React, { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { List } from 'react-native-paper';
import { useRoles } from '@rootstock/roles/roles-data-access';
import { ListLayout } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

export const RolesListScreen = ({ navigation }: any) => {
  const { roles, isLoading } = useRoles();
  const { can } = usePermission();
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredRoles = roles.filter(role => 
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
      onAdd={can(PERMISSIONS.ROLE_CREATE) ? () => navigation.navigate('RoleForm') : undefined}
    >
      <FlatList
        data={filteredRoles}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
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
