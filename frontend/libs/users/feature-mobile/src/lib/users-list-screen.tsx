import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, List, FAB, useTheme, Searchbar, Text, ActivityIndicator, Avatar } from 'react-native-paper';
import { useUsers } from '@rootstock/users/users-data-access';
import { useDrawer } from '@rootstock/ui/mobile';

export const UsersListScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const { toggleDrawer } = useDrawer();
  const { users, isLoading } = useUsers();
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredUsers = users.filter(user => 
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.Action icon="menu" onPress={toggleDrawer} />
        <Appbar.Content title="Users" />
      </Appbar.Header>

      <View style={styles.content}>
        <Searchbar
          placeholder="Search users"
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
            data={filteredUsers}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  No users found
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                description={item.email}
                left={props => (
                  <Avatar.Text 
                    {...props} 
                    size={40} 
                    label={getInitials(item.name)} 
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                    color={theme.colors.onPrimaryContainer}
                  />
                )}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => navigation.navigate('UserForm', { userId: item._id })}
                style={styles.listItem}
              />
            )}
          />
        )}
      </View>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate('UserForm')}
      />
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
    paddingBottom: 80,
  },
  listItem: {
    paddingHorizontal: 8,
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
