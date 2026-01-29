import { useQuery } from '@tanstack/react-query';
import { getAuditHistory } from 'api/system/audit';

export const useGetAuditHistory = (resource: string | undefined, resourceId: string | undefined) => {
    return useQuery({
        queryKey: ['audit', resource, resourceId],
        queryFn: () => getAuditHistory(resource!, resourceId!),
        enabled: !!resource && !!resourceId
    });
};
