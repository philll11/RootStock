import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import {
  useOrchards,
  UpdateOrchardDto,
} from '@rootstock/assets/orchards/orchards-data-access';
import { OrchardForm } from '../orchard-form';
import { useDiscardWarning, PageHeader, ConfirmDiscardModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

export function OrchardEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation('/orchards');
  const { orchard, isLoading, updateOrchard, isUpdating } = useOrchards(id);
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: any) => {
    if (!id) return;
    try {
      await updateOrchard({ id, data: values as UpdateOrchardDto });
      setIsDirty(false);
      setTimeout(() => transitionTo(`/orchards/${id}`), 0);
    } catch (error) {
      console.error('Failed to update orchard', error);
    }
  };

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (!orchard) {
    return (
      <Container size="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          Orchard not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <PageHeader title={`Edit ${orchard.name}`} />
      <Paper p="md" withBorder>
        <OrchardForm
          mode="edit"
          orchard={orchard}
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
