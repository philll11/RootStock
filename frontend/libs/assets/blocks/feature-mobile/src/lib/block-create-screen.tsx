import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateBlock, BlockFormData } from '@rootstock/assets/blocks/blocks-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { BlockForm } from './block-form';
import { useNetInfo } from '@react-native-community/netinfo';
import { notify } from '@rootstock/shared/util';

export function BlockCreateScreen() {
  const router = useRouter();
  const { mutate: createBlock, mutateAsync: createBlockAsync, isPending: isCreating } = useCreateBlock();
  const { isConnected } = useNetInfo();

  const handleSubmit = async (data: BlockFormData) => {
    if (!data.orchardId) return;
    const isOnline = isConnected === true;

    try {
      const payload = {
        name: data.name,
        orchardId: data.orchardId,
        plantings: data.plantings.map(p => ({
          varietyId: p.varietyId!,
          treeCount: p.treeCount
        })),
      };

      if (isOnline) {
        await createBlockAsync(payload);
      } else {
        createBlock(payload);
        notify.success('Will sync when online', 'Saved to Outbox');
      }
      router.back();
    } catch (error) {
      console.error(error);
    }
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
