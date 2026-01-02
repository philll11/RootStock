import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDeleteClient, useGetClient } from '@rootstock/iam/clients/clients-data-access';
import { DetailRow, ResourceViewLayout } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export const ClientViewScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: deleteClient } = useDeleteClient();
  const { data: client, isLoading } = useGetClient(id);
  const { can } = usePermission();

  const handleEdit = () => {
    router.push(`/iam/clients/edit?id=${id}`);
  };

  const handleDelete = async () => {
    await deleteClient(id!);
    router.back();
  };

  return (
    <ResourceViewLayout
      title={client?.name || 'Client Details'}
      isLoading={isLoading}
      error={!client}
      entityName="Client"
      onEdit={handleEdit}
      onDelete={handleDelete}
      canEdit={can(PERMISSIONS.CLIENT_EDIT)}
      canDelete={can(PERMISSIONS.CLIENT_DELETE)}
    >
      <DetailRow label="Name" value={client?.name} />
      <DetailRow label="Status" value={client?.isActive ? 'Active' : 'Inactive'} />
    </ResourceViewLayout>
  );
};
