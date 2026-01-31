import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api';
import { v4 as uuidv4 } from 'uuid';
import {
  Client,
  CreateClientDto,
  UpdateClientDto,
} from './client.types';
import { notify, PERMISSIONS } from '@/utils';
import { usePermission } from '@/features/iam/auth/data';
import { patchDependencyId } from '@/features/system/sync/data';

export const CLIENTS_KEYS = {
  all: ['clients'] as const,
  lists: () => [...CLIENTS_KEYS.all, 'list'] as const,
  list: (filters: string) => [...CLIENTS_KEYS.lists(), { filters }] as const,
  details: () => [...CLIENTS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...CLIENTS_KEYS.details(), id] as const,
  mutations: {
    create: ['clients', 'create'] as const,
    update: ['clients', 'update'] as const,
    delete: ['clients', 'delete'] as const,
  },
};

// --- API Functions ---
const BASE_URL = '/clients';

export const getClients = async (): Promise<Client[]> => {
  const response = await apiClient.get<Client[]>(BASE_URL);
  return response.data;
};

export const getClient = async (id: string): Promise<Client> => {
  const response = await apiClient.get<Client>(`${BASE_URL}/${id}`);
  return response.data;
};

// Helper for searching clients (useful for dropdowns)
export const searchClients = async (query: string): Promise<Client[]> => {
  const params = new URLSearchParams();
  if (query) params.append('name', query);
  const response = await apiClient.get<Client[]>(
    `${BASE_URL}?${params.toString()}`
  );
  return response.data;
};


export const createClient = async (data: CreateClientDto): Promise<Client> => {
  // Strip _id (used for frontend scoping) before sending to backend
  const { _id, ...payload } = data;
  const response = await apiClient.post<Client>(BASE_URL, payload);
  return response.data;
};

export const updateClient = async ({ id, data }: { id: string; data: UpdateClientDto }): Promise<Client> => {
  const response = await apiClient.patch<Client>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteClient = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/${id}`);
};

// --- Hooks ---

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
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: CLIENTS_KEYS.detail(id!),
    queryFn: () => getClient(id!),
    enabled: !!id,
    initialData: () => {
      if (!id) return undefined;
      const allClients = queryClient.getQueryData<Client[]>(CLIENTS_KEYS.lists());
      return allClients?.find((c) => c._id === id);
    },
  });
}

export function useCreateClient(options?: { scope?: { id: string } }) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: options?.scope,
    mutationKey: CLIENTS_KEYS.mutations.create,
    mutationFn: createClient,
    onMutate: async (newClient) => {
      await queryClient.cancelQueries({ queryKey: CLIENTS_KEYS.lists() });
      const previousClients = queryClient.getQueryData<Client[]>(CLIENTS_KEYS.lists());

      const optimisticClient: Client & { isOptimistic?: boolean } = {
        _id: newClient._id || uuidv4(),
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

      return { previousClients, tempId: optimisticClient._id };
    },
    onError: (error: any, newClient, context) => {
      queryClient.setQueryData(CLIENTS_KEYS.lists(), context?.previousClients);
      notify.error(error, 'Error Creating Client');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.lists() });
    },
    onSuccess: (data, variables, context) => {
      if (context?.tempId) {
        // Patch any pending mutations (e.g. CreateOrchard) that reference this tempId
        patchDependencyId(queryClient, 'clientId', context.tempId, data._id);
      }
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
    mutationKey: CLIENTS_KEYS.mutations.update,
    mutationFn: updateClient,
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
    mutationKey: CLIENTS_KEYS.mutations.delete,
    mutationFn: deleteClient,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: CLIENTS_KEYS.all });


      return {};
    },
    onSuccess: () => {
      notify.success('The client has been removed.', 'Client Deleted');
    },
    onError: (error: any, id, context) => {
      notify.error(error, 'Error Deleting Client');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.all });
    },
  });
}