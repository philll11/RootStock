// frontend/libs/blocks/data-access/src/lib/use-blocks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Block, CreateBlockDto, UpdateBlockDto } from './block.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/auth/auth-data-access';

export const BLOCKS_QUERY_KEY = ['blocks'];

export const getBlock = async (id: string): Promise<Block> => {
  const response = await apiClient.get<Block>(`/blocks/${id}`);
  return response.data;
};

export function useBlocks(
  params?: { orchardId?: string; blockId?: string } | string,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isEnabled = (options?.enabled ?? true) && can(PERMISSIONS.BLOCK_VIEW);

  const orchardId = typeof params === 'string' ? params : params?.orchardId;
  const blockId = typeof params === 'object' ? params?.blockId : undefined;

  const queryKey = orchardId
    ? [...BLOCKS_QUERY_KEY, 'list', orchardId]
    : [...BLOCKS_QUERY_KEY, 'list', 'global'];

  const blocksQuery = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      const queryParams = orchardId ? { orchardId } : {};
      const response = await apiClient.get<Block[]>('/blocks', { params: queryParams });
      return response.data;
    },
    enabled: isEnabled,
  });

  const blockQuery = useQuery({
    queryKey: [...BLOCKS_QUERY_KEY, 'detail', blockId],
    queryFn: () => getBlock(blockId!),
    enabled: isEnabled && !!blockId,
  });

  const createBlockMutation = useMutation({
    mutationFn: async ({
      data,
      orchardId: targetOrchardId,
    }: {
      data: CreateBlockDto;
      orchardId?: string;
    }) => {
      // Priority: 1. Explicit arg, 2. Hook param, 3. Inside DTO
      const oid = targetOrchardId || orchardId || data.orchardId;
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
      if (error.response?.status !== 409) {
        notify.error(error, 'Error Updating Block');
      }
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
    block: blockQuery.data,
    isLoading: blocksQuery.isLoading || blockQuery.isLoading,
    isError: blocksQuery.isError || blockQuery.isError,
    createBlock: createBlockMutation.mutateAsync,
    updateBlock: updateBlockMutation.mutateAsync,
    deleteBlock: deleteBlockMutation.mutateAsync,
    isCreating: createBlockMutation.isPending,
    isUpdating: updateBlockMutation.isPending,
    isDeleting: deleteBlockMutation.isPending,
  };
}
