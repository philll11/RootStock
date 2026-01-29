import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBlocks, getBlock, createBlock, updateBlock, deleteBlock } from 'api/assets/blocks';
import { Block, BlockQuery } from 'types/assets/block.types';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';

export const BLOCKS_KEYS = {
  all: ['blocks'] as const,
  lists: () => [...BLOCKS_KEYS.all, 'list'] as const,
  list: (params?: BlockQuery) => [...BLOCKS_KEYS.lists(), { params }] as const,
  details: () => [...BLOCKS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...BLOCKS_KEYS.details(), id] as const,
  mutations: {
    create: ['blocks', 'create'] as const,
    update: ['blocks', 'update'] as const,
    delete: ['blocks', 'delete'] as const
  }
};

export function useGetBlocks(params?: BlockQuery) {
  const { can } = usePermission();
  // Assuming BLOCK_VIEW covers listing. Adjust if there's a specific LIST permission.
  const isEnabled = can(PERMISSIONS.BLOCK_VIEW);

  return useQuery({
    queryKey: BLOCKS_KEYS.list(params),
    queryFn: () => getBlocks(params),
    enabled: isEnabled
  });
}

export function useGetBlock(id: string) {
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const isEnabled = can(PERMISSIONS.BLOCK_VIEW) && !!id;

  return useQuery({
    queryKey: BLOCKS_KEYS.detail(id),
    queryFn: () => getBlock(id),
    enabled: isEnabled,
    initialData: () => {
      // Optimistic cache lookup
      const queryData = queryClient.getQueryData<Block[]>(BLOCKS_KEYS.list(undefined));
      return queryData?.find((b) => b._id === id);
    }
  });
}

export function useCreateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: BLOCKS_KEYS.mutations.create,
    mutationFn: createBlock,
    onSuccess: (newBlock) => {
      // Invalidate the list so it refetches with the NEW block (and correct IDs)
      queryClient.invalidateQueries({ queryKey: BLOCKS_KEYS.lists() });
    }
  });
}

export function useUpdateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: BLOCKS_KEYS.mutations.update,
    mutationFn: updateBlock,
    onSuccess: (updatedBlock) => {
      // Update List Cache if exists
      queryClient.setQueriesData({ queryKey: BLOCKS_KEYS.lists() }, (oldData: Block[] | undefined) => {
        if (!oldData) return undefined;
        return oldData.map((b) => (b._id === updatedBlock._id ? updatedBlock : b));
      });
      // Update Detail Cache
      queryClient.setQueryData(BLOCKS_KEYS.detail(updatedBlock._id), updatedBlock);
    }
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: BLOCKS_KEYS.mutations.delete,
    mutationFn: deleteBlock,
    onSuccess: (_data, deletedId) => {
      queryClient.setQueriesData({ queryKey: BLOCKS_KEYS.lists() }, (oldData: Block[] | undefined) => {
        if (!oldData) return undefined;
        return oldData.filter((b) => b._id !== deletedId);
      });
      queryClient.removeQueries({ queryKey: BLOCKS_KEYS.detail(deletedId) });
    }
  });
}
