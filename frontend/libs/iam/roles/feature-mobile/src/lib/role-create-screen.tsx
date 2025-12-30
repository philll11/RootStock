import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateRole } from '@rootstock/iam/roles/roles-data-access';
import { RoleForm, RoleFormData } from './role-form';

export const RoleCreateScreen = () => {
  const router = useRouter();
  const { mutateAsync: createRole, isPending: isCreating } = useCreateRole();

  const handleSubmit = async (data: RoleFormData) => {
    try {
      const { isActive, ...createData } = data;
      const newRole = await createRole(createData);
      router.replace(`/iam/roles/${newRole._id}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <RoleForm
      onSubmit={handleSubmit}
      isSubmitting={isCreating}
      isEditMode={false}
    />
  );
};
