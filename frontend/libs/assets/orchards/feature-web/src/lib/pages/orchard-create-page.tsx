import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  useOrchards,
  CreateOrchardDto,
  UpdateOrchardDto,
} from '@rootstock/assets/orchards/orchards-data-access';
import { OrchardForm } from '../orchard-form';
import { useDiscardWarning, PageHeader, ConfirmDiscardModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper } from '@mantine/core';

export function OrchardCreatePage() {
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation('/orchards');
  const { createOrchard, isCreating } = useOrchards();
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: CreateOrchardDto | UpdateOrchardDto) => {
    try {
      const newOrchard = await createOrchard(values as CreateOrchardDto);
      setIsDirty(false);
      setTimeout(() => transitionTo(`/orchards/${newOrchard._id}`), 0);
    } catch (error) {
      console.error('Failed to create orchard', error);
    }
  };

  return (
    <Container size="xl">
      <PageHeader title="Create Orchard" />
      <Paper p="md" withBorder>
        <OrchardForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={() => goBack()}
          isLoading={isCreating}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
