import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import {
  Client,
  ClientQuery,
  CreateClientDto,
  UpdateClientDto,
} from './client.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/auth/auth-data-access';

export const CLIENTS_QUERY_KEY = ['clients'];

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

export function useClients(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isEnabled = (options?.enabled ?? true) && can(PERMISSIONS.CLIENT_VIEW);

  const clientsQuery = useQuery({
    queryKey: CLIENTS_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<Client[]>('/clients');
      return response.data;
    },
    enabled: isEnabled,
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: CreateClientDto) => {
      const response = await apiClient.post<Client>('/clients', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      notify.success(
        'The client has been successfully created.',
        'Client Created'
      );
    },
    onError: (error: any) => {
      notify.error(error, 'Error Creating Client');
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateClientDto }) => {
      const response = await apiClient.patch<Client>(`/clients/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      notify.success('The client details have been updated.', 'Client Updated');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Updating Client');
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      notify.success('The client has been removed.', 'Client Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting Client');
    },
  });

  return {
    clients: clientsQuery.data ?? [],
    isLoading: clientsQuery.isLoading,
    isError: clientsQuery.isError,
    searchClients,
    getClient,
    createClient: createClientMutation.mutateAsync,
    updateClient: updateClientMutation.mutateAsync,
    deleteClient: deleteClientMutation.mutateAsync,
    isCreating: createClientMutation.isPending,
    isUpdating: updateClientMutation.isPending,
    isDeleting: deleteClientMutation.isPending,
  };
}
