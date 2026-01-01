import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetOrchard, useUpdateOrchard, OrchardFormData } from '@rootstock/assets/orchards/orchards-data-access';
import { ResourceEditLayout } from '@rootstock/ui/mobile';
import { OrchardForm } from './orchard-form';

export function OrchardEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: orchard, isLoading, isError } = useGetOrchard(id!);
  const { mutateAsync: updateOrchard, isPending: isUpdating } = useUpdateOrchard();

  const defaultValues = orchard ? {
    name: orchard.name,
    clientId:
      typeof orchard.clientId === 'string'
        ? orchard.clientId
        : orchard.clientId._id,
    userIds:
      orchard.userIds?.map((u) => (typeof u === 'string' ? u : u._id)) || [],
    isActive: orchard.isActive,
  } : undefined;

  const handleSubmit = async (data: OrchardFormData) => {
    if (!orchard) return;
    await updateOrchard({ 
      id: id!, 
      data: {
        name: data.name,
        userIds: data.userIds,
        isActive: data.isActive,
        __v: orchard.__v
      } 
    });
    router.back();
  };

  return (
    <ResourceEditLayout
      isLoading={isLoading}
      error={isError || !orchard}
      title="Edit Orchard"
    >
      {orchard && (
        <OrchardForm
          mode="edit"
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isSubmitting={isUpdating}
        />
      )}
    </ResourceEditLayout>
  );
}
