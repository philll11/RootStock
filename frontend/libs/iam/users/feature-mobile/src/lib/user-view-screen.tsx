import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetUser } from '@rootstock/iam/users/users-data-access';
import { UserForm } from './user-form';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

export function UserViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { data: user, isLoading, isError: error } = useGetUser(id!);

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
      mode="view"
      defaultValues={{
        ...user,
        roleId: typeof user.roleId === 'object' ? user.roleId._id : user.roleId,
      }}
      onSubmit={async () => {}}
      onCancel={() => router.back()}
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
