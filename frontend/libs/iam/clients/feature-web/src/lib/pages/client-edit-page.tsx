import { useNavigate, useParams } from 'react-router-dom';
import { ClientForm } from '../client-form';
import { PageHeader, ConfirmDiscardModal, useDiscardWarning, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay } from '@mantine/core';
import { useState } from 'react';
import {
  useUpdateClient,
  useGetClient,
  ClientFormData
} from '@rootstock/iam/clients/clients-data-access';
import { IconAlertCircle } from '@tabler/icons-react';

export function ClientEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation(`/clients/${id}`);
  const { mutateAsync: updateClient, isPending: isUpdating } = useUpdateClient();
  const { data: client, isLoading } = useGetClient(id);
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: ClientFormData) => {
    if (!id || !client) return;
    try {
      const { subsidiaryId, ...updateData } = values;
      await updateClient({ 
        id, 
        data: {
          ...updateData,
          __v: client.__v
        } 
      });
      setIsDirty(false);
      setTimeout(() => transitionTo(`/clients/${id}`), 0);
    } catch (error) {
      console.error('Failed to update client', error);
    }
  };

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (!client) {
    return (
      <Container size="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          Client not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <PageHeader title={`Edit Client: ${client?.name}`} />
      <Paper p="md" withBorder>
        <ClientForm
          mode="edit"
          client={client}
          onSubmit={handleSubmit}
          onCancel={() => goBack()}
          isLoading={isUpdating}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
      <ConfirmDiscardModal {...modalProps} />
    </Container>
  );
}
