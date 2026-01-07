import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetBlock, useUpdateBlock, BlockFormData } from '@rootstock/assets/blocks/blocks-data-access';
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

  const handleSubmit = async (data: BlockFormData) => {
    if (!block) return;
    await updateBlock({
      id: id!,
      data: {
        name: data.name,
        isActive: data.isActive,
        plantings: data.plantings.map(p => ({
          _id: (p as any)._id,
          varietyId: p.varietyId!,
          treeCount: p.treeCount
        })),
        __v: block.__v
      }
    });
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
