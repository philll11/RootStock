import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, IconButton, Tooltip, Stack, Divider, Drawer, Button } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { IconEdit, IconTrash, IconEye, IconPlus, IconPencil, IconExternalLink } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import DataGridWrapper from 'ui-component/extended/DataGridWrapper';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useGetOrchards, useDeleteOrchard, useCreateOrchard, useUpdateOrchard } from 'hooks/assets/useOrchards';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import OrchardForm, { OrchardFormMode } from './OrchardForm';
import { OrchardFormData } from 'types/assets/orchard.schema';
import { Orchard } from 'types/assets/orchard.types';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import SplitActionButton from 'ui-component/extended/SplitActionButton';

const getStatusChip = (isActive?: boolean) => {
  return isActive ? (
    <Chip label="Active" color="success" size="small" variant="outlined" />
  ) : (
    <Chip label="Inactive" color="error" size="small" variant="outlined" />
  );
};

const orchardName = (orchard: Orchard | null) => (orchard ? orchard.name : 'Orchard Details');

interface OrchardListProps {
  clientId?: string;
  clientName?: string;
}

const OrchardList = ({ clientId, clientName }: OrchardListProps) => {
  const navigate = useNavigate();
  const { getLinkTo } = useContextualNavigation('/orchards');
  const { can } = usePermission();

  // Queries & Mutations
  // If embedded in a Client detail, filter by clientId
  const queryParams = useMemo(() => (clientId ? { clientId } : undefined), [clientId]);
  const { data: allOrchards = [], isLoading } = useGetOrchards(queryParams);

  const orchards = useMemo(() => {
    if (!clientId) return allOrchards;
    // Client-side filter to be safe/responsive if the API returns mixed results or is cached
    return allOrchards.filter((o) => (typeof o.clientId === 'object' ? o.clientId._id : o.clientId) === clientId);
  }, [allOrchards, clientId]);

  const { mutateAsync: deleteOrchard } = useDeleteOrchard();
  const { mutateAsync: createOrchard, isPending: isCreating } = useCreateOrchard();
  const { mutateAsync: updateOrchard, isPending: isUpdating } = useUpdateOrchard();

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<OrchardFormMode>('create');
  const [selectedOrchard, setSelectedOrchard] = useState<Orchard | null>(null);
  const [createDraft, setCreateDraft] = useState<Partial<OrchardFormData>>({});

  // Dirty State for drawer
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Discard Dialog
  const { discardDialogProps, trigger } = useDiscardWarning(
    drawerOpen && isFormDirty && mode === 'edit',
    'You have unsaved changes. Are you sure you want to discard them?'
  );

  const handleOpenDrawer = (newMode: OrchardFormMode, orchard: Orchard | null = null) => {
    setMode(newMode);
    setSelectedOrchard(orchard);
    setIsFormDirty(false);

    // If creating in embedded mode, pre-fill the client
    if (newMode === 'create' && clientId) {
      setCreateDraft((prev) => ({ ...prev, clientId }));
    }

    setDrawerOpen(true);
  };

  const handleCloseDrawer = (event?: {}, reason?: 'backdropClick' | 'escapeKeyDown') => {
    const performClose = () => {
      setDrawerOpen(false);
      setIsFormDirty(false);
      setSelectedOrchard(null);
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
      setSelectedOrchard(null);
    };

    // Explicit Cancel Button Click
    if (isCreating) {
      // For create, Cancel means discard draft
      if (Object.keys(createDraft).length > 0 || isFormDirty) {
        trigger(performCancel, 'Discard new orchard draft? This cannot be undone.');
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
    (values: Partial<OrchardFormData>) => {
      if (mode === 'create') {
        setCreateDraft((prev) => ({ ...prev, ...values }));
      }
    },
    [mode]
  );

  // Form Submit Handler
  const handleFormSubmit = async (values: any) => {
    try {
      if (mode === 'create') {
        await createOrchard(values);
      } else if (mode === 'edit' && selectedOrchard) {
        await updateOrchard({
          id: selectedOrchard._id,
          data: values
        });
      }
      setDrawerOpen(false);
      setCreateDraft({});
      setIsFormDirty(false);
    } catch (error) {
      // Error is handled by hook notifications
    }
  };

  // --- Actions ---
  const handleCreatePage = () => {
    navigate(getLinkTo('/orchards/create'), {
      state: clientId ? {
        parent: {
          title: clientName || 'Client',
          to: `/clients/${clientId}`
        }
      } : undefined
    });
  };
  const handleViewPage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/orchards/${id}`), {
      state: clientId ? {
        parent: {
          title: clientName || 'Client',
          to: `/clients/${clientId}`
        }
      } : undefined
    });
  };
  const handleEditPage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/orchards/${id}/edit`), {
      state: clientId ? {
        parent: {
          title: clientName || 'Client',
          to: `/clients/${clientId}`
        }
      } : undefined
    });
  };

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orchardToDelete, setOrchardToDelete] = useState<Orchard | null>(null);

  const handleDeleteClick = (orchard: Orchard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOrchardToDelete(orchard);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (orchardToDelete) {
      await deleteOrchard(orchardToDelete._id);
      setDeleteDialogOpen(false);
      setOrchardToDelete(null);
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
        flex: 1.5,
        minWidth: 200
      },
      {
        field: 'clientId',
        headerName: 'Client',
        flex: 1,
        renderCell: (params: GridRenderCellParams<any, Orchard>) => {
          const clientName = typeof params.row.clientId === 'object' ? params.row.clientId.name : params.row.clientId;
          return (
            <Stack direction="row" alignItems="center" sx={{ height: '100%' }}>
              <Typography variant="body2">{clientName}</Typography>
            </Stack>
          );
        }
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 120,
        renderCell: (params: GridRenderCellParams) => getStatusChip(params.row.isActive)
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
          const orchard = params.row as Orchard;
          return (
            <>
              {can(PERMISSIONS.ORCHARD_VIEW) && (
                <Tooltip title="View Details">
                  <IconButton color="primary" size="small" onClick={(e) => handleViewPage(orchard._id, e)}>
                    <IconEye size={18} />
                  </IconButton>
                </Tooltip>
              )}
              {can(PERMISSIONS.ORCHARD_EDIT) && (
                <>
                  <Tooltip title="Edit">
                    <IconButton color="secondary" size="small" onClick={(e) => handleEditPage(orchard._id, e)}>
                      <IconEdit size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Quick Edit">
                    <IconButton
                      color="warning"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDrawer('edit', orchard);
                      }}
                    >
                      <IconPencil size={18} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {can(PERMISSIONS.ORCHARD_DELETE) && (
                <Tooltip title="Delete">
                  <IconButton color="error" size="small" onClick={(e) => handleDeleteClick(orchard, e)}>
                    <IconTrash size={18} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          );
        }
      }
    ],
    [can, handleViewPage, handleEditPage, handleDeleteClick]
  );

  const content = (
    <>
      <DataGridWrapper
        rows={orchards}
        columns={columns}
        loading={isLoading}
        onRowClick={(params) => handleOpenDrawer('view', params.row as Orchard)}
        getRowId={(row) => row._id}
      />
      {/* Quick View / Create / Edit Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 500, md: 600 } } } }}
      >
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4">
              {mode === 'create' ? 'New Orchard' : mode === 'edit' ? 'Edit Orchard' : orchardName(selectedOrchard)}
            </Typography>
            {mode === 'view' && selectedOrchard && (
              <Stack direction="row" spacing={1}>
                {can(PERMISSIONS.ORCHARD_EDIT) && (
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => setMode('edit')} color="primary">
                      <IconEdit size={18} />
                    </IconButton>
                  </Tooltip>
                )}
                {can(PERMISSIONS.ORCHARD_DELETE) && (
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={(e) => handleDeleteClick(selectedOrchard, e)} color="error">
                      <IconTrash size={18} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          <OrchardForm
            mode={mode}
            orchard={selectedOrchard}
            initialValues={mode === 'create' && clientId ? { ...createDraft, clientId } : (mode === 'create' ? createDraft : undefined)}
            onSubmit={handleFormSubmit}
            onCancel={handleCancelForm}
            isLoading={isCreating || isUpdating}
            onDirtyChange={setIsFormDirty}
            onValuesChange={handleFormValuesChange}
          />
        </Box>
      </Drawer>
    </>
  );

  if (clientId) {
    return (
      <Box>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          {can(PERMISSIONS.ORCHARD_CREATE) && (
            <Button
              variant="contained"
              startIcon={<IconPlus size={18} />}
              onClick={() => handleOpenDrawer('create')}
            >
              Add Orchard
            </Button>
          )}
        </Stack>
        {content}
        {/* Discard Warning Dialog */}
        <ConfirmDialog {...discardDialogProps} />

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteDialogOpen}
          title="Delete Orchard"
          content={`Are you sure you want to delete ${orchardName(selectedOrchard)}? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteDialogOpen(false)}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          confirmColor="error"
        />
      </Box>
    );
  }

  return (
    <MainCard
      title="Orchards"
      secondary={
        can(PERMISSIONS.ORCHARD_CREATE) && (
          <SplitActionButton
            primaryLabel="Create Orchard"
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
      {content}
      {/* Discard Warning Dialog */}
      <ConfirmDialog {...discardDialogProps} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Orchard"
        content={`Are you sure you want to delete ${orchardName(selectedOrchard)}? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmColor="error"
      />
    </MainCard>
  );
};

export default OrchardList;
