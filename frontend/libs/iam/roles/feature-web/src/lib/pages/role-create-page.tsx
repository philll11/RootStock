import { useNavigate } from 'react-router-dom';
import { RoleForm } from '../role-form';
import { useRoles } from '@rootstock/roles/roles-data-access';
import { PageHeader, ConfirmDiscardModal, useDiscardWarning } from '@rootstock/ui/web';
import { Container, Paper } from '@mantine/core';
import { useState } from 'react';

export function RoleCreatePage() {
  const navigate = useNavigate();
  const { createRole, isCreating } = useRoles();
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: any) => {
    const newRole = await createRole(values);
    setIsDirty(false);
    setTimeout(() => navigate(`/roles/${newRole._id}`), 0);
  };

  return (
    <Container size="lg">
      <PageHeader title="Create Role" />
      <Paper p="md" withBorder>
        <RoleForm
          mode="create"
          onSubmit={handleSubmit}
          isLoading={isCreating}
          onCancel={() => navigate('/roles')}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
