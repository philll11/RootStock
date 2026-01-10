import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import {
  useGetBlock,
  useUpdateBlock,
  BlockFormData,
} from '@rootstock/assets/blocks/blocks-data-access';
import { BlockForm } from '../block-form';
import { useDiscardWarning, PageHeader, ConfirmDiscardModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

export function BlockEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation('/blocks');

  const { data: block, isLoading } = useGetBlock(id!);
  const { mutateAsync: updateBlock, isPending: isUpdating } = useUpdateBlock();

  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: BlockFormData) => {
    if (!id || !block) return;
    try {
      await updateBlock({
        id,
        data: {
          name: values.name,
          isActive: values.isActive,
          plantings: values.plantings.map((p: any) => ({
            _id: p._id,
            varietyId: p.varietyId!,
            treeCount: p.treeCount
          })),
          __v: block.__v
        }
      });
      setIsDirty(false);
      setTimeout(() => transitionTo(`/blocks/${id}`), 0);
    } catch (error) {
      console.error('Failed to update block', error);
    }
  };

  const handleCancel = () => {
    goBack();
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
      <PageHeader title={`Edit ${block.name}`} />
      <Paper p="md" withBorder>
        <BlockForm
          mode="edit"
          block={block}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isUpdating}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
