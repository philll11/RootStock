import React from 'react';
import { View, ScrollView, Alert, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator, useTheme, Chip } from 'react-native-paper';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useDeleteUser, useGetUser } from '@rootstock/iam/users/users-data-access';
import { DetailRow } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function UserViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: deleteUser } = useDeleteUser();
  const { data: user, isLoading } = useGetUser(id!);
  const { can } = usePermission();
  const theme = useTheme();

  const handleDelete = () => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteUser(id!);
            router.back();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text>User not found</Text>
      </View>
    );
  }

  const roleName = typeof user.roleId === 'object' ? user.roleId?.name : 'Unknown Role';
  const clientNames = user.clientIds?.map((c: any) => (typeof c === 'object' ? c.name : 'Unknown Client')) || [];

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            can(PERMISSIONS.USER_EDIT) ? (
              <Button onPress={() => router.push(`/iam/users/edit?id=${id}`)}>Edit</Button>
            ) : null
          ),
          title: `${user.firstName} ${user.lastName}`
        }}
      />
      <ScrollView 
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
      >
        <DetailRow label="First Name" value={user.firstName} />
        <DetailRow label="Last Name" value={user.lastName} />
        <DetailRow label="Email" value={user.email} />
        <DetailRow label="User Type" value={user.userType} />
        <DetailRow label="Status" value={user.isActive ? 'Active' : 'Inactive'} />
        <DetailRow label="Role" value={roleName} />
        
        <Text variant="titleMedium" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
          Assigned Clients
        </Text>
        <View style={styles.chipContainer}>
          {clientNames.map((name: string, index: number) => (
            <Chip key={index} style={styles.chip}>{name}</Chip>
          ))}
          {clientNames.length === 0 && <Text variant="bodyMedium">No clients assigned</Text>}
        </View>

        {can(PERMISSIONS.USER_DELETE) && (
          <Button 
            mode="outlined" 
            textColor={theme.colors.error} 
            style={{ marginTop: spacing.xl, borderColor: theme.colors.error }}
            onPress={handleDelete}
          >
            Delete User
          </Button>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
});
