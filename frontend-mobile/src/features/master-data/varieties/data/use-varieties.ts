import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api';
import { Variety, CreateVarietyDto, UpdateVarietyDto } from './variety.types';
import { notify, PERMISSIONS } from '@/utils';
import { usePermission } from '@/features/iam/auth/data';
import { v4 as uuid } from 'uuid';
import { patchDependencyId } from '@/features/system/sync/data';

export const VARIETIES_KEYS = {
  all: ['varieties'] as const,
  lists: () => [...VARIETIES_KEYS.all, 'list'] as const,
  list: (filters: string) => [...VARIETIES_KEYS.lists(), { filters }] as const,
  details: () => [...VARIETIES_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...VARIETIES_KEYS.details(), id] as const,
  mutations: {
    create: ['varieties', 'create'] as const,
    update: ['varieties', 'update'] as const,
    delete: ['varieties', 'delete'] as const,
  },
};

// --- API Functions ---

const BASE_URL = '/varieties';

export const getVarieties = async () => {
  const response = await apiClient.get<Variety[]>(BASE_URL);
  return response.data;
};

export const getVariety = async (id: string): Promise<Variety> => {
  const response = await apiClient.get<Variety>(`${BASE_URL}/${id}`);
  return response.data;
};

export const createVariety = async (data: CreateVarietyDto) => {
  // We skip the global 409 handler because a 409 on create means "Duplicate" not "Version Conflict"
  // and we handle the error notification explicitly in the mutation.
  const { _id, ...payload } = data;
  const response = await apiClient.post<Variety>(BASE_URL, payload, {
    skipGlobalErrorHandler: true
  } as any);
  return response.data;
};

export const updateVariety = async ({
  id,
  data,
}: {
  id: string;
  data: UpdateVarietyDto;
}) => {
  const response = await apiClient.patch<Variety>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteVariety = async (id: string) => {
  await apiClient.delete(`${BASE_URL}/${id}`);
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
  const queryClient = useQueryClient();
  const isEnabled = can(PERMISSIONS.VARIETY_VIEW) && !!id;

  return useQuery({
    queryKey: VARIETIES_KEYS.detail(id),
    queryFn: () => getVariety(id),
    enabled: isEnabled,
    initialData: () => {
      const allVarieties = queryClient.getQueryData<Variety[]>(VARIETIES_KEYS.lists());
      return allVarieties?.find((v) => v._id === id);
    },
  });
}

export function useCreateVariety(options?: { scope?: { id: string } }) {
  const queryClient = useQueryClient();

  return useMutation({
    scope: options?.scope,
    mutationKey: VARIETIES_KEYS.mutations.create,
    mutationFn: createVariety,
    onMutate: async (newVariety) => {
      await queryClient.cancelQueries({ queryKey: VARIETIES_KEYS.lists() });
      const previousVarieties = queryClient.getQueryData<Variety[]>(VARIETIES_KEYS.lists());

      const tempVariety: Variety = {
        ...newVariety,
        _id: newVariety._id || uuid(),
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

      return { previousVarieties, tempId: tempVariety._id };
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
    onSuccess: (data, variables, context) => {
      if (context?.tempId) {
        // Patch any pending mutations (e.g. CreateBlock) that reference this tempId
        patchDependencyId(queryClient, 'varietyId', context.tempId, data._id);
      }
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
    mutationKey: VARIETIES_KEYS.mutations.update,
    mutationFn: updateVariety,
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
    mutationKey: VARIETIES_KEYS.mutations.delete,
    mutationFn: deleteVariety,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: VARIETIES_KEYS.all });

      return { };
    },
    onSuccess: () => {
      notify.success('The variety has been successfully deleted.', 'Variety Deleted');
    },
    onError: (error: any, id, context) => {
      notify.error(error, 'Error Deleting Variety');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: VARIETIES_KEYS.all });
    },
  });
}