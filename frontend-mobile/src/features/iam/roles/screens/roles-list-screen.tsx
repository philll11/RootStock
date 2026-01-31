import React, { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { List, FAB, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useGetRoles } from '@/features/iam/roles/data';
import { ResourceListLayout } from '@/components';
import { AppTheme } from '@/theme';
import { usePermission } from '@/features/iam/auth/data';
import { PERMISSIONS } from '@/utils';
import { spacing } from '@/theme';

export const RolesListScreen = () => {
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const { data: roles = [], isLoading, refetch, isRefetching } = useGetRoles();
  const { can } = usePermission();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ResourceListLayout
      title="Roles"
      isLoading={isLoading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search roles"
      emptyText="No roles found"
      isEmpty={!isLoading && filteredRoles.length === 0}
      onRefresh={refetch}
      isRefreshing={isRefetching}
    >
      <FlatList
        data={filteredRoles}
        keyExtractor={(item) => item._id}
        refreshing={isRefetching}
        onRefresh={refetch}
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
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
  },
});

