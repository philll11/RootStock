import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Box, Typography, Chip, IconButton, Tooltip, Divider, Drawer, Stack } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { IconEdit, IconTrash, IconEye, IconPlus, IconExternalLink, IconPencil } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import DataGridWrapper from 'ui-component/extended/DataGridWrapper';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useGetAssessments, useDeleteAssessment, useCreateAssessment, useUpdateAssessment } from 'hooks/operations/useAssessments';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import AssessmentForm, { AssessmentFormMode } from './AssessmentForm';
import { AssessmentFormData } from 'types/operations/assessment.schema';
import { Assessment, AssessmentStatus } from 'types/operations/assessment.types';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import SplitActionButton from 'ui-component/extended/SplitActionButton';

// Helper to render status chip
const getStatusChip = (status: AssessmentStatus) => {
  switch (status) {
    case AssessmentStatus.COMPLETED:
      return <Chip label="Completed" color="success" size="small" variant="outlined" />;
    case AssessmentStatus.IN_PROGRESS:
      return <Chip label="In Progress" color="primary" size="small" variant="outlined" />;
    case AssessmentStatus.PENDING:
    default:
      return <Chip label="Pending" color="warning" size="small" variant="outlined" />;
  }
};

const assessmentName = (assessment: Assessment | null) => (assessment ? assessment.name : 'Assessment Details');

interface AssessmentListProps {
  blockId?: string; // Support filtering by Block
  blockName?: string;
}

