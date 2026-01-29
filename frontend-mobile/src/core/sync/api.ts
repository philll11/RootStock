import { apiClient } from '../api/client';
import { SyncPullArgs, SyncPushArgs } from '@nozbe/watermelondb/sync';

export const SyncApi = {
    pull: async ({ lastPulledAt, schemaVersion, migration }: SyncPullArgs) => {
        // The backend expects 'last_pulled_at' timestamp
        // Schema version might be useful for backend to know if client is outdated
        const response = await apiClient.post('/sync/pull', {
            last_pulled_at: lastPulledAt,
            schema_version: schemaVersion,
            migration,
        });
        return response.data;
    },

    push: async ({ changes, lastPulledAt }: SyncPushArgs) => {
        // The backend expects the changes object and the last_pulled_at timestamp
        // to ensure consistency (handle conflicts if necessary)
        await apiClient.post('/sync/push', {
            changes,
            last_pulled_at: lastPulledAt,
        });
    },
};
