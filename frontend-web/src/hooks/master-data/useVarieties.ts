import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVarieties, getVariety, createVariety, updateVariety, deleteVariety } from 'api/master-data/varieties';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import { Variety } from 'types/master-data/variety.types';

export const VARIETIES_KEYS = {
  all: ['varieties'] as const,
  lists: () => [...VARIETIES_KEYS.all, 'list'] as const,
  list: (filters: string) => [...VARIETIES_KEYS.lists(), { filters }] as const,
  details: () => [...VARIETIES_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...VARIETIES_KEYS.details(), id] as const,
  mutations: {
    create: ['varieties', 'create'] as const,
    update: ['varieties', 'update'] as const,
    delete: ['varieties', 'delete'] as const
  }
};

export function useGetVarieties(options?: { enabled?: boolean }) {
  const { can } = usePermission();
  const isEnabled = (options?.enabled ?? true) && can(PERMISSIONS.VARIETY_VIEW);

  return useQuery({
    queryKey: VARIETIES_KEYS.lists(),
    queryFn: getVarieties,
    enabled: isEnabled
  });
}

export function useGetVariety(id: string) {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.VARIETY_VIEW) && !!id;

  return useQuery({
    queryKey: VARIETIES_KEYS.detail(id),
    queryFn: () => getVariety(id),
    enabled: isEnabled,
    initialData: () => {
      if (!id) return undefined;
      const allVarieties = queryClient.getQueryData<Variety[]>(VARIETIES_KEYS.lists());
      return allVarieties?.find((v) => v._id === id);
    }
  });
}

export function useCreateVariety() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: VARIETIES_KEYS.mutations.create,
    mutationFn: createVariety,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VARIETIES_KEYS.lists() });
    }
  });
}

export function useUpdateVariety() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: VARIETIES_KEYS.mutations.update,
    mutationFn: updateVariety,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: VARIETIES_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: VARIETIES_KEYS.detail(data._id) });
    }
  });
}

export function useDeleteVariety() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: VARIETIES_KEYS.mutations.delete,
    mutationFn: deleteVariety,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VARIETIES_KEYS.lists() });
    }
  });
}
