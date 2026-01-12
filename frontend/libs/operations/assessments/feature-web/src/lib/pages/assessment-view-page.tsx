import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetAssessment,
  useDeleteAssessment,
  useUpdateAssessment,
  useReopenAssessment,
  AssessmentStatus,
} from '@rootstock/operations/assessments/assessments-data-access';
import { AssessmentForm } from '../assessment-form';
import { PageHeader, ConfirmModal, useContextualNavigation, SubResourceTabs } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay, ActionIcon, Text, Group, Button, Modal, Textarea } from '@mantine/core';
import { IconAlertCircle, IconTrash, IconLock, IconLockOpen, IconHistory } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { palette, iconSizes } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { AuditTable } from '@rootstock/system/audit/audit-feature-web';

export function AssessmentViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLinkTo, goBack } = useContextualNavigation('/assessments');
  const { data: assessment, isLoading } = useGetAssessment(id!);
  const { mutateAsync: deleteAssessment } = useDeleteAssessment();
  const { mutateAsync: updateAssessment } = useUpdateAssessment();
  const { reopenAssessment } = useReopenAssessment();

  const { can } = usePermission();
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [finalizeModalOpened, { open: openFinalizeModal, close: closeFinalizeModal }] = useDisclosure(false);
  const [reopenModalOpened, { open: openReopenModal, close: closeReopenModal }] = useDisclosure(false);
  const [reopenReason, setReopenReason] = useState('');

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

  const handleFinalize = async () => {
    if (assessment) {
      await updateAssessment({ id: assessment._id, data: { status: AssessmentStatus.COMPLETED, __v: assessment.__v } });
      closeFinalizeModal();
    }
  };

  const handleReopen = async () => {
    if (assessment && reopenReason) {
      await reopenAssessment(assessment._id, reopenReason, assessment.__v);
      setReopenReason('');
      closeReopenModal();
    }
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

  const isCompleted = assessment.status === AssessmentStatus.COMPLETED;

  return (
    <Container size="xl">
      <PageHeader 
        title={assessment.name}
        action={
          <Group>
             {!isCompleted && can(PERMISSIONS.ASSESSMENT_EDIT) && (
                <Button 
                  leftSection={<IconLock size={iconSizes.sm} />} 
                  onClick={openFinalizeModal}
                >
                  Finalize
                </Button>
             )}
             {isCompleted && can(PERMISSIONS.ASSESSMENT_EDIT) && (
                <Button 
                  variant="outline" 
                  leftSection={<IconLockOpen size={iconSizes.sm} />} 
                  onClick={openReopenModal}
                >
                  Reopen
                </Button>
             )}
             {!isCompleted && can(PERMISSIONS.ASSESSMENT_DELETE) && (
              <ActionIcon 
                variant="subtle" 
                color={palette.icons.delete} 
                onClick={openDeleteModal}
              >
                <IconTrash size={iconSizes.md} />
              </ActionIcon>
            )}
          </Group>
        }
      />
      
      <Paper p="md" withBorder>
        <AssessmentForm
          mode="view"
          assessment={assessment}
          onSubmit={() => {}}
          onCancel={handleCancel}
          onEdit={!isCompleted && can(PERMISSIONS.ASSESSMENT_EDIT) ? handleEdit : undefined}
          isLoading={false}
          fullHeight={false}
          isLocked={isCompleted}
        />
      </Paper>

      <SubResourceTabs
        title="Related Info"
        tabs={[
          ...(can(PERMISSIONS.AUDIT_VIEW) ? [{
            value: 'audit',
            label: 'Audit Trail',
            icon: <IconHistory size={iconSizes.sm} />,
            content: <AuditTable resource="Assessment" recordId={id!} />,
          }] : []),
        ]}
      />

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete Assessment"
        message={`Are you sure you want to delete assessment ${assessment.recordId}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.icons.delete}
      />

      <ConfirmModal
        opened={finalizeModalOpened}
        onClose={closeFinalizeModal}
        onConfirm={handleFinalize}
        title="Finalize Assessment"
        message="Are you sure you want to finalize this assessment? It will be locked and cannot be edited without reopening."
        confirmLabel="Finalize"
      />

      <Modal opened={reopenModalOpened} onClose={closeReopenModal} title="Reopen Assessment">
        <Textarea
          label="Reason for Reopening"
          placeholder="Please provide a reason..."
          required
          value={reopenReason}
          onChange={(event) => setReopenReason(event.currentTarget.value)}
          minRows={3}
          mb="md"
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={closeReopenModal}>Cancel</Button>
          <Button onClick={handleReopen} disabled={!reopenReason.trim()}>Reopen</Button>
        </Group>
      </Modal>
    </Container>
  );
}
