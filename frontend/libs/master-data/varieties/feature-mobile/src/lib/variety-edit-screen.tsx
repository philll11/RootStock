import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetVariety, useUpdateVariety } from '@rootstock/master-data/varieties/varieties-data-access';
import { ActivityIndicator } from 'react-native-paper';
import { View } from 'react-native';
import { VarietyForm, VarietyFormData } from './variety-form';

export const VarietyEditScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: updateVariety, isPending: isUpdating } = useUpdateVariety();
  const { data: variety, isLoading } = useGetVariety(id!);

  const handleSubmit = async (data: VarietyFormData) => {
    if (!id || !variety) return;
    try {
      await updateVariety({ 
        id, 
        data: { 
          ...data, 
          __v: variety.__v 
        } 
      });
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator /></View>;
  }

  if (!variety) return null;

  return (
    <VarietyForm
      defaultValues={{
        name: variety.name,
        isActive: variety.isActive
      }}
      onSubmit={handleSubmit}
      isSubmitting={isUpdating}
      isEditMode={true}
    />
  );
};
