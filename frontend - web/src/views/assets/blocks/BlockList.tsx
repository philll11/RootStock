import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, IconButton, Tooltip, Divider, Drawer, Stack } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { IconEdit, IconTrash, IconEye, IconPlus, IconPencil, IconExternalLink } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';
import DataGridWrapper from 'ui-component/extended/DataGridWrapper';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useGetBlocks, useDeleteBlock, useCreateBlock, useUpdateBlock } from 'hooks/assets/useBlocks';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import BlockForm, { BlockFormMode } from './BlockForm';
import { BlockFormData } from 'types/assets/block.schema';
import { Block, Planting } from 'types/assets/block.types';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import SplitActionButton from 'ui-component/extended/SplitActionButton';

const getStatusChip = (isActive?: boolean) => {
  return isActive ? (
    <Chip label="Active" color="success" size="small" variant="outlined" />
  ) : (
    <Chip label="Inactive" color="error" size="small" variant="outlined" />
  );
};
const blockName = (block: Block | null) => (block ? block.name : 'Block Details');

interface BlockListProps {
  orchardId?: string;
  orchardName?: string;
}

const BlockList = ({ orchardId, orchardName }: BlockListProps) => {
  const navigate = useNavigate();
  const { getLinkTo } = useContextualNavigation('/blocks');
  const { can } = usePermission();

  // Queries & Mutations
  const queryParams = useMemo(() => (orchardId ? { orchardId } : undefined), [orchardId]);
  const { data: allBlocks = [], isLoading } = useGetBlocks(queryParams);

  const blocks = useMemo(() => {
    if (!orchardId) return allBlocks;
    return allBlocks.filter((b) => (typeof b.orchardId === 'object' ? b.orchardId._id : b.orchardId) === orchardId);
  }, [allBlocks, orchardId]);

  const { mutateAsync: deleteBlock } = useDeleteBlock();
  const { mutateAsync: createBlock, isPending: isCreating } = useCreateBlock();
  const { mutateAsync: updateBlock, isPending: isUpdating } = useUpdateBlock();

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<BlockFormMode>('create');
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [createDraft, setCreateDraft] = useState<Partial<BlockFormData>>({});

  // Dirty State for drawer
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Discard Dialog
  const { discardDialogProps, trigger } = useDiscardWarning(
    drawerOpen && isFormDirty && mode === 'edit',
    'You have unsaved changes. Are you sure you want to discard them?'
  );

  const handleOpenDrawer = (newMode: BlockFormMode, block: Block | null = null) => {
    setMode(newMode);
    setSelectedBlock(block);
    setIsFormDirty(false);

    // If creating in embedded mode, pre-fill the orchard
    if (newMode === 'create' && orchardId) {
      setCreateDraft((prev) => ({ ...prev, orchardId }));
    }

    setDrawerOpen(true);
  };

  const handleCloseDrawer = (event?: {}, reason?: 'backdropClick' | 'escapeKeyDown') => {
    const performClose = () => {
      setDrawerOpen(false);
      setIsFormDirty(false);
      setSelectedBlock(null);
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
      setSelectedBlock(null);
    };

    // Explicit Cancel Button Click
    if (isCreating) {
      // For create, Cancel means discard draft
      if (Object.keys(createDraft).length > 0 || isFormDirty) {
        trigger(performCancel, 'Discard new block draft? This cannot be undone.');
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
    (values: Partial<BlockFormData>) => {
      if (mode === 'create') {
        setCreateDraft((prev) => ({ ...prev, ...values }));
      }
    },
    [mode]
  );

  const handleFormSubmit = async (values: BlockFormData) => {
    try {
      if (mode === 'create') {
        const { isActive, __v, ...createData } = values;
        await createBlock(createData);
      } else if (mode === 'edit' && selectedBlock) {
        const { orchardId, ...updateData } = values;
        await updateBlock({
          id: selectedBlock._id,
          data: {
            ...updateData,
            __v: selectedBlock.__v
          }
        });
      }
      setDrawerOpen(false);
      setCreateDraft({});
      setIsFormDirty(false);
    } catch (error) {
      console.error(error);
    }
  };

  // --- Actions ---
  const handleCreatePage = () => {
    navigate(getLinkTo('/blocks/new'), {
      state: orchardId ? {
        parent: {
          title: orchardName || 'Orchard',
          to: `/orchards/${orchardId}`
        }
      } : undefined
    });
  };
  const handleViewPage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/blocks/${id}`), {
      state: orchardId ? {
        parent: {
          title: orchardName || 'Orchard',
          to: `/orchards/${orchardId}`
        }
      } : undefined
    });
  };
  const handleEditPage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/blocks/${id}/edit`), {
      state: orchardId ? {
        parent: {
          title: orchardName || 'Orchard',
          to: `/orchards/${orchardId}`
        }
      } : undefined
    });
  };

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<Block | null>(null);

  const handleDeleteClick = (block: Block, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBlockToDelete(block);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (blockToDelete) {
      await deleteBlock(blockToDelete._id);
      setDeleteDialogOpen(false);
      setBlockToDelete(null);
    }
  };

  const columns: GridColDef[] = useMemo(() => [
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
      minWidth: 150
    },
    {
      field: 'orchardId',
      headerName: 'Orchard',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<any, Block>) => {
        const orchardName = typeof params.row.orchardId === 'object' ? params.row.orchardId.name : 'Unknown';
        return (
          <Stack direction="row" alignItems="center" sx={{ height: '100%' }}>
            <Typography variant="body2">{orchardName}</Typography>
          </Stack>
        );
      }
    },
    {
      field: 'varieties',
      headerName: 'Varieties',
      flex: 1.5,
      sortable: false,
      renderCell: (params: GridRenderCellParams<any, Block>) => {
        const varieties = params.row.plantings
          .map((p: Planting) => (typeof p.varietyId === 'object' ? p.varietyId.name : ''))
          .filter(Boolean)
          .join(', ');
        return (
          <Tooltip title={varieties}>
            <Stack direction="row" alignItems="center" sx={{ height: '100%' }}>
              <Typography variant="body2" noWrap>
                {varieties}
              </Typography>
            </Stack>
          </Tooltip>
        );
      }
    },
    {
      field: 'treeCount',
      headerName: 'Trees',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (value: any, row: Block) => {
        return row.plantings.reduce((sum: number, p: Planting) => sum + (Number(p.treeCount) || 0), 0);
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
        const block = params.row as Block;
        return (
          <>
            {can(PERMISSIONS.BLOCK_VIEW) && (
              <Tooltip title="View Details">
                <IconButton color="primary" size="small" onClick={(e) => handleViewPage(block._id, e)}>
                  <IconEye size={18} />
                </IconButton>
              </Tooltip>
            )}
            {can(PERMISSIONS.BLOCK_EDIT) && (
              <>
                <Tooltip title="Edit">
                  <IconButton color="secondary" size="small" onClick={(e) => handleEditPage(block._id, e)}>
                    <IconEdit size={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Quick Edit">
                  <IconButton
                    color="warning"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDrawer('edit', block);
                    }}
                  >
                    <IconPencil size={18} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {can(PERMISSIONS.BLOCK_DELETE) && (
              <Tooltip title="Delete">
                <IconButton color="error" size="small" onClick={(e) => handleDeleteClick(block, e)}>
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
      title="Blocks"
      secondary={
        can(PERMISSIONS.BLOCK_CREATE) && (
          <SplitActionButton
            primaryLabel="Create Block"
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
        rows={blocks}
        columns={columns}
        loading={isLoading}
        onRowClick={(params) => can(PERMISSIONS.BLOCK_VIEW) && handleViewPage(params.row._id)}
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
              {mode === 'create' ? 'New Block' : mode === 'edit' ? 'Edit Block' : blockName(selectedBlock)}
            </Typography>
            {mode === 'view' && selectedBlock && (
              <Stack direction="row" spacing={1}>
                {can(PERMISSIONS.BLOCK_EDIT) && (
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => setMode('edit')} color="primary">
                      <IconEdit size={18} />
                    </IconButton>
                  </Tooltip>
                )}
                {can(PERMISSIONS.BLOCK_DELETE) && (
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={(e) => handleDeleteClick(selectedBlock, e)} color="error">
                      <IconTrash size={18} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          <BlockForm
            mode={mode}
            block={selectedBlock}
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
        title="Delete Block"
        content={`Are you sure you want to delete ${blockName(selectedBlock)}? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmColor="error"
      />
    </MainCard>
  );
};

export default BlockList;
