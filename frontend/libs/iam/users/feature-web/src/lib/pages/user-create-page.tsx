import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  useUsers,
  CreateUserDto,
  UpdateUserDto
} from '@rootstock/iam/users/users-data-access';
import { UserForm } from '../user-form';
import { PageHeader, ConfirmDiscardModal, useDiscardWarning, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper } from '@mantine/core';

export function UserCreatePage() {
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation('/users');
  const { createUser, isCreating } = useUsers();
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: CreateUserDto | UpdateUserDto) => {
    try {
      const newUser = await createUser(values as CreateUserDto);
      setIsDirty(false);
      setTimeout(() => transitionTo(`/users/${newUser._id}`), 0);
    } catch (error) {
      console.error('Failed to create user', error);
    }
  };

  return (
    <Container size="xl">
      <PageHeader title="Create User" />
      <Paper p="md" withBorder>
        <UserForm
          mode="create"
          onSubmit={handleSubmit}
          isLoading={isCreating}
          onCancel={() => goBack()}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
