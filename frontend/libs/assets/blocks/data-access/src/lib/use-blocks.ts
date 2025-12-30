// frontend/libs/blocks/data-access/src/lib/use-blocks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Block, CreateBlockDto, UpdateBlockDto } from './block.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';

export const BLOCKS_KEYS = {
  all: ['blocks'] as const,
  lists: () => [...BLOCKS_KEYS.all, 'list'] as const,
  list: (orchardId?: string) => [...BLOCKS_KEYS.lists(), { orchardId }] as const,
  details: () => [...BLOCKS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...BLOCKS_KEYS.details(), id] as const,
};

export const getBlock = async (id: string): Promise<Block> => {
  const response = await apiClient.get<Block>(`/blocks/${id}`);
  return response.data;
};

export function useGetBlocks(orchardId?: string) {
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.BLOCK_VIEW);

  return useQuery({
    queryKey: BLOCKS_KEYS.list(orchardId),
    queryFn: async () => {
      const queryParams = orchardId ? { orchardId } : {};
      const response = await apiClient.get<Block[]>('/blocks', {
        params: queryParams,
      });
      return response.data;
    },
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
    mutationFn: async (data: CreateBlockDto) => {
      const response = await apiClient.post<Block>('/blocks', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOCKS_KEYS.lists() });
      notify.success(
        'The block has been successfully created.',
        'Block Created'
      );
    },
    onError: (error: any) => {
      notify.error(error, 'Error Creating Block');
    },
  });
}

export function useUpdateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
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
    onSuccess: (updatedBlock, variables) => {
      queryClient.setQueryData(BLOCKS_KEYS.detail(variables.id), updatedBlock);
      queryClient.invalidateQueries({ queryKey: BLOCKS_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: BLOCKS_KEYS.detail(variables.id) });
      notify.success('The block details have been updated.', 'Block Updated');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Updating Block');
    },
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/blocks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOCKS_KEYS.lists() });
      notify.success('The block has been deleted.', 'Block Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting Block');
    },
  });
}
