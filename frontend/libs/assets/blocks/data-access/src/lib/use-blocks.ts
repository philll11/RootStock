// frontend/libs/blocks/data-access/src/lib/use-blocks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Block, CreateBlockDto, UpdateBlockDto } from './block.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';

export const BLOCKS_QUERY_KEY = ['blocks'];

export const getBlock = async (id: string): Promise<Block> => {
  const response = await apiClient.get<Block>(`/blocks/${id}`);
  return response.data;
};

export function useBlocks(orchardId?: string) {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.BLOCK_VIEW);

  const queryKey = orchardId
    ? [...BLOCKS_QUERY_KEY, 'list', orchardId]
    : [...BLOCKS_QUERY_KEY, 'list', 'global'];

  const blocksQuery = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      const queryParams = orchardId ? { orchardId } : {};
      const response = await apiClient.get<Block[]>('/blocks', {
        params: queryParams,
      });
      return response.data;
    },
    enabled: isEnabled,
  });

  const createBlockMutation = useMutation({
    mutationFn: async (data: CreateBlockDto) => {
      const response = await apiClient.post<Block>('/blocks', data);
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

  const deleteBlockMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/blocks/${id}`);
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
    deleteBlock: deleteBlockMutation.mutateAsync,
    isCreating: createBlockMutation.isPending,
    isDeleting: deleteBlockMutation.isPending,
  };
}

export function useBlock(blockId: string) {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.BLOCK_VIEW) && !!blockId;

  const blockQuery = useQuery({
    queryKey: [...BLOCKS_QUERY_KEY, 'detail', blockId],
    queryFn: () => getBlock(blockId),
    enabled: isEnabled,
  });

  const updateBlockMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateBlockDto;
    }) => {
      const response = await apiClient.patch<Block>(`/blocks/${id}`, data);
      return response.data;
    },
    onSuccess: (updatedBlock) => {
      queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY });
      notify.success('The block details have been updated.', 'Block Updated');
    },
    onError: (error: any) => {
      if (error.response?.status !== 409) {
        notify.error(error, 'Error Updating Block');
      }
    },
  });

  return {
    block: blockQuery.data,
    isLoading: blockQuery.isLoading,
    isError: blockQuery.isError,
    updateBlock: updateBlockMutation.mutateAsync,
    isUpdating: updateBlockMutation.isPending,
  };
}
