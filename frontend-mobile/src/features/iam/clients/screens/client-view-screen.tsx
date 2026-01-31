import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDeleteClient, useGetClient } from '@/features/iam/clients/data';
import { DetailRow, ResourceViewLayout } from '@/components';
import { usePermission } from '@/features/iam/auth/data';
import { PERMISSIONS, notify } from '@/utils';
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
