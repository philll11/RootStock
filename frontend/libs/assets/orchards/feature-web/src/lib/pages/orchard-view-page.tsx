import { useNavigate, useParams } from 'react-router-dom';
import {
  useOrchards,
} from '@rootstock/orchards/orchards-data-access';
import { OrchardForm } from '../orchard-form';
import { PageHeader, ConfirmModal } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay, ActionIcon } from '@mantine/core';
import { IconAlertCircle, IconTrash } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { palette, iconSizes } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function OrchardViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orchard, isLoading, deleteOrchard } = useOrchards(id);
  const { can } = usePermission();
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const handleEdit = () => {
    navigate(`/orchards/${id}/edit`);
  };

  const handleDelete = async () => {
    if (id) {
      await deleteOrchard(id);
      navigate('/orchards');
    }
  };

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (!orchard) {
    return (
      <Container size="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          Orchard not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <PageHeader 
        title={orchard.name}
        action={
          can(PERMISSIONS.ORCHARD_DELETE) && (
            <ActionIcon 
              variant="subtle" 
              color={palette.actions.delete} 
              onClick={openDeleteModal}
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )
        }
      />
      <Paper p="md" withBorder>
        <OrchardForm
          mode="view"
          orchard={orchard}
          onSubmit={() => {}}
          onCancel={() => navigate('/orchards')}
          onEdit={can(PERMISSIONS.ORCHARD_EDIT) ? handleEdit : undefined}
          isLoading={false}
          fullHeight={false}
        />
      </Paper>

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete Orchard"
        message={`Are you sure you want to delete orchard "${orchard.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </Container>
  );
}
