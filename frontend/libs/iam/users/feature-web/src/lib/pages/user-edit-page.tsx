import { useNavigate, useParams } from 'react-router-dom';
import { UserForm } from '../user-form';
import { useUsers, useUser } from '@rootstock/users/users-data-access';
import { PageHeader, ConfirmDiscardModal } from '@rootstock/ui/web';
import { Container, Paper, LoadingOverlay } from '@mantine/core';
import { useDiscardWarning } from '@rootstock/ui/web';
import { useState } from 'react';

export function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateUser, isUpdating } = useUsers();
  const { data: user, isLoading: isUserLoading } = useUser(id);
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: any) => {
    if (!id) return;
    await updateUser({ id, data: values });
    setIsDirty(false);
    // Use setTimeout to allow the state update to process before navigation
    // This prevents the discard warning from triggering
    setTimeout(() => navigate(`/users/${id}`), 0);
  };

  if (isUserLoading) {
    return <LoadingOverlay visible />;
  }

  return (
    <Container size="lg">
      <PageHeader title={`Edit User: ${user?.name}`} />
      <Paper p="md" withBorder pos="relative">
        <UserForm
          mode="edit"
          user={user}
          onSubmit={handleSubmit}
          isLoading={isUpdating}
          onCancel={() => navigate(`/users/${id}`)}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
