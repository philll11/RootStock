import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Role, CreateRoleDto, UpdateRoleDto } from './roles.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import axios, { AxiosError } from 'axios';
import { usePermission } from '@rootstock/auth/auth-data-access';

export const ROLES_QUERY_KEY = ['roles'];

export const getRole = async (id: string): Promise<Role> => {
  const response = await apiClient.get<Role>(`/roles/${id}`);
  return response.data;
};

export function useRoles(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isEnabled = (options?.enabled ?? true) && can(PERMISSIONS.ROLE_VIEW);

  const rolesQuery = useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<Role[]>('/roles');
      return response.data;
    },
    enabled: isEnabled,
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: CreateRoleDto) => {
      const response = await apiClient.post<Role>('/roles', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      notify.success('The role has been successfully created.', 'Role Created');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Creating Role');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRoleDto }) => {
      const response = await apiClient.patch<Role>(`/roles/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      notify.success('The role details have been updated.', 'Role Updated');
    },
    onError: (error: any) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        notify.error('This record has been modified by another user. Please reload and try again.', 'Version Conflict');
      } else {
        notify.error(error, 'Error Updating Role');
      }
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
      notify.success('The role has been removed.', 'Role Deleted');
    },
    onError: (error: any) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
         notify.error(error.response.data.message || 'Cannot delete role.', 'Deletion Failed');
      } else {
        notify.error(error, 'Error Deleting Role');
      }
    },
  });

  return {
    roles: rolesQuery.data ?? [],
    isLoading: rolesQuery.isLoading,
    isError: rolesQuery.isError,
    getRole,
    createRole: createRoleMutation.mutateAsync,
    updateRole: updateRoleMutation.mutateAsync,
    deleteRole: deleteRoleMutation.mutateAsync,
    isCreating: createRoleMutation.isPending,
    isUpdating: updateRoleMutation.isPending,
    isDeleting: deleteRoleMutation.isPending,
  };
}
