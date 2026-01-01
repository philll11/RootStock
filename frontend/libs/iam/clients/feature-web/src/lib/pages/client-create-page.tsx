import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { 
  useCreateClient, 
  ClientFormData,
} from '@rootstock/iam/clients/clients-data-access';
import { ClientForm } from '../client-form';
import { PageHeader, ConfirmDiscardModal, useDiscardWarning, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper } from '@mantine/core';

export function ClientCreatePage() {
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation('/clients');
  const { mutateAsync: createClient, isPending: isCreating } = useCreateClient();
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: ClientFormData) => {
    try {
      const { isActive, __v, ...createData } = values;
      const newClient = await createClient(createData);
      setIsDirty(false);
      setTimeout(() => transitionTo(`/clients/${newClient._id}`), 0);
    } catch (error) {
      console.error('Failed to create client', error);
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
