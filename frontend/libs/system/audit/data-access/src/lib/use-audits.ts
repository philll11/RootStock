import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@rootstock/shared/api-client';
import { AuditEntry } from './audits.types';

export const AUDIT_KEYS = {
  all: ['audit'] as const,
  lists: () => [...AUDIT_KEYS.all, 'list'] as const,
  resource: (resource: string) => [...AUDIT_KEYS.lists(), resource] as const,
  history: (resource: string, id: string) => [...AUDIT_KEYS.resource(resource), id] as const,
};

// --- API Functions ---
const BASE_URL = '/system/audit';

export const getAuditHistory = async (resource: string, resourceId: string): Promise<AuditEntry[]> => {
  const response = await apiClient.get<AuditEntry[]>(`${BASE_URL}/${resource}/${resourceId}`);
  return response.data;
};

// --- Hooks ---
export const useGetAuditHistory = (resource: string, resourceId?: string) => {
  return useQuery({
    queryKey: resourceId ? AUDIT_KEYS.history(resource, resourceId) : AUDIT_KEYS.all,
    queryFn: async () => {
      // Return empty list if no ID provided (e.g. during creation)
      if (!resourceId) return [];
      return getAuditHistory(resource, resourceId);
    },
    enabled: !!resourceId,
    retry: false, // Don't retry if it fails (e.g. 403 Forbidden shouldn't retry)
  });
};
