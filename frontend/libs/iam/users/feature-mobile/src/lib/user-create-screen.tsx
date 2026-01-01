import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateUser, UserFormData } from '@rootstock/iam/users/users-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { UserForm } from './user-form';

export function UserCreateScreen() {
  const router = useRouter();
  const { mutateAsync: createUser, isPending: isCreating } = useCreateUser();

  const handleSubmit = async (data: UserFormData) => {
    const { isActive, ...createData } = data;
    const newItem = await createUser(createData);
    router.replace(`/iam/users/${newItem._id}`);
  };

  return (
    <ResourceCreateLayout title="Create User">
      <UserForm
        onSubmit={handleSubmit}
        isSubmitting={isCreating}
      />
    </ResourceCreateLayout>
  );
}
