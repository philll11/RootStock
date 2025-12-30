import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetUser, useUpdateUser } from '@rootstock/iam/users/users-data-access';
import { UserForm, UserFormData } from './user-form';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

export function UserEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { data: user, isLoading, isError: error } = useGetUser(id!);
  const { mutateAsync: updateUser } = useUpdateUser();

  const handleSubmit = async (data: UserFormData) => {
    await updateUser({ 
      id: id!, 
      data: { ...data, __v: user?.__v } 
    });
    router.back();
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
          Failed to load user
        </Text>
      </View>
    );
  }

  const defaultValues: Partial<UserFormData> = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    userType: user.userType,
    roleId: typeof user.roleId === 'object' ? user.roleId?._id : user.roleId,
    clientIds: user.clientIds?.map((c: any) => (typeof c === 'object' ? c._id : c)) || [],
    isActive: user.isActive,
  };

  return (
    <UserForm
      isEditMode
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
