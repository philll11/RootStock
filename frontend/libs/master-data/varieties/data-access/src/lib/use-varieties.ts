import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Variety, CreateVarietyDto, UpdateVarietyDto } from './variety.types';
import { notify } from '@rootstock/shared/util';

export const VARIETIES_QUERY_KEY = ['varieties'];

export function useVarieties(varietyId?: string) {
  const queryClient = useQueryClient();

  const varietiesQuery = useQuery({
    queryKey: VARIETIES_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<Variety[]>('/varieties');
      return response.data;
    },
    staleTime: Infinity,
  });

  const varietyQuery = useQuery({
    queryKey: [...VARIETIES_QUERY_KEY, varietyId],
    queryFn: async () => {
      const response = await apiClient.get<Variety>(`/varieties/${varietyId}`);
      return response.data;
    },
    enabled: !!varietyId,
  });

  const createVarietyMutation = useMutation({
    mutationFn: async (data: CreateVarietyDto) => {
      const response = await apiClient.post<Variety>('/varieties', data);
      return response.data;
    },
    onSuccess: (newVariety) => {
      queryClient.setQueryData<Variety[]>(VARIETIES_QUERY_KEY, (old) =>
        old ? [...old, newVariety] : [newVariety]
      );
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
      queryClient.setQueryData<Variety[]>(VARIETIES_QUERY_KEY, (old) =>
        old
          ? old.map((v) => (v._id === updatedVariety._id ? updatedVariety : v))
          : [updatedVariety]
      );
      queryClient.setQueryData(
        [...VARIETIES_QUERY_KEY, updatedVariety._id],
        updatedVariety
      );
      queryClient.invalidateQueries({
        queryKey: [...VARIETIES_QUERY_KEY, updatedVariety._id],
      });
      notify.success('The variety details have been updated.', 'Variety Updated');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Updating Variety');
    },
  });

  const deleteVarietyMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const response = await apiClient.delete<Variety>(`/varieties/${id}`);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.setQueryData<Variety[]>(VARIETIES_QUERY_KEY, (old) =>
        old ? old.filter((v) => v._id !== id) : []
      );
      notify.success('The variety has been successfully deleted.', 'Variety Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting Variety');
    },
  });

  return {
    varieties: varietiesQuery.data ?? [],
    variety: varietyQuery.data,
    isLoading: varietiesQuery.isLoading || varietyQuery.isLoading,
    isError: varietiesQuery.isError || varietyQuery.isError,
    createVariety: createVarietyMutation.mutateAsync,
    updateVariety: updateVarietyMutation.mutateAsync,
    deleteVariety: deleteVarietyMutation.mutateAsync,
    isCreating: createVarietyMutation.isPending,
    isUpdating: updateVarietyMutation.isPending,
    isDeleting: deleteVarietyMutation.isPending,
  };
}