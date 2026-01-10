import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import {
  useCreateOrchard,
  OrchardFormData,
} from '@rootstock/assets/orchards/orchards-data-access';
import { OrchardForm } from '../orchard-form';
import { useDiscardWarning, PageHeader, ConfirmDiscardModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper } from '@mantine/core';

export function OrchardCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId') || undefined;
  
  // If we came from a client, return to that client. Otherwise return to orchard list.
  const { goBack, transitionTo } = useContextualNavigation(clientId ? `/clients/${clientId}` : '/orchards');
  const { mutateAsync: createOrchard, isPending: isCreating } = useCreateOrchard();
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: OrchardFormData) => {
    try {
      const newOrchard = await createOrchard({
        name: values.name,
        clientId: values.clientId,
        userIds: values.userIds,
      });
      setIsDirty(false);
      // Navigate to the view page of the new assessment, preserving the "returnTo" context
      // so that "Back" from the View page goes back to where we started (Client or List).
      setTimeout(() => transitionTo(`/orchards/${newOrchard._id}`), 0);
    } catch (error) {
      console.error('Failed to create orchard', error);
    }
  };

  const handleCancel = () => {
    goBack();
  };

  return (
    <Container size="xl">
      <PageHeader title="Create Orchard" />
      <Paper p="md" withBorder>
        <OrchardForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isCreating}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
