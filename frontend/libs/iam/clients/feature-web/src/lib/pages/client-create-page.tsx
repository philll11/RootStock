import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { 
  useClients, 
  CreateClientDto,
  UpdateClientDto,
} from '@rootstock/clients/clients-data-access';
import { ClientForm } from '../client-form';
import { PageHeader, ConfirmDiscardModal, useDiscardWarning, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper } from '@mantine/core';

export function ClientCreatePage() {
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation('/clients');
  const { createClient, isCreating } = useClients();
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: CreateClientDto | UpdateClientDto) => {
    try {
    const newClient = await createClient(values as CreateClientDto);
      setIsDirty(false);
      setTimeout(() => transitionTo(`/clients/${newClient._id}`), 0);
    } catch (error) {
      console.error('Failed to create variety', error);
    }
  };

  return (
    <Container size="xl">
      <PageHeader title="Create Client" />
      <Paper p="md" withBorder>
        <ClientForm
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
