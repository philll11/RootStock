import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { 
  useRoles,
  CreateRoleDto,
  UpdateRoleDto
} from '@rootstock/roles/roles-data-access';
import { RoleForm } from '../role-form';
import { PageHeader, ConfirmDiscardModal, useDiscardWarning, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper } from '@mantine/core';

export function RoleCreatePage() {
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation('/roles');
  const { createRole, isCreating } = useRoles();
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: CreateRoleDto | UpdateRoleDto) => {
    try {
      const newRole = await createRole(values as CreateRoleDto);
      setIsDirty(false);
      setTimeout(() => transitionTo(`/roles/${newRole._id}`), 0);
    } catch (error) {
      console.error('Failed to create role', error);
    }
  };

  return (
    <Container size="xl">
      <PageHeader title="Create Role" />
      <Paper p="md" withBorder>
        <RoleForm
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
