import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetAssessment,
  useDeleteAssessment,
} from '@rootstock/operations/assessments/assessments-data-access';
import { AssessmentForm } from '../assessment-form';
import { PageHeader, ConfirmModal, useContextualNavigation } from '@rootstock/ui/web';
import { Container, Paper, Alert, LoadingOverlay, ActionIcon, Grid, Card, Title, Stack, Group, Text } from '@mantine/core';
import { IconAlertCircle, IconTrash, IconEdit } from '@tabler/icons-react';
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
        title={`Assessment ${assessment.recordId}`}
        action={
          <Group gap="xs">
            {can(PERMISSIONS.ASSESSMENT_EDIT) && (
              <ActionIcon 
                variant="subtle" 
                color={palette.actions.edit} 
                onClick={handleEdit}
              >
                <IconEdit size={iconSizes.md} />
              </ActionIcon>
            )}
            {can(PERMISSIONS.ASSESSMENT_DELETE) && (
              <ActionIcon 
                variant="subtle" 
                color={palette.actions.delete} 
                onClick={openDeleteModal}
              >
                <IconTrash size={iconSizes.md} />
              </ActionIcon>
            )}
          </Group>
        }
      />
      
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper p="md" withBorder>
            <AssessmentForm
              mode="view"
              assessment={assessment}
              onSubmit={() => {}}
              onCancel={() => goBack()}
              isLoading={false}
              fullHeight={false}
            />
          </Paper>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder padding="md" radius="md">
            <Title order={4} mb="md">Summary Results</Title>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">Total Samples</Text>
                <Text fw={700}>{assessment.summary.totalSamples}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Total Fruit</Text>
                <Text fw={700}>{assessment.summary.totalFruit}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Total Damaged</Text>
                <Text fw={700} c="red">{assessment.summary.totalDamaged}</Text>
              </Group>
              <Group justify="space-between" mt="xs">
                <Text size="lg" fw={500}>Damage %</Text>
                <Text size="xl" fw={700} c="red">
                  {assessment.summary.averageDamagePercentage}%
                </Text>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

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
