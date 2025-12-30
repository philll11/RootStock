import React from 'react';
import { useRouter } from 'expo-router';
import { useVarieties } from '@rootstock/master-data/varieties/varieties-data-access';
import { VarietyForm, VarietyFormData } from './variety-form';

export const VarietyCreateScreen = () => {
  const router = useRouter();
  const { createVariety, isCreating } = useVarieties();

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
    <VarietyForm
      onSubmit={handleSubmit}
      isSubmitting={isCreating}
      isEditMode={false}
    />
  );
};
