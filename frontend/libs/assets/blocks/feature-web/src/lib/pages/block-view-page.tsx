import { useNavigate, useParams } from 'react-router-dom';
import {
  useBlocks,
} from '@rootstock/blocks/blocks-data-access';
import { BlockForm } from '../block-form';
import { PageHeader, ConfirmModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay, ActionIcon } from '@mantine/core';
import { IconAlertCircle, IconTrash } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { palette, iconSizes } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function BlockViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLinkTo, goBack } = useContextualNavigation('/blocks');
  const { block, isLoading, deleteBlock } = useBlocks({ blockId: id });

  const { can } = usePermission();
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const handleEdit = () => {
    navigate(getLinkTo(`/blocks/${id}/edit`));
  };

  const handleDelete = async () => {
    if (id) {
      await deleteBlock({ id });
      goBack();
    }
  };

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (!block) {
    return (
      <Container size="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          Block not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <PageHeader 
        title={block.name}
        action={
          can(PERMISSIONS.BLOCK_DELETE) && (
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
        <BlockForm
          mode="view"
          initialValues={block}
          onSubmit={() => {}}
          onCancel={() => goBack()}
          onEdit={can(PERMISSIONS.BLOCK_EDIT) ? handleEdit : undefined}
          isLoading={false}
          fullHeight={false}
        />
      </Paper>

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete Block"
        message={`Are you sure you want to delete block "${block.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </Container>
  );
}
