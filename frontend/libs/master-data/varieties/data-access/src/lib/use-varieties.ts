import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Variety, CreateVarietyDto, UpdateVarietyDto } from './variety.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { v4 as uuid } from 'uuid';

export const VARIETIES_KEYS = {
  all: ['varieties'] as const,
  lists: () => [...VARIETIES_KEYS.all, 'list'] as const,
  list: (filters: string) => [...VARIETIES_KEYS.lists(), { filters }] as const,
  details: () => [...VARIETIES_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...VARIETIES_KEYS.details(), id] as const,
};

export const getVarieties = async () => {
  const response = await apiClient.get<Variety[]>('/varieties');
  return response.data;
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
    queryFn: getVarieties,
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
    onMutate: async (newVariety) => {
      await queryClient.cancelQueries({ queryKey: VARIETIES_KEYS.lists() });
      const previousVarieties = queryClient.getQueryData<Variety[]>(VARIETIES_KEYS.lists());

      const tempVariety: Variety = {
        ...newVariety,
        _id: uuid(),
        recordId: 'TEMP',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        isDeleted: false,
        __v: 0,
      } as any;

      if (previousVarieties) {
        queryClient.setQueryData<Variety[]>(VARIETIES_KEYS.lists(), [
          tempVariety,
          ...previousVarieties,
        ]);
      }

      return { previousVarieties };
    },
    onError: (err, newVariety, context) => {
      if (context?.previousVarieties) {
        queryClient.setQueryData(VARIETIES_KEYS.lists(), context.previousVarieties);
      }
      notify.error(err, 'Error Creating Variety');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: VARIETIES_KEYS.lists() });
    },
    onSuccess: () => {
      notify.success(
        'The variety has been successfully created.',
        'Variety Created'
      );
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
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: VARIETIES_KEYS.detail(id) });
      await queryClient.cancelQueries({ queryKey: VARIETIES_KEYS.lists() });

      const previousVariety = queryClient.getQueryData<Variety>(VARIETIES_KEYS.detail(id));
      const previousVarieties = queryClient.getQueryData<Variety[]>(VARIETIES_KEYS.lists());

      if (previousVariety) {
        queryClient.setQueryData(VARIETIES_KEYS.detail(id), {
          ...previousVariety,
          ...data,
        });
      }

      if (previousVarieties) {
        queryClient.setQueryData(
          VARIETIES_KEYS.lists(),
          previousVarieties.map((variety) =>
            variety._id === id ? { ...variety, ...data } : variety
          )
        );
      }

      return { previousVariety, previousVarieties };
    },
    onError: (err, variables, context) => {
      if (context?.previousVariety) {
        queryClient.setQueryData(
          VARIETIES_KEYS.detail(variables.id),
          context.previousVariety
        );
      }
      if (context?.previousVarieties) {
        queryClient.setQueryData(VARIETIES_KEYS.lists(), context.previousVarieties);
      }
      if (err.response?.status !== 409) {
        notify.error(err, 'Error Updating Variety');
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: VARIETIES_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: VARIETIES_KEYS.lists() });
    },
    onSuccess: (updatedVariety, variables) => {
      notify.success('The variety details have been updated.', 'Variety Updated');
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