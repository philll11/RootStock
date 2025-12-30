import { useNavigate, useParams } from 'react-router-dom';
import { VarietyForm } from '../variety-form';
import { PageHeader, ConfirmDiscardModal, useDiscardWarning, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay } from '@mantine/core';
import { useState } from 'react';
import {
  useGetVariety,
  useUpdateVariety,
  UpdateVarietyDto,
} from '@rootstock/master-data/varieties/varieties-data-access';
import { IconAlertCircle } from '@tabler/icons-react';

export function VarietyEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation(`/varieties/${id}`);
  const { data: variety, isLoading } = useGetVariety(id!);
  const { mutateAsync: updateVariety, isPending: isUpdating } = useUpdateVariety();
  const [isDirty, setIsDirty] = useState(false);

  const { modalProps } = useDiscardWarning(isDirty);

  const handleSubmit = async (values: any) => {
    if (!id) return;
    try {
      await updateVariety({ id, data: values as UpdateVarietyDto });
      setIsDirty(false);
      setTimeout(() => transitionTo(`/varieties/${id}`), 0);
    } catch (error) {
      console.error('Failed to update variety', error);
    }
  };

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (!variety) {
    return (
      <Container size="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          Variety not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <PageHeader title={`Edit ${variety.name}`} />
      <Paper p="md" withBorder>
        <VarietyForm
          mode="edit"
          initialValues={variety}
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
