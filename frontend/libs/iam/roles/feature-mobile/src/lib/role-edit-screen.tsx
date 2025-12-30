import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUpdateRole, useGetRole } from '@rootstock/iam/roles/roles-data-access';
import { ActivityIndicator } from 'react-native-paper';
import { View } from 'react-native';
import { RoleForm, RoleFormData } from './role-form';

export const RoleEditScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: updateRole, isPending: isUpdating } = useUpdateRole();
  const { data: role, isLoading } = useGetRole(id);

  const handleSubmit = async (data: RoleFormData) => {
    if (!id || !role) return;
    try {
      await updateRole({ 
        id, 
        data: { 
          ...data, 
          __v: role.__v 
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

  if (!role) return null;

  return (
    <RoleForm
      defaultValues={{
        name: role.name,
        description: role.description || '',
        visibilityScope: role.visibilityScope,
        permissions: role.permissions || [],
        isActive: role.isActive
      }}
      onSubmit={handleSubmit}
      isSubmitting={isUpdating}
      isEditMode={true}
    />
  );
};
