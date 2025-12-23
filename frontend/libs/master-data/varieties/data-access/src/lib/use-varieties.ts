import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Variety, CreateVarietyDto, UpdateVarietyDto } from './variety.types';
import { notify } from '@rootstock/shared/util';

export const VARIETIES_QUERY_KEY = ['varieties'];

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
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VARIETIES_QUERY_KEY });
      notify.success('The variety details have been updated.', 'Variety Updated');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Updating Variety');
    },
  });

  const deleteVarietyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete<Variety>(`/varieties/${id}`);
      return response.data;
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
    varietiesQuery,
    createVarietyMutation,
    updateVarietyMutation,
    deleteVarietyMutation,
  };
}
