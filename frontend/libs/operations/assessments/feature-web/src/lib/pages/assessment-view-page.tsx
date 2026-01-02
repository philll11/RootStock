import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetAssessment,
  useDeleteAssessment,
} from '@rootstock/operations/assessments/assessments-data-access';
import { AssessmentForm } from '../assessment-form';
import { PageHeader, ConfirmModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay, ActionIcon } from '@mantine/core';
import { IconAlertCircle, IconTrash } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { palette, iconSizes, spacing } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function AssessmentViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLinkTo, goBack } = useContextualNavigation('/assessments');
  const { data: assessment, isLoading } = useGetAssessment(id!);
  const { mutateAsync: deleteAssessment } = useDeleteAssessment();

  const { can } = usePermission();
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const handleEdit = () => {
    navigate(getLinkTo(`/assessments/${id}/edit`, { strategy: 'stack' }));
  };

  const handleDelete = async () => {
    if (id) {
      await deleteAssessment(id);
      goBack();
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
      <PageHeader 
        title={assessment.name}
        action={
          can(PERMISSIONS.ASSESSMENT_DELETE) && (
            <ActionIcon 
              variant="subtle" 
              color={palette.actions.delete} 
              onClick={openDeleteModal}
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )
        }
      />
      
      <Paper p="md" withBorder>
        <AssessmentForm
          mode="view"
          assessment={assessment}
          onSubmit={() => {}}
          onCancel={handleCancel}
          onEdit={can(PERMISSIONS.ASSESSMENT_EDIT) ? handleEdit : undefined}
          isLoading={false}
          fullHeight={false}
        />
      </Paper>

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete Assessment"
        message={`Are you sure you want to delete assessment ${assessment.recordId}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </Container>
  );
}
