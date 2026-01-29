import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { List, FAB, Searchbar, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter, Href } from 'expo-router';
import { withObservables } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { getDatabase } from '@/src/database';
import Role from '@/src/database/models/iam/Role';
import { PERMISSIONS } from '@/src/constants/permissions';
import { useSyncPull } from '@/src/core/sync/hooks/useSyncPull';
// Note: Permission check needs a user context hook which we'll assume or mock for now as 'usePermission' logic wasn't fully ported yet.
// For now, I'll inline a simple check or omit it. The migration plan says: "Key Logic: can(permission) method should be implemented on the User model".
// Implementation of 'usePermission' hook will be done in 'auth' feature later. I will just render the button for now.

const RolesList = ({ roles }: { roles: Role[] }) => {
    const router = useRouter();
    const { refreshing, onRefresh } = useSyncPull();

    return (
        <View style={styles.container}>
            <FlatList
                data={roles}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <List.Item
                        title={item.name}
                        description={item.description}
                        left={(props) => <List.Icon {...props} icon="shield-account" />}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => router.push(`/iam/roles/${item.id}` as Href)}
                    />
                )}
            />
            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => router.push('/iam/roles/create' as Href)}
            />
        </View>
    );
};

const EnhancedRolesList = withObservables(['searchQuery'], ({ searchQuery }) => ({
    roles: getDatabase().collections.get<Role>('roles').query(
        Q.where('is_deleted', false),
        Q.where('name', Q.like(`%${Q.sanitizeLikeString(searchQuery)}%`))
    ),
}))(RolesList);

export const RolesListScreen = () => {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <View style={styles.container}>
            <Searchbar
                placeholder="Search roles"
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
            />
            <EnhancedRolesList searchQuery={searchQuery} />
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
