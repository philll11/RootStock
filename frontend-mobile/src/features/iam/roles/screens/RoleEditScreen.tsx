import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { withObservables } from '@nozbe/watermelondb/react';
import { RoleForm } from '../components/RoleForm';
import { RoleFormData } from '@/src/types/iam/role.schema';
import { getDatabase } from '@/src/database';
import Role from '@/src/database/models/iam/Role';

const RoleEdit = ({ role }: { role: Role }) => {
    const router = useRouter();
    const [isSaving, setIsSaving] = React.useState(false);

    if (!role) {
        return null;
    }

    const handleSubmit = async (data: RoleFormData) => {
        setIsSaving(true);
        try {
            await getDatabase().write(async () => {
                await role.update((r: any) => {
                    r.name = data.name;
                    r.description = data.description;
                    r.visibilityScope = data.visibilityScope;
                    r.permissions = data.permissions || [];
                    r.isActive = data.isActive;
                });
            });
            router.back();
        } catch (error) {
            console.error('Error updating role:', error);
            setIsSaving(false);
        }
    };

    const defaultValues: RoleFormData = {
        name: role.name,
        description: role.description || '',
        visibilityScope: role.visibilityScope as any,
        permissions: role.permissions,
        isActive: role.isActive,
    };

    return (
        <View style={styles.container}>
            <RoleForm
                defaultValues={defaultValues}
                onSubmit={handleSubmit}
                isSubmitting={isSaving}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});

const enhance = withObservables(['id'], ({ id }) => ({
    role: getDatabase().collections.get<Role>('roles').findAndObserve(id),
}));

export const RoleEditScreen = enhance(RoleEdit);
