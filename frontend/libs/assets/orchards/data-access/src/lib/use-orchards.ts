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
import { v4 as uuid } from 'uuid';

export const ORCHARDS_KEYS = {
  all: ['orchards'] as const,
  lists: () => [...ORCHARDS_KEYS.all, 'list'] as const,
  list: (filters: string) => [...ORCHARDS_KEYS.lists(), { filters }] as const,
  details: () => [...ORCHARDS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ORCHARDS_KEYS.details(), id] as const,
  mutations: {
    create: ['orchards', 'create'] as const,
    update: ['orchards', 'update'] as const,
    delete: ['orchards', 'delete'] as const,
  },
};

// --- API Functions ---
const BASE_URL = '/orchards';

export const getOrchards = async (): Promise<Orchard[]> => {
  const response = await apiClient.get<Orchard[]>(BASE_URL);
  return response.data;
};

export const getOrchard = async (id: string): Promise<Orchard> => {
  const response = await apiClient.get<Orchard>(`${BASE_URL}/${id}`);
  return response.data;
};

// Helper for searching orchards (useful for dropdowns)
export const searchOrchards = async (query: string): Promise<Orchard[]> => {
  const params = new URLSearchParams();
  if (query) params.append('name', query);
  const response = await apiClient.get<Orchard[]>(
    `${BASE_URL}?${params.toString()}`
  );
  return response.data;
};

export const createOrchard = async (data: CreateOrchardDto): Promise<Orchard> => {
  const response = await apiClient.post<Orchard>(BASE_URL, data);
  return response.data;
};

export const updateOrchard = async ({ id, data }: { id: string; data: UpdateOrchardDto }): Promise<Orchard> => {
  const response = await apiClient.patch<Orchard>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteOrchard = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/${id}`);
};

export function useGetOrchards() {
  const { can } = usePermission();
  const isEnabled = can(PERMISSIONS.ORCHARD_VIEW);

  return useQuery({
    queryKey: ORCHARDS_KEYS.lists(),
    queryFn: getOrchards,
    enabled: isEnabled,
    staleTime: Infinity,
  });
}

export function useGetOrchard(id: string) {
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const isEnabled = can(PERMISSIONS.ORCHARD_VIEW) && !!id;

  return useQuery({
    queryKey: ORCHARDS_KEYS.detail(id),
    queryFn: () => getOrchard(id),
    enabled: isEnabled,
    initialData: () => {
      const allOrchards = queryClient.getQueryData<Orchard[]>(ORCHARDS_KEYS.lists());
      return allOrchards?.find((o) => o._id === id);
    },
  });
}

export function useCreateOrchard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ORCHARDS_KEYS.mutations.create,
    mutationFn: createOrchard,
    onMutate: async (newOrchard) => {
      await queryClient.cancelQueries({ queryKey: ORCHARDS_KEYS.lists() });
      const previousOrchards = queryClient.getQueryData<Orchard[]>(ORCHARDS_KEYS.lists());

      const tempOrchard: Orchard = {
        ...newOrchard,
        _id: uuid(),
        recordId: 'TEMP',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any;

      if (previousOrchards) {
        queryClient.setQueryData<Orchard[]>(ORCHARDS_KEYS.lists(), [
          tempOrchard,
          ...previousOrchards,
        ]);
      }

      return { previousOrchards };
    },
    onError: (err, newOrchard, context) => {
      if (context?.previousOrchards) {
        queryClient.setQueryData(ORCHARDS_KEYS.lists(), context.previousOrchards);
      }
      notify.error(err, 'Error Creating Orchard');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ORCHARDS_KEYS.lists() });
    },
    onSuccess: () => {
      notify.success(
        'The orchard has been successfully created.',
        'Orchard Created'
      );
    },
  });
}

export function useUpdateOrchard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ORCHARDS_KEYS.mutations.update,
    mutationFn: updateOrchard,
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ORCHARDS_KEYS.detail(id) });
      await queryClient.cancelQueries({ queryKey: ORCHARDS_KEYS.lists() });

      const previousOrchard = queryClient.getQueryData<Orchard>(ORCHARDS_KEYS.detail(id));
      const previousOrchards = queryClient.getQueryData<Orchard[]>(ORCHARDS_KEYS.lists());

      if (previousOrchard) {
        queryClient.setQueryData(ORCHARDS_KEYS.detail(id), {
          ...previousOrchard,
          ...data,
        });
      }

      if (previousOrchards) {
        queryClient.setQueryData(
          ORCHARDS_KEYS.lists(),
          previousOrchards.map((orchard) =>
            orchard._id === id ? { ...orchard, ...data } : orchard
          )
        );
      }

      return { previousOrchard, previousOrchards };
    },
    onError: (err, variables, context) => {
      if (context?.previousOrchard) {
        queryClient.setQueryData(
          ORCHARDS_KEYS.detail(variables.id),
          context.previousOrchard
        );
      }
      if (context?.previousOrchards) {
        queryClient.setQueryData(ORCHARDS_KEYS.lists(), context.previousOrchards);
      }
      notify.error(err, 'Error Updating Orchard');
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ORCHARDS_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ORCHARDS_KEYS.lists() });
    },
    onSuccess: () => {
      notify.success('The orchard details have been updated.', 'Orchard Updated');
    },
  });
}

export function useDeleteOrchard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ORCHARDS_KEYS.mutations.delete,
    mutationFn: async (id: string) => {
      await apiClient.delete(`/orchards/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ORCHARDS_KEYS.all });
      return { };
    },
    onSuccess: () => {
      notify.success('The orchard has been removed.', 'Orchard Deleted');
    },
    onError: (error: any, id, context) => {
      notify.error(error, 'Error Deleting Orchard');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ORCHARDS_KEYS.all });
    },
  });
}
