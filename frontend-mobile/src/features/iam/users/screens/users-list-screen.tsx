import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, useTheme, Text, Avatar, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useGetUsers, UserType } from '@/features/iam/users/data';
import { ResourceListLayout } from '@/components';
import { AppTheme } from '@/theme';
import { usePermission } from '@/features/iam/auth/data';
import { PERMISSIONS } from '@/utils';
import { spacing } from '@/theme';

export const UsersListScreen = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { data: users = [], isLoading, refetch, isRefetching } = useGetUsers();
  const { can } = usePermission();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(
    (user) =>
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <ResourceListLayout
      title="Users"
      isLoading={isLoading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search users"
      emptyText="No users found"
      isEmpty={!isLoading && filteredUsers.length === 0}
      onAdd={
        can(PERMISSIONS.USER_CREATE)
          ? () => router.push('/iam/users/create')
          : undefined
      }
      onRefresh={refetch}
      isRefreshing={isRefetching}
    >
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item._id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <List.Item
            title={`${item.firstName} ${item.lastName}`}
            description={() => (
              <View style={styles.itemDescription}>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginBottom: 4,
                  }}
                >
                  {item.email}
                </Text>
                <View style={styles.chipContainer}>
                  <Chip
                    compact
                    textStyle={{
                      fontSize: 10,
                      marginVertical: 0,
                      marginHorizontal: 2,
                    }}
                    style={{
                      backgroundColor:
                        item.userType === UserType.Employee
                          ? theme.colors.primaryContainer
                          : theme.colors.surfaceVariant,
                      height: 24,
                      marginRight: spacing.sm,
                    }}
                  >
                    {item.userType}
                  </Chip>
                </View>
              </View>
            )}
            left={(props) => (
              <Avatar.Text
                {...props}
                size={40}
                label={getInitials(item.firstName, item.lastName)}
                style={{ backgroundColor: theme.colors.primaryContainer }}
                color={theme.colors.onPrimaryContainer}
              />
            )}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push(`/iam/users/${item._id}`)}
            style={styles.listItem}
          />
        )}
      />
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
  itemDescription: {
    marginTop: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
});

