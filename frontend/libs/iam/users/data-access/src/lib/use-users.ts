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

// --- API Functions ---

const BASE_URL = '/users';

export const getUser = async (id: string): Promise<User> => {
  const response = await apiClient.get<User>(`${BASE_URL}/${id}`);
  return response.data;
};

export const getUsers = async (): Promise<User[]> => {
  const response = await apiClient.get<User[]>(BASE_URL);
  return response.data;
};

export const createUser = async (data: CreateUserDto): Promise<User> => {
  const response = await apiClient.post<User>(BASE_URL, data);
  return response.data;
};

export const updateUser = async ({ id, data, }: { id: string; data: UpdateUserDto;}) : Promise<User> => {
  const response = await apiClient.patch<User>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/${id}`);
};

export function useGetUsers() {
  return useQuery({
    queryKey: USERS_KEYS.lists(),
    queryFn: getUsers,
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
    mutationFn: createUser,
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
    mutationFn: updateUser,
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
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
      notify.success('The user has been removed.', 'User Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting User');
    },
  });
}
