import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateOrchard } from '@rootstock/assets/orchards/orchards-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { OrchardForm } from './orchard-form';

export function OrchardCreateScreen() {
  const router = useRouter();
  const { mutateAsync: createOrchard, isPending: isCreating } = useCreateOrchard();

  const handleSubmit = async (data: any) => {
    // Exclude isActive from creation payload
    const { isActive, ...createData } = data;
    await createOrchard(createData);
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
