import { useNavigate, useParams } from 'react-router-dom';
import { UserForm } from '../user-form';
import { useUsers, useUser } from '@rootstock/users/users-data-access';
import { PageHeader, ConfirmModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, LoadingOverlay, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash } from '@tabler/icons-react';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { palette, iconSizes } from '@rootstock/ui/theme';

export function UserViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLinkTo, goBack } = useContextualNavigation('/users');
  const { deleteUser } = useUsers();
  const { data: user, isLoading: isUserLoading } = useUser(id);
  const { can } = usePermission();
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const handleDelete = () => {
    openDeleteModal();
  };

  const handleConfirmDelete = async () => {
    if (id) {
      await deleteUser(id);
      closeDeleteModal();
      goBack();
    }
  };

  if (isUserLoading) {
    return <LoadingOverlay visible />;
  }

  return (
    <Container size="lg">
      <PageHeader 
        title={`User: ${user?.name}`} 
        action={
          can(PERMISSIONS.USER_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.delete}
              onClick={handleDelete}
              title="Delete User"
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )
        }
      />
      <Paper p="md" withBorder pos="relative">
        <UserForm
          mode="view"
          user={user}
          onSubmit={() => {}}
          isLoading={false}
          onCancel={() => goBack()}
          onEdit={() => navigate(getLinkTo(`/users/${id}/edit`, { strategy: 'stack' }))}
          fullHeight={false}
        />
      </Paper>
      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete user ${user?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
      />
    </Container>
  );
}
