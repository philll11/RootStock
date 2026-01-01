import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateOrchard, OrchardFormData } from '@rootstock/assets/orchards/orchards-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { OrchardForm } from './orchard-form';

export function OrchardCreateScreen() {
  const router = useRouter();
  const { mutateAsync: createOrchard, isPending: isCreating } = useCreateOrchard();

  const handleSubmit = async (data: OrchardFormData) => {
    await createOrchard({
      name: data.name,
      clientId: data.clientId,
      userIds: data.userIds,
    });
    router.back();
  };

  return (
    <ResourceCreateLayout title="Create Orchard">
      <OrchardForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSubmitting={isCreating}
      />
    </ResourceCreateLayout>
  );
}
