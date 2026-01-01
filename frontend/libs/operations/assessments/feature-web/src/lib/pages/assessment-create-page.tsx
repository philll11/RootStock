import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { Container, Paper } from '@mantine/core';
import {
  useCreateAssessment,
  CreateAssessmentDto,
  UpdateAssessmentDto,
} from '@rootstock/operations/assessments/assessments-data-access';
import { AssessmentForm } from '../assessment-form';
import {
  useDiscardWarning,
  PageHeader,
  useContextualNavigation,
} from '@rootstock/ui/web';

export function AssessmentCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const blockId = searchParams.get('blockId');
  
  // If we came from a block, return to that block. Otherwise return to assessment list.
  const { goBack, transitionTo } = useContextualNavigation(blockId ? `/blocks/${blockId}` : '/assessments');

  const { mutateAsync: createAssessment, isPending: isCreating } = useCreateAssessment();
  const [isDirty, setIsDirty] = useState(false);

  useDiscardWarning(isDirty);

  if (!blockId) {
    return <div>Error: Block ID is required to create an assessment.</div>;
  }

  const handleSubmit = async (values: CreateAssessmentDto | UpdateAssessmentDto) => {
    try {
      const newAssessment = await createAssessment(values as CreateAssessmentDto);
      setIsDirty(false);
      // Navigate to the view page of the new assessment, preserving the "returnTo" context
      // so that "Back" from the View page goes back to where we started (Block or List).
      setTimeout(() => transitionTo(`/assessments/${newAssessment._id}`), 0);
    } catch (error) {
      console.error('Failed to create assessment', error);
    }
  };

  const handleCancel = () => {
    goBack();
  };

  return (
    <Container size="xl">
      <PageHeader title="New Assessment" />
      <Paper p="md" withBorder>
        <AssessmentForm
          mode="create"
          blockId={blockId}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isCreating}
          onDirtyChange={setIsDirty}
          fullHeight={false}
        />
      </Paper>
    </Container>
  );
}
