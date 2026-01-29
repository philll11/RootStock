import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { UserForm } from '../components/UserForm';
import { UserFormData } from '@/src/types/iam/user.schema';
import { getDatabase } from '@/src/database';
import { generateUUID } from '@/src/utils/uuid';

export const UserCreateScreen = () => {
    const router = useRouter();
    const [isCreating, setIsCreating] = React.useState(false);

    const handleSubmit = async (data: UserFormData) => {
        setIsCreating(true);
        try {
            await getDatabase().write(async () => {
                const newUser = await getDatabase().collections.get('users').create((user: any) => {
                    user.recordId = 'temp_' + generateUUID();
                    user.firstName = data.firstName;
                    user.lastName = data.lastName;
                    user.name = `${data.firstName} ${data.lastName}`;
                    user.email = data.email;
                    user.userType = data.userType;
                    user.roleId = data.roleId;
                    user.clientIds = data.clientIds || [];
                    user.isActive = data.isActive ?? true;
                    user.isDeleted = false;
                });
                router.replace(`/iam/users/${newUser.id}` as Href);
            });
        } catch (error) {
            console.error('Error creating user:', error);
            setIsCreating(false);
        }
    };

    return (
        <View style={styles.container}>
            <UserForm onSubmit={handleSubmit} isSubmitting={isCreating} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});
