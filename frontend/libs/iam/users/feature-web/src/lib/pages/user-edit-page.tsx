import { useNavigate, useParams } from 'react-router-dom';
import { UserForm } from '../user-form';
import { PageHeader, ConfirmDiscardModal, useDiscardWarning, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay } from '@mantine/core';
import { useState } from 'react';
import {
  useUpdateUser,
  useGetUser,
  UpdateUserDto
} from '@rootstock/iam/users/users-data-access';
import { IconAlertCircle } from '@tabler/icons-react';

export function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation(`/users/${id}`);
  const { mutateAsync: updateUser, isPending: isUpdating } = useUpdateUser();
  const { data: user, isLoading } = useGetUser(id!);
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: UpdateUserDto) => {
    if (!id) return;
    try {
      await updateUser({ id, data: values });
      setIsDirty(false);
      setTimeout(() => transitionTo(`/users/${id}`), 0);
    } catch (error) {
      console.error('Failed to update user', error);
    }
  };

  if (isLoading) {
    return <LoadingOverlay visible />;
  }
  
  if (!user) {
    return (
      <Container size="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          User not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <PageHeader title={`Edit User: ${user?.name}`} />
      <Paper p="md" withBorder>
        <UserForm
          mode="edit"
          user={user}
          onSubmit={handleSubmit}
          onCancel={() => goBack()}
          isLoading={isUpdating}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
