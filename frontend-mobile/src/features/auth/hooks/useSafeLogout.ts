import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Hook to handle "Airlock" safe logout logic.
 * Prevents logout if there are pending offline mutations or active syncs.
 */
export const useSafeLogout = () => {
    const router = useRouter();

    const handleLogout = async () => {
        // TODO: Integration with TanStack Query mutation cache
        const pendingMutations = 0;
        // TODO: Integration with SyncManager
        const isSyncing = false;

        if (isSyncing || pendingMutations > 0) {
            Alert.alert(
                "Pending Changes",
                "You have unsaved changes syncing to the cloud. Logging out now may result in data loss.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Force Logout",
                        style: "destructive",
                        onPress: performLogout
                    }
                ]
            );
            return;
        }

        await performLogout();
    };

    const performLogout = async () => {
        try {
            console.log("Performing cleanup...");
            // TODO: Clear Auth Tokens
            // TODO: Clear Context

            Alert.alert("Logged Out", "User has been logged out.");
            // router.replace('/login');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return { handleLogout };
};
