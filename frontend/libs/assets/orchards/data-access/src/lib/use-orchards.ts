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
import { usePermission } from '@rootstock/iam/auth/auth-data-access';

export const ORCHARDS_KEYS = {
  all: ['orchards'] as const,
  lists: () => [...ORCHARDS_KEYS.all, 'list'] as const,
  list: (filters: string) => [...ORCHARDS_KEYS.lists(), { filters }] as const,
  details: () => [...ORCHARDS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ORCHARDS_KEYS.details(), id] as const,
};

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

export function useGetOrchards() {
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.ORCHARD_VIEW);

  return useQuery({
    queryKey: ORCHARDS_KEYS.lists(),
    queryFn: async () => {
      const response = await apiClient.get<Orchard[]>('/orchards');
      return response.data;
    },
    enabled: isEnabled,
    staleTime: Infinity,
  });
}

export function useGetOrchard(id: string) {
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.ORCHARD_VIEW) && !!id;

  return useQuery({
    queryKey: ORCHARDS_KEYS.detail(id),
    queryFn: () => getOrchard(id),
    enabled: isEnabled,
  });
}

export function useCreateOrchard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrchardDto) => {
      const response = await apiClient.post<Orchard>('/orchards', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORCHARDS_KEYS.lists() });
      notify.success(
        'The orchard has been successfully created.',
        'Orchard Created'
      );
    },
    onError: (error: any) => {
      notify.error(error, 'Error Creating Orchard');
    },
  });
}

export function useUpdateOrchard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOrchardDto }) => {
      const response = await apiClient.patch<Orchard>(`/orchards/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(ORCHARDS_KEYS.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: ORCHARDS_KEYS.lists() });
      queryClient.invalidateQueries({
        queryKey: ORCHARDS_KEYS.detail(variables.id),
      });
      notify.success('The orchard details have been updated.', 'Orchard Updated');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Updating Orchard');
    },
  });
}

export function useDeleteOrchard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/orchards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORCHARDS_KEYS.lists() });
      notify.success('The orchard has been removed.', 'Orchard Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting Orchard');
    },
  });
}
