import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import {
  Client,
  CreateClientDto,
  UpdateClientDto,
} from './client.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';

export const CLIENTS_KEYS = {
  all: ['clients'] as const,
  lists: () => [...CLIENTS_KEYS.all, 'list'] as const,
  list: (filters: string) => [...CLIENTS_KEYS.lists(), { filters }] as const,
  details: () => [...CLIENTS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...CLIENTS_KEYS.details(), id] as const,
};

// Helper for searching clients (useful for dropdowns)
export const searchClients = async (query: string): Promise<Client[]> => {
  const params = new URLSearchParams();
  if (query) params.append('name', query);
  const response = await apiClient.get<Client[]>(
    `/clients?${params.toString()}`
  );
  return response.data;
};

export const getClient = async (id: string): Promise<Client> => {
  const response = await apiClient.get<Client>(`/clients/${id}`);
  return response.data;
};

export function useGetClients(options?: { enabled?: boolean }) {
  const { can } = usePermission();
  const isEnabled = (options?.enabled ?? true) && can(PERMISSIONS.CLIENT_VIEW);

  return useQuery({
    queryKey: CLIENTS_KEYS.lists(),
    queryFn: async () => {
      const response = await apiClient.get<Client[]>('/clients');
      return response.data;
    },
    enabled: isEnabled,
  });
}

export function useGetClient(id: string | undefined) {
  return useQuery({
    queryKey: CLIENTS_KEYS.detail(id!),
    queryFn: () => getClient(id!),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateClientDto) => {
      const response = await apiClient.post<Client>('/clients', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.lists() });
      notify.success(
        'The client has been successfully created.',
        'Client Created'
      );
    },
    onError: (error: any) => {
      notify.error(error, 'Error Creating Client');
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateClientDto }) => {
      const response = await apiClient.patch<Client>(`/clients/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(CLIENTS_KEYS.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.detail(variables.id) });
      notify.success('The client details have been updated.', 'Client Updated');
    },
    onError: (error: any) => {
      if (error.response?.status !== 409) {
        notify.error(error, 'Error Updating Client');
      }
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.lists() });
      notify.success('The client has been removed.', 'Client Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting Client');
    },
  });
}
