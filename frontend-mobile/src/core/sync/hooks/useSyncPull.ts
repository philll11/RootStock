import { useState, useCallback } from 'react';
import { RefreshControl } from 'react-native';
import { syncData } from '../service';
import { checkApiReachability } from '@/src/core/api/client';

export const useSyncPull = () => {
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        const isOnline = await checkApiReachability();
        if (!isOnline) {
            // TODO: Integrate with a toast notification system
            console.log('You are offline. Cannot sync.');
            setRefreshing(false);
            return;
        }

        try {
            await syncData();
        } catch (error) {
            console.error('Sync failed during pull-to-refresh', error);
        } finally {
            setRefreshing(false);
        }
    }, []);

    return {
        refreshing,
        onRefresh
    };
};
