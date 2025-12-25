// frontend/libs/blocks/data-access/src/lib/use-blocks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Block, CreateBlockDto, UpdateBlockDto } from './block.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/auth/auth-data-access';

export const BLOCKS_QUERY_KEY = ['blocks'];

export function useBlocks(orchardId?: string, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isEnabled = (options?.enabled ?? true) && can(PERMISSIONS.BLOCK_VIEW);
  const queryKey = orchardId
    ? [...BLOCKS_QUERY_KEY, orchardId]
    : [...BLOCKS_QUERY_KEY, 'global'];

  const blocksQuery = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      const params = orchardId ? { orchardId } : {};
      const response = await apiClient.get<Block[]>('/blocks', { params });
      return response.data;
    },
    enabled: isEnabled,
  });

  const createBlockMutation = useMutation({
    mutationFn: async ({
      data,
      orchardId: targetOrchardId,
    }: {
      data: CreateBlockDto;
      orchardId?: string;
    }) => {
      const oid = targetOrchardId || orchardId;
      if (!oid) throw new Error('Orchard ID is required');
      // Merge orchardId into the body
      const payload = { ...data, orchardId: oid };
      const response = await apiClient.post<Block>('/blocks', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY });
      notify.success(
        'The block has been successfully created.',
        'Block Created'
      );
    },
    onError: (error: any) => {
      notify.error(error, 'Error Creating Block');
    },
  });

  const updateBlockMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateBlockDto;
      orchardId?: string;
    }) => {
      const response = await apiClient.patch<Block>(`/blocks/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY });
      notify.success('The block details have been updated.', 'Block Updated');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Updating Block');
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async ({ id }: { id: string; orchardId?: string }) => {
      const response = await apiClient.delete<Block>(`/blocks/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY });
      notify.success('The block has been deleted.', 'Block Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting Block');
    },
  });

  return {
    blocks: blocksQuery.data ?? [],
    isLoading: blocksQuery.isLoading,
    isError: blocksQuery.isError,
    createBlock: createBlockMutation.mutateAsync,
    updateBlock: updateBlockMutation.mutateAsync,
    deleteBlock: deleteBlockMutation.mutateAsync,
    isCreating: createBlockMutation.isPending,
    isUpdating: updateBlockMutation.isPending,
    isDeleting: deleteBlockMutation.isPending,
  };
}
