import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetBlock, useUpdateBlock } from '@rootstock/assets/blocks/blocks-data-access';
import { ResourceEditLayout } from '@rootstock/ui/mobile';
import { BlockForm } from './block-form';

export function BlockEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: block, isLoading, isError } = useGetBlock(id!);
  const { mutateAsync: updateBlock, isPending: isUpdating } = useUpdateBlock();

  const defaultValues = block ? {
    name: block.name,
    orchardId:
      typeof block.orchardId === 'string'
        ? block.orchardId
        : block.orchardId._id,
    plantings:
      block.plantings?.map((p) => ({
        varietyId:
          typeof p.varietyId === 'string' ? p.varietyId : p.varietyId._id,
        treeCount: p.treeCount,
      })) || [],
    isActive: block.isActive,
  } : undefined;

  const handleSubmit = async (data: any) => {
    await updateBlock({ id: id!, data });
    router.back();
  };

  return (
    <ResourceEditLayout
      isLoading={isLoading}
      error={isError || !block}
      title="Edit Block"
    >
      {block && (
        <BlockForm
          mode="edit"
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isSubmitting={isUpdating}
        />
      )}
    </ResourceEditLayout>
  );
}
