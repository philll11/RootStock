import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Group, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconEye, IconLayoutSidebarRight, IconPlus, IconFilePlus } from '@tabler/icons-react';
import {
  useGetAssessments,
  useCreateAssessment,
  useUpdateAssessment,
  useDeleteAssessment,
  Assessment,
  AssessmentFormData,
} from '@rootstock/operations/assessments/assessments-data-access';
import { AssessmentForm, AssessmentFormMode } from './assessment-form';
import {
  ConfirmModal,
  ConfirmDiscardModal,
  useDiscardWarning,
  PageHeader,
  DataTable,
  FormDrawer,
  DataTableColumn,
  ActionSplitButton,
  useContextualNavigation,
} from '@rootstock/ui/web';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { palette, iconSizes, layout } from '@rootstock/ui/theme';
import { AssessmentStatusBadge } from './assessment-status-badge';

export function AssessmentListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const blockId = searchParams.get('blockId') || undefined;
  const { getLinkTo } = useContextualNavigation();

  const { data: assessments, isLoading } = useGetAssessments({ blockId });
  const { mutateAsync: createAssessment, isPending: isCreating } = useCreateAssessment();
  const { mutateAsync: updateAssessment, isPending: isUpdating } = useUpdateAssessment();
  const { mutateAsync: deleteAssessment } = useDeleteAssessment();

  const { can } = usePermission();
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const [sortState, setSortState] = useState<{
    accessor: string;
    direction: 'asc' | 'desc';
  }>({ accessor: 'date', direction: 'desc' });

  const [mode, setMode] = useState<AssessmentFormMode>('create');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [createFormDraft, setCreateFormDraft] = useState<Partial<AssessmentFormData>>({});

  const { handleAction: handleCloseWithWarning, modalProps } =
    useDiscardWarning(isFormDirty && mode === 'edit');

  const handleCreate = () => {
    setMode('create');
    setSelectedAssessment(null);
    setIsFormDirty(false);
    openDrawer();
  };

  const handleCreatePage = () => {
    navigate(getLinkTo('/assessments/new'));
  };

  const handleView = (assessment: Assessment) => {
    setMode('view');
    setSelectedAssessment(assessment);
    setIsFormDirty(false);
    openDrawer();
  };

  const handleViewPage = (assessment: Assessment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(`/assessments/${assessment._id}`);
  };

  const handleEdit = (assessment: Assessment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMode('edit');
    setSelectedAssessment(assessment);
    setIsFormDirty(false);
    openDrawer();
  };

  const handleEditPage = (assessment: Assessment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/assessments/${assessment._id}/edit`));
  };

  const handleDeleteClick = (assessment: Assessment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAssessmentToDelete(assessment);
    openDeleteModal();
  };

  const handleClose = () => {
    if (mode === 'view') {
      closeDrawer();
      return;
    }
    handleCloseWithWarning(() => {
      closeDrawer();
      setIsFormDirty(false);
    });
  };

  const handleSubmit = async (values: AssessmentFormData) => {
    try {
      if (mode === 'create') {
        await createAssessment({
          blockId: values.blockId || blockId!,
          name: values.name,
          type: values.type!,
          date: values.date,
          samples: values.samples,
        });
        setCreateFormDraft({});
      } else if (mode === 'edit' && selectedAssessment) {
        await updateAssessment({
          id: selectedAssessment._id,
          data: {
            status: values.status,
            samples: values.samples,
            changeReason: values.changeReason,
            __v: selectedAssessment.__v,
          },
        });
      }
      closeDrawer();
      setIsFormDirty(false);
    } catch (error) {
      console.error('Failed to save assessment', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (assessmentToDelete) {
      await deleteAssessment(assessmentToDelete._id);
      closeDeleteModal();
      setAssessmentToDelete(null);
    }
  };

  const getDrawerTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create Assessment';
      case 'edit':
        return 'Edit Assessment';
      case 'view':
        return 'Assessment Details';
      default:
        return '';
    }
  };

  const columns: DataTableColumn<Assessment>[] = [
    { accessor: 'recordId', title: 'ID', sortable: true },
    { accessor: 'name', title: 'Name', sortable: true },
    { accessor: 'type', title: 'Type', sortable: true },
    {
      accessor: 'blockId',
      title: 'Block',
      render: (assessment: Assessment) => typeof assessment.blockId === 'object' ? assessment.blockId.name : 'Unknown Block',
      sortable: true,
    },
    {
      accessor: 'date',
      title: 'Date',
      sortable: true,
      render: (assessment: Assessment) => new Date(assessment.date).toLocaleDateString()
    },
    {
      accessor: 'status',
      title: 'Status',
      sortable: true,
      render: (assessment: Assessment) => <AssessmentStatusBadge status={assessment.status} />
    },
    {
      accessor: 'summary.averageDamagePercentage',
      title: 'Damage %',
      sortable: true,
      render: (assessment: Assessment) => `${assessment.summary.averageDamagePercentage}%`
    },
    {
      accessor: 'actions',
      title: 'Actions',
      align: 'right',
      render: (assessment: Assessment) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          {can(PERMISSIONS.ASSESSMENT_VIEW) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.view}
              onClick={(e) => handleViewPage(assessment, e)}
            >
              <IconEye size={iconSizes.md} />
            </ActionIcon>
          )}
          {can(PERMISSIONS.ASSESSMENT_EDIT) && (
            <>
              <ActionIcon
                variant="subtle"
                color={palette.actions.edit}
                onClick={(e) => handleEditPage(assessment, e)}
                title="Edit Page"
              >
                <IconEdit size={iconSizes.md} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color={palette.actions.edit}
                onClick={(e) => handleEdit(assessment, e)}
                title="Quick Edit"
              >
                <IconLayoutSidebarRight size={iconSizes.md} />
              </ActionIcon>
            </>
          )}
          {can(PERMISSIONS.ASSESSMENT_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.delete}
              onClick={(e) => handleDeleteClick(assessment, e)}
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )}
        </Group>
      ),
    },
  ];

  const sortedAssessments = assessments
    ? [...assessments].sort((a, b) => {
      const { accessor, direction } = sortState;

      let aValue: any;
      let bValue: any;

      if (accessor === 'summary.averageDamagePercentage') {
        aValue = a.summary?.averageDamagePercentage ?? 0;
        bValue = b.summary?.averageDamagePercentage ?? 0;
      } else {
        aValue = (a as any)[accessor];
        bValue = (b as any)[accessor];
      }

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    })
    : [];

  return (
    <>
      <PageHeader
        title="Assessments"
        action={
          can(PERMISSIONS.ASSESSMENT_CREATE) ? (
            <ActionSplitButton
              mainLabel="Create"
              onMainClick={handleCreate}
              mainIcon={<IconPlus size={iconSizes.md} />}
              options={[
                {
                  label: 'Create in New Page',
                  onClick: handleCreatePage,
                  icon: <IconFilePlus size={iconSizes.md} />,
                },
              ]}
            />
          ) : undefined
        }
      />

      <DataTable
        data={sortedAssessments}
        columns={columns}
        isLoading={isLoading}
        onRowClick={handleView}
        noDataMessage="No assessments found."
        onSort={(accessor, direction) => setSortState({ accessor, direction })}
        initialSort={sortState}
      />

      <FormDrawer
        opened={drawerOpened}
        onClose={handleClose}
        title={getDrawerTitle()}
        size={layout.drawers.form}
        isLoading={isCreating || isUpdating}
      >
        <AssessmentForm
          mode={mode}
          assessment={selectedAssessment}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          onEdit={() => setMode('edit')}
          isLoading={isCreating || isUpdating}
          onDirtyChange={setIsFormDirty}
          initialValues={createFormDraft}
          onValuesChange={setCreateFormDraft}
          blockId={blockId}
        />
      </FormDrawer>

      <ConfirmDiscardModal {...modalProps} />

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Assessment"
        message={`Are you sure you want to delete assessment ${assessmentToDelete?.recordId}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />

    </>
  );
}
