import { useNavigate, useParams } from 'react-router-dom';
import { ClientForm } from '../client-form';
import { useClients, useClient } from '@rootstock/clients/clients-data-access';
import { PageHeader, ConfirmDiscardModal, useDiscardWarning, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, LoadingOverlay } from '@mantine/core';
import { useState } from 'react';

export function ClientEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation('/clients');
  const { updateClient, isUpdating } = useClients();
  const { data: client, isLoading: isClientLoading } = useClient(id);
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: any) => {
    if (!id) return;
    await updateClient({ id, data: values });
    setIsDirty(false);
    setTimeout(() => transitionTo(`/clients/${id}`), 0);
  };

  if (isClientLoading) {
    return <LoadingOverlay visible />;
  }

  return (
    <Container size="lg">
      <PageHeader title={`Edit Client: ${client?.name}`} />
      <Paper p="md" withBorder pos="relative">
        <ClientForm
          mode="edit"
          client={client}
          onSubmit={handleSubmit}
          isLoading={isUpdating}
          onCancel={() => goBack()}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
