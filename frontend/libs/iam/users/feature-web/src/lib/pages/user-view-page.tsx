import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  useUsers,
  useUser
} from '@rootstock/users/users-data-access';
import { UserForm } from '../user-form';
import { PageHeader, ConfirmModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, ActionIcon, LoadingOverlay } from '@mantine/core';
import { IconAlertCircle, IconTrash } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { palette, iconSizes } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function UserViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteUser } = useUsers();
  const { data: user, isLoading } = useUser(id);
  const { getLinkTo, goBack } = useContextualNavigation('/users');
  const { can } = usePermission();
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  
  const handleEdit = () => {
    navigate(getLinkTo('edit', { strategy: 'stack' }));
  };

  const handleDelete = async () => {
    if (id) {
      try {
        await deleteUser(id);
        goBack();
      } catch (error) {
        console.error('Failed to delete user', error);
      }
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
      <PageHeader
        title={user.name}
        action={
          can(PERMISSIONS.USER_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.delete}
              onClick={openDeleteModal}
              title="Delete User"
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )
        }
      />
      <Paper p="md" withBorder>
        <UserForm
          mode="view"
          user={user}
          onSubmit={() => { }}
          isLoading={false}
          onCancel={() => goBack()}
            onEdit={can(PERMISSIONS.USER_EDIT) ? handleEdit : undefined}
          fullHeight={false}
        />
      </Paper>
      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to delete user ${user?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </Container>
  );
}
