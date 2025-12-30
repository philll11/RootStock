import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useVarieties, useVariety } from '@rootstock/master-data/varieties/varieties-data-access';
import { ActivityIndicator } from 'react-native-paper';
import { View } from 'react-native';
import { VarietyForm, VarietyFormData } from './variety-form';

export const VarietyEditScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateVariety, isUpdating } = useVarieties();
  const { data: variety, isLoading } = useVariety(id);

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
