import React from 'react';
import { Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDeleteRole, useGetRole } from '@/features/iam/roles/data';
import { DetailRow, ResourceViewLayout } from '@/components';
import { spacing } from '@/theme';
import { usePermission } from '@/features/iam/auth/data';
import { PERMISSIONS } from '@/utils';

export const RoleViewScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: deleteRole } = useDeleteRole();
  const { data: role, isLoading, refetch, isRefetching } = useGetRole(id);
  const { can } = usePermission();

  const handleEdit = () => {
    router.push(`/iam/roles/edit?id=${id}`);
  };

  const handleDelete = async () => {
    await deleteRole(id!);
    router.back();
  };

  return (
    <ResourceViewLayout
      title={role?.name || 'Role Details'}
      isLoading={isLoading}
      error={!role}
      entityName="Role"
      onEdit={handleEdit}
      onDelete={handleDelete}
      canEdit={can(PERMISSIONS.ROLE_EDIT)}
      canDelete={can(PERMISSIONS.ROLE_DELETE)}
      onRefresh={refetch}
      isRefreshing={isRefetching}
    >
      <DetailRow label="Name" value={role?.name} />
      <DetailRow label="Description" value={role?.description} />
      <DetailRow label="Status" value={role?.isActive ? 'Active' : 'Inactive'} />
      <DetailRow label="Visibility Scope" value={role?.visibilityScope} />
      
      <Text variant="titleMedium" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
        Permissions
      </Text>
      {role?.permissions?.map((p: string) => (
        <Text key={p} variant="bodyMedium">• {p}</Text>
      ))}
    </ResourceViewLayout>
  );
};
