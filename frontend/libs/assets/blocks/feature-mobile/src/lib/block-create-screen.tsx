import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateBlock } from '@rootstock/assets/blocks/blocks-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { BlockForm } from './block-form';

export function BlockCreateScreen() {
  const router = useRouter();
  const { mutateAsync: createBlock, isPending: isCreating } = useCreateBlock();

  const handleSubmit = async (data: any) => {
    const { isActive, ...createData } = data;
    await createBlock(createData);
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
