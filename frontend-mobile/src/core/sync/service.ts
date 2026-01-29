import { synchronize } from '@nozbe/watermelondb/sync';
import { getDatabase } from '../../database'; // Adjust path if needed
import { SyncApi } from './api';

export async function syncData() {
    await synchronize({
        database: getDatabase(),
        pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
            const response = await SyncApi.pull({ lastPulledAt, schemaVersion, migration });

            if (!response.changes || !response.timestamp) {
                throw new Error('Invalid sync response');
            }

            return {
                changes: response.changes,
                timestamp: response.timestamp,
            };
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
            await SyncApi.push({ changes, lastPulledAt });
        },
        // Optional: safe-guards
        migrationsEnabledAtVersion: 1,
    });
}
