import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import {
  useBlocks,
  CreateBlockDto,
  UpdateBlockDto,
} from '@rootstock/blocks/blocks-data-access';
import { BlockForm } from '../block-form';
import { useDiscardWarning, PageHeader, ConfirmDiscardModal } from '@rootstock/ui/web';
import { Container, Paper } from '@mantine/core';

export function BlockCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orchardId = searchParams.get('orchardId') || undefined;
  
  const { createBlock, isCreating } = useBlocks(orchardId);
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: CreateBlockDto | UpdateBlockDto) => {
    try {
      const newBlock = await createBlock({ data: values as CreateBlockDto, orchardId });
      setIsDirty(false);
      setTimeout(() => navigate(`/blocks/${newBlock._id}`), 0);
    } catch (error) {
      console.error('Failed to create block', error);
    }
  };

  const handleCancel = () => {
    if (orchardId) {
      navigate(`/orchards/${orchardId}`);
    } else {
      navigate('/blocks');
    }
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
