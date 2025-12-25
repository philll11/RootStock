import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { User, CreateUserDto, UpdateUserDto } from './user.types';
import { notify } from '@rootstock/shared/util';

export const USERS_QUERY_KEY = ['users'];

export const getUser = async (id: string): Promise<User> => {
  const response = await apiClient.get<User>(`/users/${id}`);
  return response.data;
};

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: [...USERS_QUERY_KEY, id],
    queryFn: () => getUser(id!),
    enabled: !!id,
  });
}

export function useUsers() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/users');
      return response.data;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserDto) => {
      const response = await apiClient.post<User>('/users', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      notify.success('The user has been successfully created.', 'User Created');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Creating User');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserDto }) => {
      const response = await apiClient.patch<User>(`/users/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData([...USERS_QUERY_KEY, variables.id], data);
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...USERS_QUERY_KEY, variables.id] });
      notify.success('The user details have been updated.', 'User Updated');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Updating User');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      notify.success('The user has been removed.', 'User Deleted');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Deleting User');
    },
  });

  return {
    users: usersQuery.data ?? [],
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    getUser,
    createUser: createUserMutation.mutateAsync,
    updateUser: updateUserMutation.mutateAsync,
    deleteUser: deleteUserMutation.mutateAsync,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
  };
}
