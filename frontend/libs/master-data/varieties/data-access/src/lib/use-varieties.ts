import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Variety, CreateVarietyDto, UpdateVarietyDto } from './variety.types';
import { notify } from '@rootstock/shared/util';

export const VARIETIES_QUERY_KEY = ['varieties'];

export function useVariety(id: string | undefined) {
  return useQuery({
    queryKey: [...VARIETIES_QUERY_KEY, id],
    queryFn: async () => {
      const response = await apiClient.get<Variety>(`/varieties/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useVarieties() {
  const queryClient = useQueryClient();

  const varietiesQuery = useQuery({
    queryKey: VARIETIES_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<Variety[]>('/varieties');
      return response.data;
    },
    staleTime: Infinity,
  });

  const createVarietyMutation = useMutation({
    mutationFn: async (data: CreateVarietyDto) => {
      const response = await apiClient.post<Variety>('/varieties', data);
      return response.data;
    },
    onSuccess: (newVariety) => {
      queryClient.invalidateQueries({ queryKey: VARIETIES_QUERY_KEY });
      notify.success('The variety has been successfully created.', 'Variety Created');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Creating Variety');
    },
  });

  const updateVarietyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateVarietyDto }) => {
      const response = await apiClient.patch<Variety>(`/varieties/${id}`, data);
      return response.data;
    },
    onSuccess: (updatedVariety) => {
      queryClient.invalidateQueries({ queryKey: VARIETIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...VARIETIES_QUERY_KEY, updatedVariety._id] });
      notify.success('The variety details have been updated.', 'Variety Updated');
    },
    onError: (error: any) => {
      if (error.response?.status !== 409) {
        notify.error(error, 'Error Updating Variety');
      }
    },
  });

  const deleteVarietyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete<Variety>(`/varieties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VARIETIES_QUERY_KEY });
      notify.success('The variety has been successfully deleted.', 'Variety Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting Variety');
    },
  });

  return {
    varieties: varietiesQuery.data ?? [],
    isLoading: varietiesQuery.isLoading,
    isError: varietiesQuery.isError,
    createVariety: createVarietyMutation.mutateAsync,
    updateVariety: updateVarietyMutation.mutateAsync,
    deleteVariety: deleteVarietyMutation.mutateAsync,
    isCreating: createVarietyMutation.isPending,
    isUpdating: updateVarietyMutation.isPending,
    isDeleting: deleteVarietyMutation.isPending,
  };
}