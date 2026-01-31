import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDeleteUser, useGetUser } from '@/features/iam/users/data';
import { DetailRow, ResourceViewLayout } from '@/components';
import { AppTheme } from '@/theme';
import { spacing } from '@/theme';
import { usePermission } from '@/features/iam/auth/data';
import { PERMISSIONS } from '@/utils';

export function UserViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: deleteUser } = useDeleteUser();
  const { data: user, isLoading, refetch, isRefetching } = useGetUser(id!);
  const { can } = usePermission();
  const theme = useTheme<AppTheme>();

  const handleEdit = () => {
    router.push(`/iam/users/edit?id=${id}`);
  };

  const handleDelete = async () => {
    await deleteUser(id!);
    router.back();
  };

  const roleName = typeof user?.roleId === 'object' ? user.roleId?.name : 'Unknown Role';
  const clientNames = user?.clientIds?.map((c: any) => (typeof c === 'object' ? c.name : 'Unknown Client')) || [];

  return (
    <ResourceViewLayout
      title={user ? `${user.firstName} ${user.lastName}` : 'User Details'}
      isLoading={isLoading}
      error={!user}
      entityName="User"
      onEdit={handleEdit}
      onDelete={handleDelete}
      canEdit={can(PERMISSIONS.USER_EDIT)}
      canDelete={can(PERMISSIONS.USER_DELETE)}      onRefresh={refetch}
      isRefreshing={isRefetching}    >
      <DetailRow label="First Name" value={user?.firstName} />
      <DetailRow label="Last Name" value={user?.lastName} />
      <DetailRow label="Email" value={user?.email} />
      <DetailRow label="User Type" value={user?.userType} />
      <DetailRow label="Status" value={user?.isActive ? 'Active' : 'Inactive'} />
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
    </ResourceViewLayout>
  );
}

const styles = StyleSheet.create({
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

