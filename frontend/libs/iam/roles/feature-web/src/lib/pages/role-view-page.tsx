import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  useDeleteRole,
  useGetRole
} from '@rootstock/iam/roles/roles-data-access';
import { RoleForm } from '../role-form';
import { PageHeader, ConfirmModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, ActionIcon, LoadingOverlay } from '@mantine/core';
import { IconAlertCircle, IconTrash } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { palette, iconSizes } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function RoleViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mutateAsync: deleteRole } = useDeleteRole();
  const { data: role, isLoading } = useGetRole(id);
  const { getLinkTo, goBack } = useContextualNavigation('/roles');
  const { can } = usePermission();
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const handleEdit = () => {
    navigate(getLinkTo('edit', { strategy: 'stack' }));
  };

  const handleDelete = async () => {
    if (id) {
      try {
        await deleteRole(id);
        goBack();
      } catch (error) {
        console.error('Failed to delete role', error);
      }
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
    <Container size="xl">
      <PageHeader
        title={role.name}
        action={
          can(PERMISSIONS.ROLE_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.icons.delete}
              onClick={openDeleteModal}
              title="Delete Role"
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )
        }
      />
      <Paper p="md" withBorder>
        <RoleForm
          mode="view"
          role={role}
          onSubmit={() => { }}
          isLoading={false}
          onCancel={handleCancel}
            onEdit={can(PERMISSIONS.ROLE_EDIT) ? handleEdit : undefined}
          fullHeight={false}
        />
      </Paper>
      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete Role"
        message={`Are you sure you want to delete role "${role?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.icons.delete}
      />
    </Container>
  );
}
