import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetVariety, useDeleteVariety } from '@rootstock/master-data/varieties/varieties-data-access';
import { DetailRow, ResourceViewLayout } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export const VarietyViewScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: deleteVariety } = useDeleteVariety();
  const { data: variety, isLoading } = useGetVariety(id!);
  const { can } = usePermission();

  const handleEdit = () => {
    router.push(`/master-data/varieties/edit?id=${id}`);
  };

  const handleDelete = async () => {
    await deleteVariety(id!);
    router.back();
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
    >
      <DetailRow label="Name" value={variety?.name} />
      <DetailRow label="Status" value={variety?.isActive ? 'Active' : 'Inactive'} />
    </ResourceViewLayout>
  );
};
