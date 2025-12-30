// frontend/libs/orchards/data-access/src/lib/use-orchards.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import {
  Orchard,
  OrchardQuery,
  CreateOrchardDto,
  UpdateOrchardDto,
} from './orchard.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/auth/auth-data-access';

export const ORCHARDS_QUERY_KEY = ['orchards'];

// Helper for searching orchards (useful for dropdowns)
export const searchOrchards = async (query: string): Promise<Orchard[]> => {
  const params = new URLSearchParams();
  if (query) params.append('name', query);
  const response = await apiClient.get<Orchard[]>(
    `/orchards?${params.toString()}`
  );
  return response.data;
};

export const getOrchard = async (id: string): Promise<Orchard> => {
  const response = await apiClient.get<Orchard>(`/orchards/${id}`);
  return response.data;
};

export function useOrchards() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.ORCHARD_VIEW);

  const orchardsQuery = useQuery({
    queryKey: ORCHARDS_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<Orchard[]>('/orchards');
      return response.data;
    },
    enabled: isEnabled,
    staleTime: Infinity,
  });

  const createOrchardMutation = useMutation({
    mutationFn: async (data: CreateOrchardDto) => {
      const response = await apiClient.post<Orchard>('/orchards', data);
      return response.data;
    },
    onSuccess: (newOrchard) => {
      queryClient.setQueryData<Orchard[]>(ORCHARDS_QUERY_KEY, (old) =>
        old ? [...old, newOrchard] : [newOrchard]
      );
      notify.success(
        'The orchard has been successfully created.',
        'Orchard Created'
      );
    },
    onError: (error: any) => {
      notify.error(error, 'Error Creating Orchard');
    },
  });

  const deleteOrchardMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/orchards/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData<Orchard[]>(ORCHARDS_QUERY_KEY, (old) =>
        old ? old.filter((item) => item._id !== id) : []
      );
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
    createOrchard: createOrchardMutation.mutateAsync,
    deleteOrchard: deleteOrchardMutation.mutateAsync,
    isCreating: createOrchardMutation.isPending,
    isDeleting: deleteOrchardMutation.isPending,
  };
}

export function useOrchard(orchardId: string) {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.ORCHARD_VIEW) && !!orchardId;

  const orchardQuery = useQuery({
    queryKey: [...ORCHARDS_QUERY_KEY, orchardId],
    queryFn: async () => {
      const response = await apiClient.get<Orchard>(`/orchards/${orchardId}`);
      return response.data;
    },
    enabled: isEnabled,
  });

  const updateOrchardMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateOrchardDto;
    }) => {
      const response = await apiClient.patch<Orchard>(`/orchards/${id}`, data);
      return response.data;
    },
    onSuccess: (updatedOrchard) => {
      queryClient.setQueryData<Orchard[]>(ORCHARDS_QUERY_KEY, (old) =>
        old
          ? old.map((item) =>
              item._id === updatedOrchard._id ? updatedOrchard : item
            )
          : []
      );
      queryClient.setQueryData(
        [...ORCHARDS_QUERY_KEY, updatedOrchard._id],
        updatedOrchard
      );
      queryClient.invalidateQueries({
        queryKey: [...ORCHARDS_QUERY_KEY, updatedOrchard._id],
      });
      notify.success(
        'The orchard details have been updated.',
        'Orchard Updated'
      );
    },
    onError: (error: any) => {
      if (error.response?.status !== 409) {
        notify.error(error, 'Error Updating Orchard');
      }
    },
  });

  return {
    orchard: orchardQuery.data,
    isLoading: orchardQuery.isLoading,
    isError: orchardQuery.isError,
    updateOrchard: updateOrchardMutation.mutateAsync,
    isUpdating: updateOrchardMutation.isPending,
  };
}
