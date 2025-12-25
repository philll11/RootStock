import { useNavigate, useParams } from 'react-router-dom';
import {
  useVarieties,
} from '@rootstock/master-data/varieties/varieties-data-access';
import { VarietyForm } from '../variety-form';
import { PageHeader, ConfirmModal } from '@rootstock/ui/web';
import { Container, Paper, Alert, ActionIcon, LoadingOverlay } from '@mantine/core';
import { IconAlertCircle, IconTrash } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { palette, iconSizes } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function VarietyViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { variety, isLoading, deleteVariety } = useVarieties(id);
  const { can } = usePermission();
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const handleEdit = () => {
    navigate(`/varieties/${id}/edit`);
  };

  const handleDelete = async () => {
    if (id) {
      try {
        await deleteVariety({ id });
        navigate('/varieties');
      } catch (error) {
        console.error('Failed to delete variety', error);
      }
    }
  };

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (!variety) {
    return (
      <Container size="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          Variety not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <PageHeader
        title={variety.name}
        action={
          can(PERMISSIONS.VARIETY_DELETE) ? (
            <ActionIcon
              variant="subtle"
              color={palette.actions.delete}
              onClick={openDeleteModal}
            >
              <IconTrash size={iconSizes.lg} />
            </ActionIcon>
          ) : undefined
        }
      />
      <Paper p="md" withBorder>
        <VarietyForm
          mode="view"
          initialValues={variety}
          onSubmit={() => {}}
          onCancel={() => navigate('/varieties')}
          onEdit={can(PERMISSIONS.VARIETY_EDIT) ? handleEdit : undefined}
          fullHeight={false}
        />
      </Paper>

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete Variety"
        message="Are you sure you want to delete this variety? This action cannot be undone."
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </Container>
  );
}
