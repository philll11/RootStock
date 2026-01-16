import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetVariety, useDeleteVariety } from '@rootstock/master-data/varieties/varieties-data-access';
import { DetailRow, ResourceViewLayout } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS, notify } from '@rootstock/shared/util';
import { useNetInfo } from '@react-native-community/netinfo';

export const VarietyViewScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutate: deleteVariety, mutateAsync: deleteVarietyAsync } = useDeleteVariety();
  const { data: variety, isLoading, refetch, isRefetching } = useGetVariety(id!);
  const { can } = usePermission();
  const { isConnected } = useNetInfo();

  const handleEdit = () => {
    router.push(`/master-data/varieties/edit?id=${id}`);
  };

  const handleDelete = async () => {
    const isOnline = isConnected === true;
    try {
      if (isOnline) {
        await deleteVarietyAsync(id!);
      } else {
        deleteVariety(id!);
        notify.success('Will sync when online', 'Deletion queued');
      }
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ResourceViewLayout
      title={variety?.name || 'Variety Details'}
      isLoading={isLoading}
      error={!variety}
      entityName="Variety"
      onEdit={handleEdit}
      onDelete={handleDelete}
      canEdit={can(PERMISSIONS.VARIETY_EDIT)}
      canDelete={can(PERMISSIONS.VARIETY_DELETE)}
      onRefresh={refetch}
      isRefreshing={isRefetching}
    >
      <DetailRow label="Name" value={variety?.name} />
      <DetailRow label="Status" value={variety?.isActive ? 'Active' : 'Inactive'} />
    </ResourceViewLayout>
  );
};
