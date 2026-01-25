import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, getUser, createUser, updateUser, deleteUser } from 'api/iam/users';
import { useSnackbar } from 'contexts/SnackbarContext';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import { User } from 'types/iam/user.types';

export const USERS_KEYS = {
  all: ['users'] as const,
  lists: () => [...USERS_KEYS.all, 'list'] as const,
  list: (filters: string) => [...USERS_KEYS.lists(), { filters }] as const,
  details: () => [...USERS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...USERS_KEYS.details(), id] as const,
  mutations: {
    create: ['users', 'create'] as const,
    update: ['users', 'update'] as const,
    delete: ['users', 'delete'] as const
  }
};

export const useGetUsers = (options?: { enabled?: boolean }) => {
  const { can } = usePermission();
  // Assuming USER_VIEW permission exists or similar
  const isEnabled = (options?.enabled ?? true) && can(PERMISSIONS.USER_VIEW);

  return useQuery({
    queryKey: USERS_KEYS.lists(),
    queryFn: getUsers,
    enabled: isEnabled
  });
};

export const useGetUser = (id: string) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: USERS_KEYS.detail(id),
    queryFn: () => getUser(id),
    enabled: !!id,
    initialData: () => {
      if (!id) return undefined;
      // Try to find in the list cache first
      // Note: Key matching must be precise. 'lists' vs 'list(params)'.
      // Simple approach: check generic list.
      const allUsers = queryClient.getQueryData<User[]>(USERS_KEYS.lists());
      // Depending on strictness, we might fallback to iterating known list keys
      // But simple optimization is often enough.
      if (Array.isArray(allUsers)) {
        return allUsers.find((u) => u._id === id);
      }
      return undefined;
    }
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useSnackbar();

  return useMutation({
    mutationKey: USERS_KEYS.mutations.create,
    mutationFn: createUser,
    onSuccess: () => {
      showMessage('User created successfully', 'success');
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
    },
    onError: (error: any) => {
      showMessage(error.message || 'Failed to create user', 'error');
    }
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useSnackbar();

  return useMutation({
    mutationKey: USERS_KEYS.mutations.update,
    mutationFn: updateUser,
    onSuccess: (_data, variables) => {
      showMessage('User updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.detail(variables.id) });
    },
    onError: (error: any) => {
      showMessage(error.message || 'Failed to update user', 'error');
    }
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { showMessage } = useSnackbar();

  return useMutation({
    mutationKey: USERS_KEYS.mutations.delete,
    mutationFn: deleteUser,
    onSuccess: () => {
      showMessage('User deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
    },
    onError: (error: any) => {
      showMessage(error.message || 'Failed to delete user', 'error');
    }
  });
};
