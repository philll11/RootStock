import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  useVarieties,
  CreateVarietyDto,
  UpdateVarietyDto,
} from '@rootstock/master-data/varieties/varieties-data-access';
import { VarietyForm } from '../variety-form';
import { useDiscardWarning, PageHeader, ConfirmDiscardModal } from '@rootstock/ui/web';
import { Container, Paper } from '@mantine/core';

export function VarietyCreatePage() {
  const navigate = useNavigate();
  const { createVariety, isCreating } = useVarieties();
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: CreateVarietyDto | UpdateVarietyDto) => {
    try {
      const newVariety = await createVariety(values as CreateVarietyDto);
      setIsDirty(false);
      setTimeout(() => navigate(`/varieties/${newVariety._id}`), 0);
    } catch (error) {
      console.error('Failed to create variety', error);
    }
  };

  return (
    <Container size="xl">
      <PageHeader title="Create Variety" />
      <Paper p="md" withBorder>
        <VarietyForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={() => navigate('/varieties')}
          isLoading={isCreating}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
