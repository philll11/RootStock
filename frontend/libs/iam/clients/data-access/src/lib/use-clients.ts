import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { v4 as uuidv4 } from 'uuid';
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

export const getClients = async (): Promise<Client[]> => {
  const response = await apiClient.get<Client[]>('/clients');
  return response.data;
};

export function useGetClients(options?: { enabled?: boolean }) {
  const { can } = usePermission();
  const isEnabled = (options?.enabled ?? true) && can(PERMISSIONS.CLIENT_VIEW);

  return useQuery({
    queryKey: CLIENTS_KEYS.lists(),
    queryFn: getClients,
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
    onMutate: async (newClient) => {
      await queryClient.cancelQueries({ queryKey: CLIENTS_KEYS.lists() });
      const previousClients = queryClient.getQueryData<Client[]>(CLIENTS_KEYS.lists());

      const optimisticClient: Client & { isOptimistic?: boolean } = {
        _id: uuidv4(),
        recordId: 'TEMP',
        isActive: true,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        __v: 0,
        ...newClient,
        isOptimistic: true,
      };

      queryClient.setQueryData(CLIENTS_KEYS.lists(), (old: Client[] = []) => [
        optimisticClient,
        ...old,
      ]);

      return { previousClients };
    },
    onError: (error: any, newClient, context) => {
      queryClient.setQueryData(CLIENTS_KEYS.lists(), context?.previousClients);
      notify.error(error, 'Error Creating Client');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.lists() });
    },
    onSuccess: () => {
      notify.success(
        'The client has been successfully created.',
        'Client Created'
      );
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
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: CLIENTS_KEYS.detail(id) });
      await queryClient.cancelQueries({ queryKey: CLIENTS_KEYS.lists() });

      const previousClient = queryClient.getQueryData<Client>(CLIENTS_KEYS.detail(id));
      const previousClients = queryClient.getQueryData<Client[]>(CLIENTS_KEYS.lists());

      if (previousClient) {
        queryClient.setQueryData(CLIENTS_KEYS.detail(id), {
          ...previousClient,
          ...data,
          isOptimistic: true,
        });
      }

      if (previousClients) {
        queryClient.setQueryData(CLIENTS_KEYS.lists(), (old: Client[] = []) =>
          old.map((client) =>
            client._id === id ? { ...client, ...data, isOptimistic: true } : client
          )
        );
      }

      return { previousClient, previousClients };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousClient) {
        queryClient.setQueryData(CLIENTS_KEYS.detail(variables.id), context.previousClient);
      }
      if (context?.previousClients) {
        queryClient.setQueryData(CLIENTS_KEYS.lists(), context.previousClients);
      }
      if (error.response?.status !== 409) {
        notify.error(error, 'Error Updating Client');
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.lists() });
    },
    onSuccess: () => {
      notify.success('The client details have been updated.', 'Client Updated');
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
