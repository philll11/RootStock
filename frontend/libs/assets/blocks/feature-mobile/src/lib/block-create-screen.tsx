import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateBlock, BlockFormData } from '@rootstock/assets/blocks/blocks-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { BlockForm } from './block-form';

export function BlockCreateScreen() {
  const router = useRouter();
  const { mutateAsync: createBlock, isPending: isCreating } = useCreateBlock();

  const handleSubmit = async (data: BlockFormData) => {
    await createBlock({
      name: data.name,
      orchardId: data.orchardId!,
      plantings: data.plantings.map(p => ({
        varietyId: p.varietyId!,
        treeCount: p.treeCount
      })),
    });
    router.back();
  };

  return (
    <ResourceCreateLayout title="Create Block">
      <BlockForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSubmitting={isCreating}
      />
    </ResourceCreateLayout>
  );
}
