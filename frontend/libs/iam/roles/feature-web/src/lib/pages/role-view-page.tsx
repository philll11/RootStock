import { useNavigate, useParams } from 'react-router-dom';
import { RoleForm } from '../role-form';
import { useRoles, useRole } from '@rootstock/roles/roles-data-access';
import { PageHeader, ConfirmModal } from '@rootstock/ui/web';
import { Container, Paper, LoadingOverlay, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash } from '@tabler/icons-react';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { palette, iconSizes } from '@rootstock/ui/theme';

export function RoleViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteRole } = useRoles();
  const { data: role, isLoading: isRoleLoading } = useRole(id);
  const { can } = usePermission();
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const handleDelete = () => {
    openDeleteModal();
  };

  const handleConfirmDelete = async () => {
    if (id) {
      await deleteRole(id);
      closeDeleteModal();
      navigate('/roles');
    }
  };

  if (isRoleLoading) {
    return <LoadingOverlay visible />;
  }

  return (
    <Container size="lg">
      <PageHeader 
        title={`Role: ${role?.name}`} 
        action={
          can(PERMISSIONS.ROLE_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.delete}
              onClick={handleDelete}
              title="Delete Role"
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )
        }
      />
      <Paper p="md" withBorder pos="relative">
        <RoleForm
          mode="view"
          role={role}
          onSubmit={() => {}}
          isLoading={false}
          onCancel={() => navigate('/roles')}
          onEdit={() => navigate(`/roles/${id}/edit`)}
          fullHeight={false}
        />
      </Paper>
      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Role"
        message={`Are you sure you want to delete role ${role?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
      />
    </Container>
  );
}
