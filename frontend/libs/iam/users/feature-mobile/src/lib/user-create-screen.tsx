import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateUser } from '@rootstock/iam/users/users-data-access';
import { UserForm, UserFormData } from './user-form';

export function UserCreateScreen() {
  const router = useRouter();
  const { mutateAsync: createUser } = useCreateUser();

  const handleSubmit = async (data: UserFormData) => {
    const { isActive, ...createData } = data;
    const newItem = await createUser(createData);
    router.replace(`/iam/users/${newItem._id}`);
  };

  return (
    <UserForm
      onSubmit={handleSubmit}
    />
  );
}
