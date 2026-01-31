import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api';
import { SystemConfig, UpdateSystemConfigDto } from './system-config.types';
import { notify } from '@/utils';

export const SYSTEM_CONFIG_KEYS = {
  all: ['system-config'] as const,
  lists: () => [...SYSTEM_CONFIG_KEYS.all, 'list'] as const,
  details: () => [...SYSTEM_CONFIG_KEYS.all, 'detail'] as const,
  detail: (key: string) => [...SYSTEM_CONFIG_KEYS.details(), key] as const,
};

// --- API Functions ---
const BASE_URL = '/system/config';

export const getSystemConfigs = async (): Promise<SystemConfig[]> => {
  const response = await apiClient.get<SystemConfig[]>(BASE_URL);
  return response.data;
};

export const getSystemConfig = async (key: string): Promise<SystemConfig> => {
  const response = await apiClient.get<SystemConfig>(`${BASE_URL}/${key}`);
  return response.data;
};

export const updateSystemConfig = async ({ key, data }: { key: string; data: UpdateSystemConfigDto }): Promise<void> => {
  await apiClient.patch(`${BASE_URL}/${key}`, data);
};

// --- Hooks ---

export function useGetSystemConfigs() {
  return useQuery({
    queryKey: SYSTEM_CONFIG_KEYS.lists(),
    queryFn: getSystemConfigs,
  });
}

export function useGetSystemConfig(key: string) {
  return useQuery({
    queryKey: SYSTEM_CONFIG_KEYS.detail(key),
    queryFn: () => getSystemConfig(key),
    enabled: !!key,
  });
}

export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSystemConfig,
    onSuccess: (_, { key }) => {
      notify.success('Configuration updated successfully');
      queryClient.invalidateQueries({ queryKey: SYSTEM_CONFIG_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: SYSTEM_CONFIG_KEYS.detail(key) });
    },
    onError: (error: any) => {
      notify.error(error.message || 'Failed to update configuration');
    },
  });
}
