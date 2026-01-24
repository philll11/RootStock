import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Drawer,
    Box,
    Typography,
    Tooltip,
    IconButton,
    Chip,
    Divider,
    Stack
} from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { IconEdit, IconTrash, IconEye, IconPlus, IconExternalLink, IconPencil } from '@tabler/icons-react';

// Project Imports
import { useGetClients, useDeleteClient, useCreateClient, useUpdateClient } from 'hooks/iam/useClients';
import { Client } from 'api/iam/client.types';
import { ClientFormData } from 'api/iam/client.schema';
import ClientForm, { ClientFormMode } from './ClientForm';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import DataGridWrapper from 'ui-component/extended/DataGridWrapper';
import SplitActionButton from 'ui-component/extended/SplitActionButton';
import { PERMISSIONS } from 'constants/permissions';
import { usePermission } from 'contexts/AuthContext';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import MainCard from 'ui-component/cards/MainCard';

const ClientList = () => {
    const navigate = useNavigate();
    const { getLinkTo } = useContextualNavigation('/clients');
    const { can } = usePermission();

    // Data State
    const { data: clients = [], isLoading } = useGetClients(); // Default to empty array
    const { mutateAsync: deleteClient } = useDeleteClient();
    const { mutateAsync: createClient, isPending: isCreating } = useCreateClient();
    const { mutateAsync: updateClient, isPending: isUpdating } = useUpdateClient();

    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [mode, setMode] = useState<ClientFormMode>('create');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [createDraft, setCreateDraft] = useState<Partial<ClientFormData>>({});

    // Dirty State for drawer
    const [isFormDirty, setIsFormDirty] = useState(false);

    // Discard Dialog Hook
    const { discardDialogProps, trigger } = useDiscardWarning(
        // Only warn on navigation if drawer is open and dirty (Edit Mode)
        // or potentially other criteria. For now, matching standard pattern.
        (drawerOpen && isFormDirty && mode === 'edit'),
        'You have unsaved changes. Are you sure you want to discard them?'
    );

    // Quick Action Handlers
    const handleOpenDrawer = (newMode: ClientFormMode, client: Client | null = null) => {
        const performOpen = () => {
            setMode(newMode);
            setSelectedClient(client);
            setIsFormDirty(false);
            setDrawerOpen(true);
        };

        performOpen();
    };

    const handleCloseDrawer = (event?: {}, reason?: "backdropClick" | "escapeKeyDown") => {
        const performClose = () => {
            setDrawerOpen(false);
            setIsFormDirty(false);
            setSelectedClient(null);
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
            setSelectedClient(null);
        };

        // Explicit Cancel Button Click
        if (isCreating) {
            // For create, Cancel means discard draft
            if (Object.keys(createDraft).length > 0 || isFormDirty) {
                trigger(performCancel, 'Discard new client draft? This cannot be undone.');
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

    const handleFormValuesChange = useCallback((values: Partial<ClientFormData>) => {
        if (mode === 'create') {
            setCreateDraft(prev => ({ ...prev, ...values }));
        }
    }, [mode]);


    // Form Submission (Drawer)
    const handleFormSubmit = async (values: ClientFormData) => {
        try {
            if (isCreating) {
                const { isActive, __v, ...createData } = values;
                await createClient(createData);
                setCreateDraft({}); // Clear draft on success
            } else if (mode === 'edit' && selectedClient) {
                const { subsidiaryId, ...updateData } = values;
                await updateClient({ id: selectedClient._id, data: { ...updateData, __v: selectedClient.__v } });
            }
            setDrawerOpen(false);
            setIsFormDirty(false);
        } catch (error) {
            console.error('Operation failed', error);
        }
    };

    // --- Actions ---
    const handleCreatePage = () => navigate('/clients/create');
    const handleViewPage = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent row click
        navigate(getLinkTo(`/clients/${id}`));
    };
    const handleEditPage = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        navigate(getLinkTo(`/clients/${id}/edit`));
    };

    // Delete State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

    const handleDeleteClick = (client: Client, e: React.MouseEvent) => {
        e.stopPropagation();
        setClientToDelete(client);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (clientToDelete) {
            await deleteClient(clientToDelete._id);
            setDeleteDialogOpen(false);
            setClientToDelete(null);
        }
    };

    // --- Column Configuration ---
    const columns: GridColDef[] = [
        {
            field: 'recordId',
            headerName: 'Client Code',
            flex: 0.5,
            minWidth: 100
        },
        {
            field: 'name',
            headerName: 'Client Name',
            flex: 1.5,
            minWidth: 200
        },
        {
            field: 'isActive',
            headerName: 'Status',
            flex: 0.5,
            minWidth: 100,
            renderCell: (params: GridRenderCellParams) => (
                params.value ?
                    <Chip label="Active" size="small" color="success" variant="outlined" /> :
                    <Chip label="Inactive" size="small" color="error" variant="outlined" />
            )
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
                const client = params.row as Client;
                return (
                    <>
                        {can(PERMISSIONS.CLIENT_VIEW) && (
                            <Tooltip title="View Details">
                                <IconButton
                                    color="primary"
                                    size="small"
                                    onClick={(e) => handleViewPage(client._id, e)}
                                >
                                    <IconEye size={18} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {can(PERMISSIONS.CLIENT_EDIT) && (
                            <>
                                <Tooltip title="Edit">
                                    <IconButton
                                        color="secondary"
                                        size="small"
                                        onClick={(e) => handleEditPage(client._id, e)}
                                    >
                                        <IconEdit size={18} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Quick Edit">
                                    <IconButton
                                        color="orange"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenDrawer('edit', client);
                                        }}
                                    >
                                        <IconPencil size={18} />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                        {can(PERMISSIONS.CLIENT_DELETE) && (
                            <Tooltip title="Delete">
                                <IconButton
                                    color="error"
                                    size="small"
                                    onClick={(e) => handleDeleteClick(client, e)}
                                >
                                    <IconTrash size={18} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </>
                );
            }
        }
    ];

    return (

        <MainCard
            title="Clients"
            secondary={
                can(PERMISSIONS.CLIENT_CREATE) && (
                    <SplitActionButton
                        primaryLabel="Create Client"
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
                title="Clients"
                rows={clients}
                columns={columns}
                loading={isLoading}
                // Clicking a row opens Quick View (Drawer)
                onRowClick={(params) => handleOpenDrawer('view', params.row as Client)}
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
                            {mode === 'create' ? 'New Client' : mode === 'edit' ? 'Edit Client' : clientName(selectedClient)}
                        </Typography>
                        {mode === 'view' && selectedClient && (
                            <Stack direction="row" spacing={1}>
                                {can(PERMISSIONS.CLIENT_EDIT) && (
                                    <Tooltip title="Edit">
                                        <IconButton size="small" onClick={() => setMode('edit')} color="primary">
                                            <IconEdit size={18} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {can(PERMISSIONS.CLIENT_DELETE) && (
                                    <Tooltip title="Delete">
                                        <IconButton
                                            size="small"
                                            onClick={(e) => handleDeleteClick(selectedClient, e)}
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
                    <ClientForm
                        mode={mode}
                        initialValues={mode === 'create' ? createDraft : (selectedClient ? {
                            ...selectedClient,
                            subsidiaryId: typeof selectedClient.subsidiaryId === 'object'
                                ? selectedClient.subsidiaryId._id
                                : selectedClient.subsidiaryId
                        } : {})}
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
                title="Delete Client"
                content={`Are you sure you want to delete ${clientToDelete?.name}? This action cannot be undone.`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteDialogOpen(false)}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                confirmColor="error"
            />
        </MainCard>
    );
};

const clientName = (client: Client | null) => client ? client.name : 'Client Details';

export default ClientList;
