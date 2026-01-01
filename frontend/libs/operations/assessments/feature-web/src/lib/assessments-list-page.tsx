import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, ActionIcon, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTrash, IconEye } from '@tabler/icons-react';
import {
  DataTable,
  PageHeader,
  ConfirmModal,
  useContextualNavigation,
  DataTableColumn,
} from '@rootstock/ui/web';
import {
  useGetAssessments,
  useDeleteAssessment,
  Assessment,
} from '@rootstock/operations/assessments/assessments-data-access';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { palette, iconSizes } from '@rootstock/ui/theme';
import { AssessmentStatusBadge } from './assessment-status-badge';

export function AssessmentListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const blockId = searchParams.get('blockId') || undefined;
  const { getLinkTo } = useContextualNavigation();
  
  const { data: assessments, isLoading } = useGetAssessments({ blockId });
  const { mutateAsync: deleteAssessment } = useDeleteAssessment();
  const { can } = usePermission();

  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, assessment: Assessment) => {
    e.stopPropagation();
    setSelectedAssessment(assessment);
    openDeleteModal();
  };

  const handleConfirmDelete = async () => {
    if (selectedAssessment) {
      await deleteAssessment(selectedAssessment._id);
      closeDeleteModal();
      setSelectedAssessment(null);
    }
  };

  const columns: DataTableColumn<Assessment>[] = useMemo(() => [
    { accessor: 'recordId', title: 'ID' },
    { 
      accessor: 'date', 
      title: 'Date', 
      render: (record: Assessment) => new Date(record.date).toLocaleDateString() 
    },
    { 
      accessor: 'status', 
      title: 'Status', 
      render: (record: Assessment) => <AssessmentStatusBadge status={record.status} /> 
    },
    { 
      accessor: 'summary.averageDamagePercentage', 
      title: 'Damage %', 
      render: (record: Assessment) => `${record.summary.averageDamagePercentage}%` 
    },
    {
      accessor: 'actions',
      title: 'Actions',
      align: 'right',
      render: (record: Assessment) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          {can(PERMISSIONS.ASSESSMENT_VIEW) && (
            <ActionIcon
              variant="subtle"
              color={palette.neutral[500]}
              onClick={(e) => {
                e.stopPropagation();
                navigate(getLinkTo(`/assessments/${record._id}`));
              }}
            >
              <IconEye size={iconSizes.md} />
            </ActionIcon>
          )}
          {can(PERMISSIONS.ASSESSMENT_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.delete}
              onClick={(e) => handleDeleteClick(e, record)}
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )}
        </Group>
      ),
    },
  ], [can, navigate, getLinkTo]);

  return (
    <>
      <PageHeader 
        title="Assessments" 
        action={
          can(PERMISSIONS.ASSESSMENT_CREATE) && (
            <Button 
              leftSection={<IconPlus size={iconSizes.sm} />}
              onClick={() => navigate(getLinkTo(blockId ? `/assessments/create?blockId=${blockId}` : '/assessments/create'))}
            >
              New Assessment
            </Button>
          )
        }
      />
      <DataTable
        data={assessments || []}
        columns={columns}
        isLoading={isLoading}
        onRowClick={(record) => navigate(getLinkTo(`/assessments/${record._id}`))}
      />

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Assessment"
        message={`Are you sure you want to delete assessment ${selectedAssessment?.recordId}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </>
  );
}
