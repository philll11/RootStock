import { useNavigate, useParams } from 'react-router-dom';
import { ClientForm } from '../client-form';
import { useClients, useClient } from '@rootstock/clients/clients-data-access';
import { PageHeader, ConfirmModal } from '@rootstock/ui/web';
import { Container, Paper, LoadingOverlay, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTrash } from '@tabler/icons-react';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { palette, iconSizes } from '@rootstock/ui/theme';

export function ClientViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteClient } = useClients();
  const { data: client, isLoading: isClientLoading } = useClient(id);
  const { can } = usePermission();
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const handleDelete = () => {
    openDeleteModal();
  };

  const handleConfirmDelete = async () => {
    if (id) {
      await deleteClient(id);
      closeDeleteModal();
      navigate('/clients');
    }
  };

  if (isClientLoading) {
    return <LoadingOverlay visible />;
  }

  return (
    <Container size="lg">
      <PageHeader 
        title={`Client: ${client?.name}`} 
        action={
          can(PERMISSIONS.CLIENT_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.delete}
              onClick={handleDelete}
              title="Delete Client"
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )
        }
      />
      <Paper p="md" withBorder pos="relative">
        <ClientForm
          mode="view"
          client={client}
          onSubmit={() => {}}
          isLoading={false}
          onCancel={() => navigate('/clients')}
          onEdit={() => navigate(`/clients/${id}/edit`)}
          fullHeight={false}
        />
      </Paper>
      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Client"
        message={`Are you sure you want to delete client ${client?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
      />
    </Container>
  );
}
