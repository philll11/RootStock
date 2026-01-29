import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClients, getClient, createClient, updateClient, deleteClient } from 'api/iam/clients';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import { Client } from 'types/iam/client.types';

export const CLIENTS_KEYS = {
  all: ['clients'] as const,
  lists: () => [...CLIENTS_KEYS.all, 'list'] as const,
  list: (filters: string) => [...CLIENTS_KEYS.lists(), { filters }] as const,
  details: () => [...CLIENTS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...CLIENTS_KEYS.details(), id] as const,
  mutations: {
    create: ['clients', 'create'] as const,
    update: ['clients', 'update'] as const,
    delete: ['clients', 'delete'] as const
  }
};

export function useGetClients(options?: { enabled?: boolean }) {
  const { can } = usePermission();
  const isEnabled = (options?.enabled ?? true) && can(PERMISSIONS.CLIENT_VIEW);

  return useQuery({
    queryKey: CLIENTS_KEYS.lists(),
    queryFn: getClients,
    enabled: isEnabled
  });
}

export function useGetClient(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: CLIENTS_KEYS.detail(id),
    queryFn: () => getClient(id),
    enabled: !!id,
    initialData: () => {
      if (!id) return undefined;
      const allClients = queryClient.getQueryData<Client[]>(CLIENTS_KEYS.lists());
      return allClients?.find((c) => c._id === id);
    }
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: CLIENTS_KEYS.mutations.create,
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.lists() });
    }
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: CLIENTS_KEYS.mutations.update,
    mutationFn: updateClient,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.detail(data._id) });
    }
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: CLIENTS_KEYS.mutations.delete,
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.lists() });
    }
  });
}
