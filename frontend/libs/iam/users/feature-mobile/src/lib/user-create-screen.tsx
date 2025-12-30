import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateUser } from '@rootstock/iam/users/users-data-access';
import { UserForm } from './user-form';
import { ActivityIndicator, useTheme } from 'react-native-paper';

export function UserCreateScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { mutateAsync: createUser, isPending: isCreating } = useCreateUser();

  const handleSubmit = async (data: any) => {
    try {
      await createUser(data);
      router.back();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  if (isCreating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <UserForm
      mode="create"
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
      isSubmitting={isCreating}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
