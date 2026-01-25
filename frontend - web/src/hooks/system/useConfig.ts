import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSystemConfig, updateSystemConfig } from 'api/system/config';
import { useSnackbar } from 'contexts/SnackbarContext';

export const SYSTEM_CONFIG_KEYS = {
  all: ['system-config'] as const,
  detail: (key: string) => [...SYSTEM_CONFIG_KEYS.all, 'detail', key] as const
};

export function useGetSystemConfig<T>(key: string) {
  return useQuery({
    queryKey: SYSTEM_CONFIG_KEYS.detail(key),
    queryFn: () => getSystemConfig<T>(key),
    enabled: !!key
  });
}

export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();
  const { showMessage } = useSnackbar();

  return useMutation({
    mutationFn: updateSystemConfig,
    onSuccess: (_, { key }) => {
      showMessage('Configuration updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: SYSTEM_CONFIG_KEYS.detail(key) });
    },
    onError: (err: any) => {
      showMessage(err.message || 'Failed to update configuration', 'error');
    }
  });
}
