import { useNavigate } from 'react-router-dom';
import { UserForm } from '../user-form';
import { useUsers } from '@rootstock/users/users-data-access';
import { PageHeader, ConfirmDiscardModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper } from '@mantine/core';
import { useDiscardWarning } from '@rootstock/ui/web';
import { useState } from 'react';

export function UserCreatePage() {
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation('/users');
  const { createUser, isCreating } = useUsers();
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: any) => {
    const newUser = await createUser(values);
    setIsDirty(false);
    setTimeout(() => transitionTo(`/users/${newUser._id}`), 0);
  };

  return (
    <Container size="lg">
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