const AssessmentList = ({ blockId, blockName }: AssessmentListProps) => {
  const navigate = useNavigate();
  const { getLinkTo } = useContextualNavigation('/assessments');
  const { can } = usePermission();

  // Queries & Mutations
  const queryParams = useMemo(() => (blockId ? { blockId } : undefined), [blockId]);
  const { data: assessments = [], isLoading } = useGetAssessments(queryParams);

  const { mutateAsync: deleteAssessment } = useDeleteAssessment();
  const { mutateAsync: createAssessment, isPending: isCreating } = useCreateAssessment();
  const { mutateAsync: updateAssessment, isPending: isUpdating } = useUpdateAssessment();

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<AssessmentFormMode>('create');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [createDraft, setCreateDraft] = useState<Partial<AssessmentFormData>>({});

  // Dirty State for drawer
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Discard Dialog
  const { discardDialogProps, trigger } = useDiscardWarning(
    drawerOpen && isFormDirty && mode === 'edit',
    'You have unsaved changes. Are you sure you want to discard them?'
  );

  const handleOpenDrawer = (newMode: AssessmentFormMode, assessment: Assessment | null = null) => {
    setMode(newMode);
    setSelectedAssessment(assessment);
    setIsFormDirty(false);

    // If creating in embedded mode, pre-fill the block
    if (newMode === 'create' && blockId) {
      setCreateDraft((prev) => ({ ...prev, blockId }));
    }

    setDrawerOpen(true);
  };

  const handleCloseDrawer = (event?: {}, reason?: 'backdropClick' | 'escapeKeyDown') => {
    const performClose = () => {
      setDrawerOpen(false);
      setIsFormDirty(false);
      setSelectedAssessment(null);
    };

    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      if (mode === 'edit' && isFormDirty) {
        trigger(performClose);
        return;
      }
    } else {
      if (isFormDirty) {
        trigger(performClose);
        return;
      }
    }
    performClose();
  };

  const handleCancelForm = () => {
    const performCancel = () => {
      if (isCreating) setCreateDraft({});
      setDrawerOpen(false);
      setIsFormDirty(false);
      setSelectedAssessment(null);
    };

    // Explicit Cancel Button Click
    if (isCreating) {
      // For create, Cancel means discard draft
      if (Object.keys(createDraft).length > 0 || isFormDirty) {
        trigger(performCancel, 'Discard newly created assessment? This cannot be undone.');
        return;
      }
    } else if (mode === 'edit') {
      if (isFormDirty) {
        trigger(performCancel);
        return;
      }
    }

    performCancel();
  };

  const handleFormValuesChange = useCallback(
    (values: Partial<AssessmentFormData>) => {
      if (mode === 'create') {
        setCreateDraft((prev) => ({ ...prev, ...values }));
      }
    },
    [mode]
  );

  const handleFormSubmit = async (values: any) => {
    try {
      if (mode === 'create') {
        await createAssessment(values);
      } else if (mode === 'edit' && selectedAssessment) {
        await updateAssessment({
          id: selectedAssessment._id,
          data: values
        });
      }
      setDrawerOpen(false); // Direct close on success, no need for complex checks
      setCreateDraft({});
      setIsFormDirty(false);
    } catch (error) {
      console.error('Failed to save assessment', error);
      // Error is handled by global query error handler or can be inspected here
    }
  };

  // --- Actions ---
  const handleCreatePage = () => {
    navigate(getLinkTo('/assessments/create'), {
      state: blockId ? {
        parent: {
          title: blockName || 'Block',
          to: `/blocks/${blockId}`
        }
      } : undefined
    });
  };
  const handleViewPage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/assessments/${id}`), {
      state: blockId ? {
        parent: {
          title: blockName || 'Block',
          to: `/blocks/${blockId}`
        }
      } : undefined
    });
  };
  const handleEditPage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/assessments/${id}/edit`), {
      state: blockId ? {
        parent: {
          title: blockName || 'Block',
          to: `/blocks/${blockId}`
        }
      } : undefined
    });
  };

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);

  const handleDeleteClick = (assessment: Assessment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAssessmentToDelete(assessment);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (assessmentToDelete) {
      await deleteAssessment(assessmentToDelete._id);
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
    }
  };

  // Columns - Memoized (Standard Pattern)
  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'recordId',
      headerName: 'Record ID',
      flex: 0.5,
      minWidth: 100
    },
    { field: 'name', headerName: 'Name', flex: 1.5, minWidth: 150 },
    {
      field: 'date',
      headerName: 'Date',
      flex: 0.5,
      minWidth: 100,
      valueGetter: (params: any) => params,
      renderCell: (params: GridRenderCellParams) => {
        try {
          return format(new Date(params.row.date), 'dd MMM yyyy');
        } catch (e) {
          return params.row.date;
        }
      }
    },
    {
      field: 'blockName',
      headerName: 'Block',
      flex: 1.5,
      minWidth: 150
    },
    { field: 'type', headerName: 'Type', flex: 0.8, minWidth: 100 },
    {
      field: 'damage',
      headerName: 'Damage %',
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => {
        const pct = params.row.summary?.averageDamagePercentage || 0;
        return (
          <Typography fontWeight="bold" color={pct > 0 ? 'error' : 'inherit'}>
            {pct.toFixed(2)}%
          </Typography>
        );
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => getStatusChip(params.value)
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      minWidth: 180,
      sortable: false,
      filterable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params: GridRenderCellParams) => {
        const assessment = params.row as Assessment;
        return (
          <>
            {can(PERMISSIONS.ASSESSMENT_VIEW) && (
              <Tooltip title="View Details">
                <IconButton color="primary" size="small" onClick={(e) => handleViewPage(assessment._id, e)}>
                  <IconEye size={18} />
                </IconButton>
              </Tooltip>
            )}
            {can(PERMISSIONS.ASSESSMENT_EDIT) && (
              <>
                <Tooltip title="Edit">
                  <IconButton color="secondary" size="small" onClick={(e) => handleEditPage(assessment._id, e)}>
                    <IconEdit size={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Quick Edit">
                  <IconButton
                    color="warning"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDrawer('edit', assessment);
                    }}
                  >
                    <IconPencil size={18} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {can(PERMISSIONS.ASSESSMENT_DELETE) && (
              <Tooltip title="Delete">
                <IconButton color="error" size="small" onClick={(e) => handleDeleteClick(assessment, e)}>
                  <IconTrash size={18} />
                </IconButton>
              </Tooltip>
            )}
          </>
        );
      }
    }
  ],
    [can, handleViewPage, handleEditPage, handleDeleteClick, handleOpenDrawer]
  );

  return (
    <MainCard
      title="Assessments"
      secondary={
        can(PERMISSIONS.ASSESSMENT_CREATE) && (
          <SplitActionButton
            primaryLabel="Create Assessment"
            primaryStartIcon={<IconPlus size={18} />}
            primaryAction={() => handleOpenDrawer('create')}
            options={[
              {
                label: 'Create in New Page',
                icon: <IconExternalLink size={18} />,
                onClick: handleCreatePage
              }
            ]}
          />
        )
      }
    >
      <DataGridWrapper
        rows={assessments}
        columns={columns}
        loading={isLoading}
        onRowClick={(params) => can(PERMISSIONS.ASSESSMENT_VIEW) && handleViewPage(params.row._id)}
        getRowId={(row) => row._id}
      />

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 500, md: 600 } } } }}
      >
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4">
              {mode === 'create' ? 'New Assessment' : mode === 'edit' ? 'Edit Assessment' : assessmentName(selectedAssessment)}
            </Typography>
            {mode === 'view' && selectedAssessment && (
              <Stack direction="row" spacing={1}>
                {can(PERMISSIONS.ASSESSMENT_EDIT) && (
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => setMode('edit')} color="primary">
                      <IconEdit size={18} />
                    </IconButton>
                  </Tooltip>
                )}
                {can(PERMISSIONS.ASSESSMENT_DELETE) && (
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={(e) => handleDeleteClick(selectedAssessment, e)} color="error">
                      <IconTrash size={18} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          <AssessmentForm
            mode={mode}
            assessment={selectedAssessment}
            initialValues={mode === 'create' ? createDraft : undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleCancelForm}
            isLoading={isCreating || isUpdating}
            onDirtyChange={setIsFormDirty}
            onValuesChange={handleFormValuesChange}
          />
        </Box>
      </Drawer>

      {/* Discard Warning Dialog */}
      <ConfirmDialog {...discardDialogProps} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Assessment"
        content={`Are you sure you want to delete ${assessmentName(selectedAssessment)}? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmColor="error"
      />
    </MainCard>
  );
};

export default AssessmentList;
