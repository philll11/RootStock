import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUpdateRole, useGetRole, RoleFormData } from '@rootstock/iam/roles/roles-data-access';
import { ResourceEditLayout } from '@rootstock/ui/mobile';
import { RoleForm } from './role-form';

export const RoleEditScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: updateRole, isPending: isUpdating } = useUpdateRole();
  const { data: role, isLoading } = useGetRole(id);

  const handleSubmit = async (data: RoleFormData) => {
    if (!id || !role) return;
    try {
      const { __v, ...updateData } = data;
      await updateRole({ 
        id, 
        data: { 
          ...updateData, 
          __v: role.__v 
        } 
      });
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ResourceEditLayout
      isLoading={isLoading}
      error={!role}
      title="Edit Role"
    >
      {role && (
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
      )}
    </ResourceEditLayout>
  );
};
