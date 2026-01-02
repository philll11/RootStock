import { useNavigate, useParams } from 'react-router-dom';
import { RoleForm } from '../role-form';
import { PageHeader, ConfirmDiscardModal, useDiscardWarning, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay } from '@mantine/core';
import { useState } from 'react';
import {
  useUpdateRole,
  useGetRole,
  RoleFormData
} from '@rootstock/iam/roles/roles-data-access';
import { IconAlertCircle } from '@tabler/icons-react';

export function RoleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation(`/roles/${id}`);
  const { mutateAsync: updateRole, isPending: isUpdating } = useUpdateRole();
  const { data: role, isLoading } = useGetRole(id);
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: RoleFormData) => {
    if (!id) return;
    try {
      const { __v, ...updateData } = values;
      await updateRole({ id, data: updateData });
      setIsDirty(false);
      setTimeout(() => transitionTo(`/roles/${id}`), 0);
    } catch (error) {
      console.error('Failed to update role', error);
    }
  };
  
  const handleCancel = () => {
    goBack();
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
          onCancel={handleCancel}
          isLoading={isUpdating}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
