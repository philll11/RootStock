import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
} from 'api/iam/roles';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import { CreateRoleDto, UpdateRoleDto, Role } from 'types/iam/role.types';

export const ROLES_KEYS = {
  all: ['roles'] as const,
  lists: () => [...ROLES_KEYS.all, 'list'] as const,
  list: (filters: string) => [...ROLES_KEYS.lists(), { filters }] as const,
  details: () => [...ROLES_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ROLES_KEYS.details(), id] as const,
  mutations: {
    create: ['roles', 'create'] as const,
    update: ['roles', 'update'] as const,
    delete: ['roles', 'delete'] as const,
  },
};

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
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ROLES_KEYS.detail(id!),
    queryFn: () => getRole(id!),
    enabled: !!id,
    initialData: () => {
      if (!id) return undefined;
      const allRoles = queryClient.getQueryData<Role[]>(ROLES_KEYS.lists());
      return allRoles?.find((r) => r._id === id);
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ROLES_KEYS.mutations.create,
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEYS.lists() });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ROLES_KEYS.mutations.update,
    mutationFn: updateRole,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ROLES_KEYS.detail(data._id) });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ROLES_KEYS.mutations.delete,
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_KEYS.lists() });
    },
  });
}
