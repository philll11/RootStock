import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateOrchard, OrchardFormData } from '@rootstock/assets/orchards/orchards-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { OrchardForm } from './orchard-form';
import { useNetInfo } from '@react-native-community/netinfo';
import { notify } from '@rootstock/shared/util';
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';

export function OrchardCreateScreen() {
  const router = useRouter();
  // Generate a stable ID for this screen session (for the new record)
  const tempId = React.useMemo(() => uuid(), []);

  // State to track scope based on Client Selection
  const [scopeId, setScopeId] = React.useState<string | undefined>(undefined);
  
  // Initialize hook with DYNAMIC scope derived from form state
  const { mutate: createOrchard, mutateAsync: createOrchardAsync, isPending: isCreating } = useCreateOrchard({
     scope: scopeId ? { id: scopeId } : undefined
  });
  
  const { isConnected } = useNetInfo();

  // Callback when user selects a client in the form
  const handleClientChange = React.useCallback((clientId: string) => {
    if (clientId) setScopeId(clientId);
  }, []);

  const handleSubmit = async (data: OrchardFormData) => {
    if (!data.clientId) return;
    
    // Dynamic Scope: The Client ID defines the serialization queue
    // Note: The hook is already updated with this scope via state.

    const isOnline = isConnected === true;
    try {
      const payload = {
        _id: tempId,
        name: data.name,
        clientId: data.clientId,
        userIds: data.userIds,
      };

      if (isOnline) {
        // Online: Wait for validation
        await createOrchardAsync(payload);
      } else {
        // Offline: Fire & Forget with Scope
        createOrchard(payload);
        notify.success('Will sync when online', 'Saved to Outbox');
      }
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ResourceCreateLayout title="Create Orchard">
      <OrchardForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        onClientChange={handleClientChange}
        isSubmitting={isCreating}
      />
    </ResourceCreateLayout>
  );
}
