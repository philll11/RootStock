import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  useCreateUser,
  UserFormData,
} from '@rootstock/iam/users/users-data-access';
import { UserForm } from '../user-form';
import { PageHeader, ConfirmDiscardModal, useDiscardWarning, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper } from '@mantine/core';

export function UserCreatePage() {
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation('/users');
  const { mutateAsync: createUser, isPending: isCreating } = useCreateUser();
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: UserFormData) => {
    try {
      const { isActive, __v, ...createData } = values;
      const newUser = await createUser(createData);
      setIsDirty(false);
      setTimeout(() => transitionTo(`/users/${newUser._id}`), 0);
    } catch (error) {
      console.error('Failed to create user', error);
    }
  };
  
  const handleCancel = () => {
    goBack();
  };

  return (
    <Container size="xl">
      <PageHeader title="Create User" />
      <Paper p="md" withBorder>
        <UserForm
          mode="create"
          onSubmit={handleSubmit}
          isLoading={isCreating}
          onCancel={handleCancel}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
