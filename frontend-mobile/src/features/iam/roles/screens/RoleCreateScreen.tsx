import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { RoleForm } from '../components/RoleForm';
import { RoleFormData } from '@/src/types/iam/role.schema';
import { getDatabase } from '@/src/database';
import { generateUUID } from '@/src/utils/uuid';

export const RoleCreateScreen = () => {
    const router = useRouter();
    const [isCreating, setIsCreating] = React.useState(false);

    const handleSubmit = async (data: RoleFormData) => {
        setIsCreating(true);
        try {
            await getDatabase().write(async () => {
                const newRole = await getDatabase().collections.get('roles').create((role: any) => {
                    role.recordId = 'temp_' + generateUUID();
                    role.name = data.name;
                    role.description = data.description;
                    role.visibilityScope = data.visibilityScope;
                    role.permissions = data.permissions || [];
                    role.isActive = data.isActive ?? true;
                    role.isDeleted = false;
                });
                router.replace(`/iam/roles/${newRole.id}` as Href); // WatermelonDB ID
            });
        } catch (error) {
            console.error('Error creating role:', error);
            setIsCreating(false);
        }
    };

    return (
        <View style={styles.container}>
            <RoleForm onSubmit={handleSubmit} isSubmitting={isCreating} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});
