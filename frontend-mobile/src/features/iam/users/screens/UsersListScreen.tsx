import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, FAB, Searchbar, Avatar } from 'react-native-paper';
import { useRouter, Href } from 'expo-router';
import { withObservables } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../../database';
import User from '../../../../database/models/iam/User';

const UsersList = ({ users }: { users: User[] }) => {
    const router = useRouter();

    const getInitials = (firstName: string, lastName: string) => {
        return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={users}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <List.Item
                        title={item.name}
                        description={item.email}
                        left={(props) => (
                            <Avatar.Text
                                size={40}
                                label={getInitials(item.firstName, item.lastName)}
                                style={{ marginRight: 16 }}
                            />
                        )}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => router.push(`/iam/users/${item.id}` as Href)}
                    />
                )}
            />
            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => router.push('/iam/users/create' as Href)}
            />
        </View>
    );
};

const EnhancedUsersList = withObservables(['searchQuery'], ({ searchQuery }) => ({
    users: database.collections.get<User>('users').query(
        Q.where('is_deleted', false),
        Q.where('name', Q.like(`%${Q.sanitizeLikeString(searchQuery)}%`))
    ),
}))(UsersList);

export const UsersListScreen = () => {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <View style={styles.container}>
            <Searchbar
                placeholder="Search users"
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
            />
            <EnhancedUsersList searchQuery={searchQuery} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    searchbar: {
        margin: 16,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
});
