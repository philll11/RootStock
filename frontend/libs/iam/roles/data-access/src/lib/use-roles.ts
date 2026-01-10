import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { Role, CreateRoleDto, UpdateRoleDto } from './roles.types';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import axios from 'axios';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';

export const ROLES_KEYS = {
  all: ['roles'] as const,
  lists: () => [...ROLES_KEYS.all, 'list'] as const,
  list: (filters: string) => [...ROLES_KEYS.lists(), { filters }] as const,
  details: () => [...ROLES_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ROLES_KEYS.details(), id] as const,
};

// --- API Functions ---

const BASE_URL = '/roles';

export const getRoles = async (): Promise<Role[]> => {
  const response = await apiClient.get<Role[]>(BASE_URL);
  return response.data;
};

export const getRole = async (id: string): Promise<Role> => {
  const response = await apiClient.get<Role>(`${BASE_URL}/${id}`);
  return response.data;
};

export const createRole = async (data: CreateRoleDto): Promise<Role> => {
  const response = await apiClient.post<Role>(BASE_URL, data);
  return response.data;
};

export const updateRole = async ({ id, data }: { id: string; data: UpdateRoleDto }): Promise<Role> => {
  const response = await apiClient.patch<Role>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteRole = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/${id}`);
};

// --- Hooks ---

export function useGetRoles(options?: { enabled?: boolean }) {
  const { can } = usePermission();
  const isEnabled = (options?.enabled ?? true) && can(PERMISSIONS.ROLE_VIEW);

  return useQuery({
    queryKey: ROLES_KEYS.lists(),
    queryFn: getRoles,
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
    mutationFn: createRole,
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
    mutationFn: updateRole,
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
    mutationFn: deleteRole,
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
