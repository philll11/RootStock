import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetBlock, useUpdateBlock, BlockFormData } from '@/features/assets/blocks/data';
import { ResourceEditLayout } from '@/components';
import { BlockForm } from './block-form';
import { useNetInfo } from '@react-native-community/netinfo';
import { notify } from '@/utils';

export function BlockEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: block, isLoading, isError } = useGetBlock(id!);
  const { mutate: updateBlock, mutateAsync: updateBlockAsync, isPending: isUpdating } = useUpdateBlock();
  const { isConnected } = useNetInfo();

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
    const isOnline = isConnected === true;
    
    try {
      const payload = {
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
      };

      if (isOnline) {
        await updateBlockAsync(payload);
      } else {
        updateBlock(payload);
        notify.success('Will sync when online', 'Changes queued');
      }
      router.back();
    } catch (error) {
      console.error(error);
    }
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
