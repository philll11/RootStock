import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Block, CreateBlockDto, UpdateBlockDto } from './block.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/auth/auth-data-access';

export const BLOCKS_QUERY_KEY = ['blocks'];

export function useBlocks(orchardId?: string, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isEnabled = (options?.enabled ?? true) && !!orchardId && can(PERMISSIONS.BLOCK_VIEW);
  const queryKey = [...BLOCKS_QUERY_KEY, orchardId];

  const blocksQuery = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (!orchardId) return [];
      const response = await apiClient.get<Block[]>(`/orchards/${orchardId}/blocks`);
      return response.data;
    },
    enabled: isEnabled,
  });

  const createBlockMutation = useMutation({
    mutationFn: async (data: CreateBlockDto) => {
      if (!orchardId) throw new Error('Orchard ID is required');
      const response = await apiClient.post<Block>(`/orchards/${orchardId}/blocks`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey });
      notify.success('The block has been successfully created.', 'Block Created');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Creating Block');
    },
  });

  const updateBlockMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBlockDto }) => {
      if (!orchardId) throw new Error('Orchard ID is required');
      const response = await apiClient.patch<Block>(`/orchards/${orchardId}/blocks/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey });
      notify.success('The block details have been updated.', 'Block Updated');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Updating Block');
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!orchardId) throw new Error('Orchard ID is required');
      const response = await apiClient.delete<Block>(`/orchards/${orchardId}/blocks/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey });
      notify.success('The block has been deleted.', 'Block Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting Block');
    },
  });

  return {
    blocksQuery,
    createBlockMutation,
    updateBlockMutation,
    deleteBlockMutation,
  };
}
