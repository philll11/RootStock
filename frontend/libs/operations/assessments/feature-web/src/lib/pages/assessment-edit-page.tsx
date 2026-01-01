import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import {
  useGetAssessment,
  useUpdateAssessment,
  UpdateAssessmentDto,
} from '@rootstock/operations/assessments/assessments-data-access';
import { AssessmentForm } from '../assessment-form';
import { useDiscardWarning, PageHeader, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

export function AssessmentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { goBack, transitionTo } = useContextualNavigation('/assessments');
  
  const { data: assessment, isLoading } = useGetAssessment(id!);
  const { mutateAsync: updateAssessment, isPending: isUpdating } = useUpdateAssessment();

  const [isDirty, setIsDirty] = useState(false);

  useDiscardWarning(isDirty);

  const handleSubmit = async (values: any) => {
    if (!id) return;
    try {
      await updateAssessment({ id, dto: values as UpdateAssessmentDto });
      setIsDirty(false);
      setTimeout(() => transitionTo(`/assessments/${id}`), 0);
    } catch (error) {
      console.error('Failed to update assessment', error);
    }
  };

  const handleCancel = () => {
    goBack();
  };

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (!assessment) {
    return (
      <Container size="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          Assessment not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <PageHeader title={`Edit Assessment ${assessment.recordId}`} />
      <Paper p="md" withBorder>
        <AssessmentForm
          mode="edit"
          assessment={assessment}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isUpdating}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
    </Container>
  );
}
