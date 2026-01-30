import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { withObservables } from '@nozbe/watermelondb/react';
import { UserForm } from '../components/UserForm';
import { UserFormData } from '@/src/types/iam/user.schema';
import { UserType } from '@/src/types/iam/user.types';
import { database } from '@/src/database';
import User from '@/src/database/models/iam/User';

const UserEdit = ({ user }: { user: User }) => {
    const router = useRouter();
    const [isSaving, setIsSaving] = React.useState(false);

    if (!user) {
        return null;
    }

    const handleSubmit = async (data: UserFormData) => {
        setIsSaving(true);
        try {
            await database.write(async () => {
                await user.update((u: any) => {
                    u.firstName = data.firstName;
                    u.lastName = data.lastName;
                    u.name = `${data.firstName} ${data.lastName}`;
                    u.email = data.email;
                    u.userType = data.userType;
                    u.roleId = data.roleId;
                    u.clientIds = data.clientIds || [];
                    u.isActive = data.isActive;
                });
            });
            router.back();
        } catch (error) {
            console.error('Error updating user:', error);
            setIsSaving(false);
        }
    };

    const defaultValues: Partial<UserFormData> & { userType: UserType } = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType as UserType, // Cast string to Enum
        roleId: user.roleId,
        clientIds: user.clientIds,
        isActive: user.isActive,
    };

    return (
        <View style={styles.container}>
            <UserForm
                defaultValues={defaultValues}
                onSubmit={handleSubmit}
                isSubmitting={isSaving}
                isEditMode={true}
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
    user: database.collections.get<User>('users').findAndObserve(id),
}));

export const UserEditScreen = enhance(UserEdit);
