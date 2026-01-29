import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UpdateOrchardDto, OrchardQuery, Orchard } from 'types/assets/orchard.types';
import { getOrchards, getOrchard, createOrchard, updateOrchard, deleteOrchard } from 'api/assets/orchards';
import { useSnackbar } from 'contexts/SnackbarContext';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';

export const ORCHARDS_KEYS = {
  all: ['orchards'] as const,
  lists: () => [...ORCHARDS_KEYS.all, 'list'] as const,
  list: (params?: OrchardQuery) => [...ORCHARDS_KEYS.lists(), { params }] as const,
  details: () => [...ORCHARDS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ORCHARDS_KEYS.details(), id] as const,
  mutations: {
    create: ['orchards', 'create'] as const,
    update: ['orchards', 'update'] as const,
    delete: ['orchards', 'delete'] as const
  }
};

export const useGetOrchards = (params?: OrchardQuery) => {
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.ORCHARD_VIEW);

  return useQuery({
    queryKey: ORCHARDS_KEYS.list(params),
    queryFn: () => getOrchards(params),
    enabled: isEnabled
  });
};

export const useGetOrchard = (id: string) => {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.ORCHARD_VIEW);

  return useQuery({
    queryKey: ORCHARDS_KEYS.detail(id),
    queryFn: () => getOrchard(id),
    enabled: !!id && isEnabled,
    initialData: () => {
      if (!id) return undefined;
      const allOrchards = queryClient.getQueryData<Orchard[]>(ORCHARDS_KEYS.list());
      if (Array.isArray(allOrchards)) {
        return allOrchards.find((o) => o._id === id);
      }
      return undefined;
    }
  });
};

export const useCreateOrchard = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useSnackbar();

  return useMutation({
    mutationKey: ORCHARDS_KEYS.mutations.create,
    mutationFn: createOrchard,
    onSuccess: () => {
      showMessage('Orchard created successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ORCHARDS_KEYS.lists() });
    },
    onError: (error: any) => {
      showMessage(error.message || 'Failed to create orchard', 'error');
    }
  });
};

export const useUpdateOrchard = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useSnackbar();

  return useMutation({
    mutationKey: ORCHARDS_KEYS.mutations.update,
    mutationFn: updateOrchard,
    onSuccess: (data) => {
      showMessage('Orchard updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ORCHARDS_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ORCHARDS_KEYS.detail(data._id) });
    },
    onError: (error: any) => {
      showMessage(error.message || 'Failed to update orchard', 'error');
    }
  });
};

export const useDeleteOrchard = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useSnackbar();

  return useMutation({
    mutationKey: ORCHARDS_KEYS.mutations.delete,
    mutationFn: deleteOrchard,
    onSuccess: () => {
      showMessage('Orchard deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ORCHARDS_KEYS.lists() });
    },
    onError: (error: any) => {
      showMessage(error.message || 'Failed to delete orchard', 'error');
    }
  });
};
