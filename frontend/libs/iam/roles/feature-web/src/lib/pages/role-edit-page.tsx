import { useNavigate, useParams } from 'react-router-dom';
import { RoleForm } from '../role-form';
import { useRoles, useRole } from '@rootstock/roles/roles-data-access';
import { PageHeader, ConfirmDiscardModal, useDiscardWarning } from '@rootstock/ui/web';
import { Container, Paper, LoadingOverlay } from '@mantine/core';
import { useState } from 'react';

export function RoleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateRole, isUpdating } = useRoles();
  const { data: role, isLoading: isRoleLoading } = useRole(id);
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: any) => {
    if (!id) return;
    await updateRole({ id, data: values });
    setIsDirty(false);
    setTimeout(() => navigate(`/roles/${id}`), 0);
  };

  if (isRoleLoading) {
    return <LoadingOverlay visible />;
  }

  return (
    <Container size="lg">
      <PageHeader title={`Edit Role: ${role?.name}`} />
      <Paper p="md" withBorder pos="relative">
        <RoleForm
          mode="edit"
          role={role}
          onSubmit={handleSubmit}
          isLoading={isUpdating}
          onCancel={() => navigate(`/roles/${id}`)}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
