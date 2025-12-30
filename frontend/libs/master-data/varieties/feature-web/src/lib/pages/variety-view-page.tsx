import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  useGetVariety,
  useDeleteVariety,
} from '@rootstock/master-data/varieties/varieties-data-access';
import { VarietyForm } from '../variety-form';
import { PageHeader, ConfirmModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, ActionIcon, LoadingOverlay, Button, Group } from '@mantine/core';
import { IconAlertCircle, IconTrash, IconEdit } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { palette, iconSizes } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function VarietyViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: variety, isLoading } = useGetVariety(id!);
  const { mutateAsync: deleteVariety } = useDeleteVariety();
  const { getLinkTo, goBack } = useContextualNavigation('/varieties');
  const { can } = usePermission();
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const handleEdit = () => {
    navigate(getLinkTo('edit', { strategy: 'stack' }));
  };

  const handleDelete = async () => {
    if (id) {
      try {
        await deleteVariety(id);
        goBack();
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
          can(PERMISSIONS.VARIETY_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.delete}
              onClick={openDeleteModal}
              title="Delete Variety"
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )
        }
      />
      <Paper p="md" withBorder>
        <VarietyForm
          mode="view"
          initialValues={variety}
          onSubmit={() => { }}
          isLoading={false}
          onCancel={() => goBack()}
          onEdit={can(PERMISSIONS.VARIETY_EDIT) ? handleEdit : undefined}
          fullHeight={false}
        />
      </Paper>

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete Variety"
        message={`Are you sure you want to delete variety "${variety.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </Container>
  );
}
