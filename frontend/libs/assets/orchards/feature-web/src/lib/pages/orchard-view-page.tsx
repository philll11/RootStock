import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetOrchard,
  useDeleteOrchard,
} from '@rootstock/assets/orchards/orchards-data-access';
import { OrchardForm } from '../orchard-form';
import { BlocksList } from '@rootstock/assets/blocks/blocks-feature-web';
import { PageHeader, ConfirmModal, SubResourceTabs, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay, ActionIcon, Text } from '@mantine/core';
import { IconAlertCircle, IconTrash, IconLayoutGrid, IconUsers, IconHistory } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { palette, iconSizes } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function OrchardViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLinkTo, goBack } = useContextualNavigation('/orchards');
  const { data: orchard, isLoading } = useGetOrchard(id!);
  const { mutateAsync: deleteOrchard } = useDeleteOrchard();
  const { can } = usePermission();
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const handleEdit = () => {
    navigate(getLinkTo(`/orchards/${id}/edit`, { strategy: 'stack' }));
  };

  const handleDelete = async () => {
    if (id) {
      try {
        await deleteOrchard(id);
        goBack();
      } catch (error) {
        console.error('Failed to delete orchard', error);
      }
    }
  };
  
  const handleCancel = () => {
    goBack();
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
          onSubmit={() => { }}
          onCancel={handleCancel}
          onEdit={can(PERMISSIONS.ORCHARD_EDIT) ? handleEdit : undefined}
          isLoading={false}
          fullHeight={false}
        />
      </Paper>

      <SubResourceTabs
        title="Orchard Details"
        tabs={[
          {
            value: 'blocks',
            label: 'Blocks',
            icon: <IconLayoutGrid size={iconSizes.sm} />,
            content: <BlocksList orchardId={id!} />,
          },
          {
            value: 'users',
            label: 'Assigned Users',
            icon: <IconUsers size={iconSizes.sm} />,
            content: <Text p="md" c="dimmed">User assignment coming soon...</Text>,
          },
          {
            value: 'audit',
            label: 'Audit Trail',
            icon: <IconHistory size={iconSizes.sm} />,
            content: <Text p="md" c="dimmed">Audit trail coming soon...</Text>,
          },
        ]}
      />

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
