import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateVariety } from '@rootstock/master-data/varieties/varieties-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { VarietyForm, VarietyFormData } from './variety-form';

export const VarietyCreateScreen = () => {
  const router = useRouter();
  const { mutateAsync: createVariety, isPending: isCreating } = useCreateVariety();

  const handleSubmit = async (data: VarietyFormData) => {
    try {
      const { isActive, ...createData } = data;
      const newVariety = await createVariety(createData);
      router.replace(`/master-data/varieties/${newVariety._id}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ResourceCreateLayout title="Create Variety">
      <VarietyForm
        onSubmit={handleSubmit}
        isSubmitting={isCreating}
        isEditMode={false}
      />
    </ResourceCreateLayout>
  );
};
