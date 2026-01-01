import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  useCreateVariety,
  VarietyFormData,
} from '@rootstock/master-data/varieties/varieties-data-access';
import { VarietyForm } from '../variety-form';
import { useDiscardWarning, PageHeader, ConfirmDiscardModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper } from '@mantine/core';

export function VarietyCreatePage() {
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation('/varieties');
  const { mutateAsync: createVariety, isPending: isCreating } = useCreateVariety();
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: VarietyFormData) => {
    try {
      const { isActive, __v, ...createData } = values;
      const newVariety = await createVariety(createData);
      setIsDirty(false);
      setTimeout(() => transitionTo(`/varieties/${newVariety._id}`), 0);
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
          isLoading={isCreating}
          onCancel={() => goBack()}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
