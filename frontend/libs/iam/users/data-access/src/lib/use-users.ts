import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { User, CreateUserDto, UpdateUserDto } from './user.types';
import { notify } from '@rootstock/shared/util';

export const USERS_KEYS = {
  all: ['users'] as const,
  lists: () => [...USERS_KEYS.all, 'list'] as const,
  list: (filters: string) => [...USERS_KEYS.lists(), { filters }] as const,
  details: () => [...USERS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...USERS_KEYS.details(), id] as const,
};

export const getUser = async (id: string): Promise<User> => {
  const response = await apiClient.get<User>(`/users/${id}`);
  return response.data;
};

export function useGetUsers() {
  return useQuery({
    queryKey: USERS_KEYS.lists(),
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/users');
      return response.data;
    },
  });
}

export function useGetUser(id: string) {
  return useQuery({
    queryKey: USERS_KEYS.detail(id),
    queryFn: () => getUser(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserDto) => {
      const response = await apiClient.post<User>('/users', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
      notify.success('The user has been successfully created.', 'User Created');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Creating User');
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserDto }) => {
      const response = await apiClient.patch<User>(`/users/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(USERS_KEYS.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
      queryClient.invalidateQueries({
        queryKey: USERS_KEYS.detail(variables.id),
      });
      notify.success('The user details have been updated.', 'User Updated');
    },
    onError: (error: any) => {
      if (error.response?.status !== 409) {
        notify.error(error, 'Error Updating User');
      }
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
      notify.success('The user has been removed.', 'User Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting User');
    },
  });
}
