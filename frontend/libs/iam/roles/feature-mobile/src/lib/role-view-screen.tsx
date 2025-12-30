import React from 'react';
import { Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDeleteRole, useGetRole } from '@rootstock/iam/roles/roles-data-access';
import { DetailRow, ResourceViewLayout } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export const RoleViewScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: deleteRole } = useDeleteRole();
  const { data: role, isLoading } = useGetRole(id);
  const { can } = usePermission();

  return (
    <ResourceViewLayout
      title={role?.name || 'Role Details'}
      isLoading={isLoading}
      error={!role}
      entityName="Role"
      onEdit={() => router.push(`/iam/roles/edit?id=${id}`)}
      onDelete={async () => {
        await deleteRole(id!);
        router.back();
      }}
      canEdit={can(PERMISSIONS.ROLE_EDIT)}
      canDelete={can(PERMISSIONS.ROLE_DELETE)}
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
