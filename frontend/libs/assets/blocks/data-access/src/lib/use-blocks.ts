// frontend/libs/blocks/data-access/src/lib/use-blocks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Block, CreateBlockDto, UpdateBlockDto } from './block.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { v4 as uuid } from 'uuid';

export const BLOCKS_KEYS = {
  all: ['blocks'] as const,
  lists: () => [...BLOCKS_KEYS.all, 'list'] as const,
  list: (orchardId?: string) => [...BLOCKS_KEYS.lists(), { orchardId }] as const,
  details: () => [...BLOCKS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...BLOCKS_KEYS.details(), id] as const,
};

// --- API Functions ---
const BASE_URL = '/blocks';

export const getBlocks = async (orchardId?: string): Promise<Block[]> => {
  const queryParams = orchardId ? { orchardId } : {};
  const response = await apiClient.get<Block[]>(BASE_URL, {
    params: queryParams,
  });
  return response.data;
};

export const getBlock = async (id: string): Promise<Block> => {
  const response = await apiClient.get<Block>(`${BASE_URL}/${id}`);
  return response.data;
};

export const createBlock = async (data: CreateBlockDto): Promise<Block> => {
  const response = await apiClient.post<Block>(BASE_URL, data);
  return response.data;
};

export const updateBlock = async ({ id, data }: { id: string; data: UpdateBlockDto }): Promise<Block> => {
  const response = await apiClient.patch<Block>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteBlock = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/${id}`);
};

// --- Hooks ---

export function useGetBlocks(orchardId?: string) {
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.BLOCK_VIEW);

  return useQuery({
    queryKey: BLOCKS_KEYS.list(orchardId),
    queryFn: () => getBlocks(orchardId),
    enabled: isEnabled,
  });
}

export function useGetBlock(id: string) {
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.BLOCK_VIEW) && !!id;

  return useQuery({
    queryKey: BLOCKS_KEYS.detail(id),
    queryFn: () => getBlock(id),
    enabled: isEnabled,
  });
}

export function useCreateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBlock,
    onMutate: async (newBlock) => {
      await queryClient.cancelQueries({ queryKey: BLOCKS_KEYS.all });

      const previousBlocksAll = queryClient.getQueryData<Block[]>(BLOCKS_KEYS.list(undefined));
      const previousBlocksOrchard = queryClient.getQueryData<Block[]>(BLOCKS_KEYS.list(newBlock.orchardId));

      const tempBlock: Block = {
        ...newBlock,
        _id: uuid(),
        recordId: 'TEMP',
        clientId: 'PENDING', // Derived from Orchard on backend
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        isDeleted: false,
        __v: 0,
      } as any;

      if (previousBlocksAll) {
        queryClient.setQueryData(BLOCKS_KEYS.list(undefined), [
          tempBlock,
          ...previousBlocksAll,
        ]);
      }

      if (previousBlocksOrchard) {
        queryClient.setQueryData(BLOCKS_KEYS.list(newBlock.orchardId), [
          tempBlock,
          ...previousBlocksOrchard,
        ]);
      }

      return { previousBlocksAll, previousBlocksOrchard };
    },
    onError: (err, newBlock, context) => {
      if (context?.previousBlocksAll) {
        queryClient.setQueryData(BLOCKS_KEYS.list(undefined), context.previousBlocksAll);
      }
      if (context?.previousBlocksOrchard) {
        queryClient.setQueryData(BLOCKS_KEYS.list(newBlock.orchardId), context.previousBlocksOrchard);
      }
      notify.error(err, 'Error Creating Block');
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: BLOCKS_KEYS.all });
    },
    onSuccess: () => {
      notify.success(
        'The block has been successfully created.',
        'Block Created'
      );
    },
  });
}

export function useUpdateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBlock,
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: BLOCKS_KEYS.all });

      const previousBlock = queryClient.getQueryData<Block>(BLOCKS_KEYS.detail(id));
      // We don't easily know which lists contain this block without searching, 
      // but we can try to update the "All" list and maybe the specific orchard list if we knew it.
      // For now, we'll update the detail and the "All" list if present.
      const previousBlocksAll = queryClient.getQueryData<Block[]>(BLOCKS_KEYS.list(undefined));

      if (previousBlock) {
        queryClient.setQueryData(BLOCKS_KEYS.detail(id), {
          ...previousBlock,
          ...data,
        });
      }

      if (previousBlocksAll) {
        queryClient.setQueryData(
          BLOCKS_KEYS.list(undefined),
          previousBlocksAll.map((block) =>
            block._id === id ? { ...block, ...data } : block
          )
        );
      }

      return { previousBlock, previousBlocksAll };
    },
    onError: (err, variables, context) => {
      if (context?.previousBlock) {
        queryClient.setQueryData(BLOCKS_KEYS.detail(variables.id), context.previousBlock);
      }
      if (context?.previousBlocksAll) {
        queryClient.setQueryData(BLOCKS_KEYS.list(undefined), context.previousBlocksAll);
      }
      notify.error(err, 'Error Updating Block');
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: BLOCKS_KEYS.all });
    },
    onSuccess: () => {
      notify.success('The block details have been updated.', 'Block Updated');
    },
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOCKS_KEYS.lists() });
      notify.success('The block has been deleted.', 'Block Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting Block');
    },
  });
}
