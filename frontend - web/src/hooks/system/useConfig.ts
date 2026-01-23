import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSystemConfig, updateSystemConfig, UpdateSystemConfigDto } from 'api/system/config';
import { useSnackbar } from 'contexts/SnackbarContext';

export const SYSTEM_CONFIG_KEYS = {
    all: ['system-config'] as const,
    detail: (key: string) => [...SYSTEM_CONFIG_KEYS.all, 'detail', key] as const,
};

export function useGetSystemConfig<T>(key: string) {
    return useQuery({
        queryKey: SYSTEM_CONFIG_KEYS.detail(key),
        queryFn: () => getSystemConfig<T>(key),
        enabled: !!key,
    });
}

export function useUpdateSystemConfig() {
    const queryClient = useQueryClient();
    const { showMessage } = useSnackbar();

    return useMutation({
        mutationFn: ({ key, data }: { key: string; data: UpdateSystemConfigDto }) => 
            updateSystemConfig(key, data),
        onMutate: async ({ key, data }) => {
            await queryClient.cancelQueries({ queryKey: SYSTEM_CONFIG_KEYS.detail(key) });
            const previousConfig = queryClient.getQueryData(SYSTEM_CONFIG_KEYS.detail(key));
            
            queryClient.setQueryData(SYSTEM_CONFIG_KEYS.detail(key), (old: any) => {
                if (!old) return old;
                return { ...old, value: data.value };
            });
            
            return { previousConfig };
        },
        onError: (err: any, { key }, context: any) => {
            if (context?.previousConfig) {
                queryClient.setQueryData(SYSTEM_CONFIG_KEYS.detail(key), context.previousConfig);
            }
            showMessage(err.message || 'Failed to update configuration', 'error');
        },
        onSettled: (_, __, { key }) => {
            queryClient.invalidateQueries({ queryKey: SYSTEM_CONFIG_KEYS.detail(key) });
        },
        onSuccess: () => {
             showMessage('Configuration updated successfully', 'success');
        }
    });
}
