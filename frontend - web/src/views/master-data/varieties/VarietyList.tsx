import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, IconButton, Tooltip, Stack, Drawer, Divider } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { IconEdit, IconTrash, IconEye, IconPlus, IconPencil, IconExternalLink } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import DataGridWrapper from 'ui-component/extended/DataGridWrapper';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useGetVarieties, useDeleteVariety, useCreateVariety, useUpdateVariety } from 'hooks/master-data/useVarieties';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import VarietyForm, { VarietyFormMode } from './VarietyForm';
import { VarietyFormData } from 'types/master-data/variety.schema';
import { Variety } from 'types/master-data/variety.types';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import SplitActionButton from 'ui-component/extended/SplitActionButton';

const getStatusChip = (isActive?: boolean) => {
  return isActive ? (
    <Chip label="Active" color="success" size="small" variant="outlined" />
  ) : (
    <Chip label="Inactive" color="error" size="small" variant="outlined" />
  );
};

const varietyName = (variety: Variety | null) => (variety ? variety.name : 'Variety Details');

const VarietyList = () => {
  const navigate = useNavigate();
  const { getLinkTo } = useContextualNavigation('/varieties');
  const { can } = usePermission();

  // Queries & Mutations
  const { data: varieties = [], isLoading } = useGetVarieties();
  const { mutateAsync: deleteVariety } = useDeleteVariety();
  const { mutateAsync: createVariety, isPending: isCreating } = useCreateVariety();
  const { mutateAsync: updateVariety, isPending: isUpdating } = useUpdateVariety();

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<VarietyFormMode>('create');
  const [selectedVariety, setSelectedVariety] = useState<Variety | null>(null);
  const [createDraft, setCreateDraft] = useState<Partial<VarietyFormData>>({});

  // Dirty State for drawer
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Discard Dialog
  const { discardDialogProps, trigger } = useDiscardWarning(
    drawerOpen && isFormDirty && mode === 'edit',
    'You have unsaved changes. Are you sure you want to discard them?'
  );

  const handleOpenDrawer = (newMode: VarietyFormMode, variety: Variety | null = null) => {
    setMode(newMode);
    setSelectedVariety(variety);
    setIsFormDirty(false);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = (event?: {}, reason?: 'backdropClick' | 'escapeKeyDown') => {
    const performClose = () => {
      setDrawerOpen(false);
      setIsFormDirty(false);
      setSelectedVariety(null);
    };

    // If Closing via Backdrop/Escape (Persistence Check)
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      if (mode === 'edit' && isFormDirty) {
        trigger(performClose);
        return;
      }
      // Create mode stashes automatically
    }
    // If called manually (fallback)
    else {
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
      setSelectedVariety(null);
    };

    // Explicit Cancel Button Click
    if (isCreating) {
      // For create, Cancel means discard draft
      if (Object.keys(createDraft).length > 0 || isFormDirty) {
        trigger(performCancel, 'Discard new variety draft? This cannot be undone.');
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
    (values: Partial<VarietyFormData>) => {
      if (mode === 'create') {
        setCreateDraft((prev) => ({ ...prev, ...values }));
      }
    },
    [mode]
  );

  // Form Submission (Drawer)
  const handleFormSubmit = async (values: VarietyFormData) => {
    try {
      if (mode === 'create') {
        const { isActive, __v, ...createData } = values;
        await createVariety(createData);
      } else if (mode === 'edit' && selectedVariety) {
        await updateVariety({ id: selectedVariety._id, data: { ...values, __v: selectedVariety.__v } });
      }
      setDrawerOpen(false);
      setCreateDraft({});
      setIsFormDirty(false);
    } catch (error) {
      // Error is handled by hook notifications
    }
  };

  // --- Actions ---
  const handleCreatePage = () => navigate(getLinkTo('/varieties/new'));
  const handleViewPage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/varieties/${id}`));
  };
  const handleEditPage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/varieties/${id}/edit`));
  };

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [varietyToDelete, setVarietyToDelete] = useState<Variety | null>(null);

  const handleDeleteClick = (variety: Variety, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVarietyToDelete(variety);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (varietyToDelete) {
      await deleteVariety(varietyToDelete._id);
      setDeleteDialogOpen(false);
      setVarietyToDelete(null);
    }
  };

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'recordId',
        headerName: 'Record ID',
        flex: 0.5,
        minWidth: 100
      },
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 200
      },
      {
        field: 'isActive',
        headerName: 'Status',
        flex: 0.5,
        minWidth: 120,
        renderCell: (params: GridRenderCellParams) => getStatusChip(params.row.isActive)
      },
      {
        field: 'actions',
        headerName: 'Actions',
        flex: 0.8,
        minWidth: 150,
        sortable: false,
        filterable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params: GridRenderCellParams) => {
          const variety = params.row as Variety;
          return (
            <>
              {can(PERMISSIONS.VARIETY_VIEW) && (
                <Tooltip title="View Details">
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={(e) => handleViewPage(variety._id, e)}
                  >
                    <IconEye size={18} />
                  </IconButton>
                </Tooltip>
              )}
              {can(PERMISSIONS.VARIETY_EDIT) && (
                <>
                  <Tooltip title="Edit">
                    <IconButton
                      color="secondary"
                      size="small"
                      onClick={(e) => handleEditPage(variety._id, e)}
                    >
                      <IconEdit size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Quick Edit">
                    <IconButton
                      color="warning"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDrawer('edit', variety);
                      }}
                    >
                      <IconPencil size={18} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {can(PERMISSIONS.VARIETY_DELETE) && (
                <Tooltip title="Delete">
                  <IconButton
                    color="error"
                    size="small"
                    onClick={(e) => handleDeleteClick(variety, e)}
                  >
                    <IconTrash size={18} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          );
        }
      }
    ],
    [can]
  );

  return (
    <MainCard
      title="Varieties"
      secondary={
        can(PERMISSIONS.VARIETY_CREATE) && (
          <SplitActionButton
            primaryLabel="Create Variety"
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
        title='Varieties'
        rows={varieties}
        columns={columns}
        loading={isLoading}
        onRowClick={(params) => handleViewPage(params.row._id)}
        getRowId={(row) => row._id}
      />
      {/* Quick View / Edit / Create Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 500, md: 600 } } } }}
      >
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4">
              {mode === 'create' ? 'New Variety' : mode === 'edit' ? 'Edit Variety' : varietyName(selectedVariety)}
            </Typography>
            {mode === 'view' && selectedVariety && (
              <Stack direction="row" spacing={1}>
                {can(PERMISSIONS.VARIETY_EDIT) && (
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => setMode('edit')} color="primary">
                      <IconEdit size={18} />
                    </IconButton>
                  </Tooltip>
                )}
                {can(PERMISSIONS.VARIETY_DELETE) && (
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={(e) => handleDeleteClick(selectedVariety, e)}
                      color="error"
                    >
                      <IconTrash size={18} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />
          <VarietyForm
            mode={mode}
            initialValues={mode === 'create' ? createDraft : selectedVariety || undefined}
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
        title="Delete Variety"
        content={`Are you sure you want to delete ${varietyToDelete?.name}? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmColor="error"
      />
    </MainCard>
  );
};

export default VarietyList;
