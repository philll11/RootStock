import { useNavigate } from 'react-router-dom';
import { ClientForm } from '../client-form';
import { useClients } from '@rootstock/clients/clients-data-access';
import { PageHeader, ConfirmDiscardModal, useDiscardWarning } from '@rootstock/ui/web';
import { Container, Paper } from '@mantine/core';
import { useState } from 'react';

export function ClientCreatePage() {
  const navigate = useNavigate();
  const { createClient, isCreating } = useClients();
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: any) => {
    const newClient = await createClient(values);
    setIsDirty(false);
    setTimeout(() => navigate(`/clients/${newClient._id}`), 0);
  };

  return (
    <Container size="lg">
      <PageHeader title="Create Client" />
      <Paper p="md" withBorder>
        <ClientForm
          mode="create"
          onSubmit={handleSubmit}
          isLoading={isCreating}
          onCancel={() => navigate('/clients')}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
