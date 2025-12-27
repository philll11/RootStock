import { useNavigate, useParams } from 'react-router-dom';
import { RoleForm } from '../role-form';
import { PageHeader, ConfirmDiscardModal, useDiscardWarning, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay } from '@mantine/core';
import { useState } from 'react';
import {
  useRoles,
  useRole,
  UpdateRoleDto
} from '@rootstock/roles/roles-data-access';
import { IconAlertCircle } from '@tabler/icons-react';

export function RoleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation(`/roles/${id}`);
  const { updateRole, isUpdating } = useRoles();
  const { data: role, isLoading } = useRole(id);
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: UpdateRoleDto) => {
    if (!id) return;
    try {
      await updateRole({ id, data: values });
      setIsDirty(false);
      setTimeout(() => transitionTo(`/roles/${id}`), 0);
    } catch (error) {
      console.error('Failed to update role', error);
    }
  };

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

    if (!role) {
    return (
      <Container size="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          Role not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <PageHeader title={`Edit Role: ${role?.name}`} />
      <Paper p="md" withBorder pos="relative">
        <RoleForm
          mode="edit"
          role={role}
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
