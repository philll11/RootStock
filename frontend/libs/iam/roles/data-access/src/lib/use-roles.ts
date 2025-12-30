import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Role, CreateRoleDto, UpdateRoleDto } from './roles.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import axios, { AxiosError } from 'axios';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';

export const ROLES_KEYS = {
  all: ['roles'] as const,
  lists: () => [...ROLES_KEYS.all, 'list'] as const,
  list: (filters: string) => [...ROLES_KEYS.lists(), { filters }] as const,
  details: () => [...ROLES_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ROLES_KEYS.details(), id] as const,
};

export const getRole = async (id: string): Promise<Role> => {
  const response = await apiClient.get<Role>(`/roles/${id}`);
  return response.data;
};

export function useGetRoles(options?: { enabled?: boolean }) {
  const { can } = usePermission();
  const isEnabled = (options?.enabled ?? true) && can(PERMISSIONS.ROLE_VIEW);

  return useQuery({
    queryKey: ROLES_KEYS.lists(),
    queryFn: async () => {
      const response = await apiClient.get<Role[]>('/roles');
      return response.data;
    },
    enabled: isEnabled,
  });
}

export function useGetRole(id: string | undefined) {
  return useQuery({
    queryKey: ROLES_KEYS.detail(id!),
    queryFn: () => getRole(id!),
    enabled: !!id,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRoleDto) => {
      const response = await apiClient.post<Role>('/roles', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEYS.lists() });
      notify.success('The role has been successfully created.', 'Role Created');
    },
    onError: (error: any) => {
      notify.error(error, 'Error Creating Role');
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRoleDto }) => {
      const response = await apiClient.patch<Role>(`/roles/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(ROLES_KEYS.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: ROLES_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ROLES_KEYS.detail(variables.id) });
      notify.success('The role details have been updated.', 'Role Updated');
    },
    onError: (error: any) => {
      if (error.response?.status !== 409) {
        notify.error(error, 'Error Updating Role');
      }
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEYS.lists() });
      notify.success('The role has been removed.', 'Role Deleted');
    },
    onError: (error: any) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        notify.error(
          error.response.data.message || 'Cannot delete role.',
          'Deletion Failed'
        );
      } else {
        notify.error(error, 'Error Deleting Role');
      }
    },
  });
}
