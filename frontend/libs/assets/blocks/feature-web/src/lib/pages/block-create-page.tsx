import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import {
  useCreateBlock,
  BlockFormData,
} from '@rootstock/assets/blocks/blocks-data-access';
import { BlockForm } from '../block-form';
import { useDiscardWarning, PageHeader, ConfirmDiscardModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper } from '@mantine/core';

export function BlockCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orchardId = searchParams.get('orchardId') || undefined;

  // If we came from an orchard, return to that orchard. Otherwise return to block list.
  const { goBack, transitionTo } = useContextualNavigation(orchardId ? `/orchards/${orchardId}` : '/blocks');
  
  const { mutateAsync: createBlock, isPending: isCreating } = useCreateBlock();
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps, handleAction } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: BlockFormData) => {
    try {
      const newBlock = await createBlock({
        name: values.name,
        orchardId: values.orchardId || orchardId!,
        plantings: values.plantings.map(p => ({
          varietyId: p.varietyId!,
          treeCount: p.treeCount
        }))
      });
      setIsDirty(false);
      setTimeout(() => transitionTo(`/blocks/${newBlock._id}`), 0);
    } catch (error) {
      console.error('Failed to create block', error);
    }
  };

  const handleCancel = () => {
    goBack();
  };

  return (
    <Container size="xl">
      <PageHeader title="Create Block" />
      <Paper p="md" withBorder>
        <BlockForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isCreating}
          onDirtyChange={setIsDirty}
          orchardId={orchardId}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
