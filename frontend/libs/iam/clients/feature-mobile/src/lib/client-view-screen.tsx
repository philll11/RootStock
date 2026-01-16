import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDeleteClient, useGetClient } from '@rootstock/iam/clients/clients-data-access';
import { DetailRow, ResourceViewLayout } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS, notify } from '@rootstock/shared/util';
import { useNetInfo } from '@react-native-community/netinfo';

export const ClientViewScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutate: deleteClient, mutateAsync: deleteClientAsync } = useDeleteClient();
  const { data: client, isLoading, refetch, isRefetching } = useGetClient(id);
  const { can } = usePermission();
  const { isConnected } = useNetInfo();

  const handleEdit = () => {
    router.push(`/iam/clients/edit?id=${id}`);
  };

  const handleDelete = async () => {
    if (!id) return;
    const isOnline = isConnected === true;

    try {
      if (isOnline) {
        await deleteClientAsync(id);
      } else {
        deleteClient(id);
        notify.success('Will sync when online', 'Deletion queued');
      }
      router.back();
    } catch (error) {
      console.error(error);
    }
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
      onRefresh={refetch}
      isRefreshing={isRefetching}
    >
      <DetailRow label="Name" value={client?.name} />
      <DetailRow label="Status" value={client?.isActive ? 'Active' : 'Inactive'} />
    </ResourceViewLayout>
  );
};
