import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Variety, CreateVarietyDto, UpdateVarietyDto } from './variety.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';

export const VARIETIES_KEYS = {
  all: ['varieties'] as const,
  lists: () => [...VARIETIES_KEYS.all, 'list'] as const,
  list: (filters: string) => [...VARIETIES_KEYS.lists(), { filters }] as const,
  details: () => [...VARIETIES_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...VARIETIES_KEYS.details(), id] as const,
};

export const getVariety = async (id: string): Promise<Variety> => {
  const response = await apiClient.get<Variety>(`/varieties/${id}`);
  return response.data;
};

export function useGetVarieties() {
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.VARIETY_VIEW);

  return useQuery({
    queryKey: VARIETIES_KEYS.lists(),
    queryFn: async () => {
      const response = await apiClient.get<Variety[]>('/varieties');
      return response.data;
    },
    enabled: isEnabled,
    staleTime: Infinity,
  });
}

export function useGetVariety(id: string) {
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.VARIETY_VIEW) && !!id;

  return useQuery({
    queryKey: VARIETIES_KEYS.detail(id),
    queryFn: () => getVariety(id),
    enabled: isEnabled,
  });
}

export function useCreateVariety() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVarietyDto) => {
      const response = await apiClient.post<Variety>('/varieties', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VARIETIES_KEYS.lists() });
      notify.success(
        'The variety has been successfully created.',
        'Variety Created'
      );
    },
    onError: (error: any) => {
      notify.error(error, 'Error Creating Variety');
    },
  });
}

export function useUpdateVariety() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateVarietyDto;
    }) => {
      const response = await apiClient.patch<Variety>(`/varieties/${id}`, data);
      return response.data;
    },
    onSuccess: (updatedVariety, variables) => {
      queryClient.setQueryData(
        VARIETIES_KEYS.detail(variables.id),
        updatedVariety
      );
      queryClient.invalidateQueries({ queryKey: VARIETIES_KEYS.lists() });
      queryClient.invalidateQueries({
        queryKey: VARIETIES_KEYS.detail(variables.id),
      });
      notify.success('The variety details have been updated.', 'Variety Updated');
    },
    onError: (error: any) => {
      if (error.response?.status !== 409) {
        notify.error(error, 'Error Updating Variety');
      }
    },
  });
}

export function useDeleteVariety() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/varieties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VARIETIES_KEYS.lists() });
      notify.success('The variety has been successfully deleted.', 'Variety Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting Variety');
    },
  });
}