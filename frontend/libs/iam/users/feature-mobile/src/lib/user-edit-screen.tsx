import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetUser, useUpdateUser } from '@rootstock/iam/users/users-data-access';
import { UserForm } from './user-form';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

export function UserEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { data: user, isLoading, isError: error } = useGetUser(id!);
  const { mutateAsync: updateUser, isPending: isUpdating } = useUpdateUser();

  const handleSubmit = async (data: any) => {
    try {
      await updateUser({ id: id!, data });
      router.back();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
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

  return (
    <UserForm
      mode="edit"
      defaultValues={user}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
      isSubmitting={isUpdating}
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
