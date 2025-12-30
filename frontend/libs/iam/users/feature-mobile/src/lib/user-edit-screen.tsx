import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetUser, useUpdateUser } from '@rootstock/iam/users/users-data-access';
import { ResourceEditLayout } from '@rootstock/ui/mobile';
import { UserForm, UserFormData } from './user-form';

export function UserEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: user, isLoading, isError: error } = useGetUser(id!);
  const { mutateAsync: updateUser, isPending: isUpdating } = useUpdateUser();

  const handleSubmit = async (data: UserFormData) => {
    await updateUser({ 
      id: id!, 
      data: { ...data, __v: user?.__v } 
    });
    router.back();
  };

  const defaultValues: Partial<UserFormData> | undefined = user ? {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    userType: user.userType,
    roleId: typeof user.roleId === 'object' ? user.roleId?._id : user.roleId,
    clientIds: user.clientIds?.map((c: any) => (typeof c === 'object' ? c._id : c)) || [],
    isActive: user.isActive,
  } : undefined;

  return (
    <ResourceEditLayout
      isLoading={isLoading}
      error={error || !user}
      title="Edit User"
    >
      {user && (
        <UserForm
          isEditMode
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isSubmitting={isUpdating}
        />
      )}
    </ResourceEditLayout>
  );
}
