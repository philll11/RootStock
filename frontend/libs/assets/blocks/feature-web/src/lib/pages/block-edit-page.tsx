import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import {
  useBlocks,
  UpdateBlockDto,
} from '@rootstock/blocks/blocks-data-access';
import { BlockForm } from '../block-form';
import { useDiscardWarning, PageHeader, ConfirmDiscardModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

export function BlockEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation(`/blocks/${id}`);
  
  const { block, isLoading, updateBlock, isUpdating } = useBlocks({ blockId: id });

  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: any) => {
    if (!id) return;
    try {
      await updateBlock({ id, data: values as UpdateBlockDto });
      setIsDirty(false);
      setTimeout(() => transitionTo(`/blocks/${id}`), 0);
    } catch (error) {
      console.error('Failed to update block', error);
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
      <PageHeader title={`Edit ${block.name}`} />
      <Paper p="md" withBorder>
        <BlockForm
          mode="edit"
          initialValues={block}
          onSubmit={handleSubmit}
          onCancel={() => transitionTo(`/blocks/${id}`)}
          isLoading={isUpdating}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
