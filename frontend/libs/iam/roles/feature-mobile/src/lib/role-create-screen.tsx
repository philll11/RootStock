import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateRole, RoleFormData } from '@rootstock/iam/roles/roles-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { RoleForm } from './role-form';

export const RoleCreateScreen = () => {
  const router = useRouter();
  const { mutateAsync: createRole, isPending: isCreating } = useCreateRole();

  const handleSubmit = async (data: RoleFormData) => {
    try {
      const { isActive, __v, ...createData } = data;
      const newRole = await createRole(createData);
      router.replace(`/iam/roles/${newRole._id}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ResourceCreateLayout title="Create Role">
      <RoleForm
        onSubmit={handleSubmit}
        isSubmitting={isCreating}
        isEditMode={false}
      />
    </ResourceCreateLayout>
  );
};
