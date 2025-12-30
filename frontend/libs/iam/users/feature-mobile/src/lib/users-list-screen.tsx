import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, useTheme, Text, Avatar, Chip } from 'react-native-paper';
import { useUsers } from '@rootstock/iam/users/users-data-access';
import { ListLayout, AppTheme } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

export const UsersListScreen = ({ navigation }: any) => {
  const theme = useTheme() as AppTheme;
  const { users, isLoading } = useUsers();
  const { can } = usePermission();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <ListLayout
      title="Users"
      isLoading={isLoading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search users"
      emptyText="No users found"
      isEmpty={!isLoading && filteredUsers.length === 0}
      onAdd={
        can(PERMISSIONS.USER_CREATE)
          ? () => navigation.navigate('UserForm')
          : undefined
      }
    >
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
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
                        item.userType === 'employee'
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
                label={getInitials(item.name)}
                style={{ backgroundColor: theme.colors.primaryContainer }}
                color={theme.colors.onPrimaryContainer}
              />
            )}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() =>
              navigation.navigate('UserForm', { userId: item._id })
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
  itemDescription: {
    marginTop: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
});
