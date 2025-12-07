import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Orchard, OrchardQuery, CreateOrchardDto, UpdateOrchardDto } from './orchard.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/auth/auth-data-access';

export const ORCHARDS_QUERY_KEY = ['orchards'];

// Helper for searching orchards (useful for dropdowns)
export const searchOrchards = async (query: string): Promise<Orchard[]> => {
  const params = new URLSearchParams();
  if (query) params.append('name', query);
  const response = await apiClient.get<Orchard[]>(`/orchards?${params.toString()}`);
  return response.data;
};

export const getOrchard = async (id: string): Promise<Orchard> => {
  const response = await apiClient.get<Orchard>(`/orchards/${id}`);
  return response.data;
};

export function useOrchards(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isEnabled = (options?.enabled ?? true) && can(PERMISSIONS.ORCHARD_VIEW);

  const orchardsQuery = useQuery({
    queryKey: ORCHARDS_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<Orchard[]>('/orchards');
      return response.data;
    },
    enabled: isEnabled,
  });

  const createOrchardMutation = useMutation({
    mutationFn: async (data: CreateOrchardDto) => {
      const response = await apiClient.post<Orchard>('/orchards', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORCHARDS_QUERY_KEY });
      notify.success('The orchard has been successfully created.', 'Orchard Created');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Creating Orchard');
    },
  });

  const updateOrchardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOrchardDto }) => {
      const response = await apiClient.patch<Orchard>(`/orchards/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORCHARDS_QUERY_KEY });
      notify.success('The orchard details have been updated.', 'Orchard Updated');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Updating Orchard');
    },
  });

  const deleteOrchardMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/orchards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORCHARDS_QUERY_KEY });
      notify.success('The orchard has been removed.', 'Orchard Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting Orchard');
    },
  });

  return {
    orchards: orchardsQuery.data ?? [],
    isLoading: orchardsQuery.isLoading,
    isError: orchardsQuery.isError,
    searchOrchards,
    getOrchard,
    createOrchard: createOrchardMutation.mutateAsync,
    updateOrchard: updateOrchardMutation.mutateAsync,
    deleteOrchard: deleteOrchardMutation.mutateAsync,
    isCreating: createOrchardMutation.isPending,
    isUpdating: updateOrchardMutation.isPending,
    isDeleting: deleteOrchardMutation.isPending,
  };
}
