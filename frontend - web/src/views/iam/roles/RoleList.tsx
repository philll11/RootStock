import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Drawer,
    Box,
    Typography,
    Chip,
    Divider,
    Tooltip,
    IconButton,
    Stack
} from '@mui/material';
import {
    GridColDef,
    GridRenderCellParams,
} from '@mui/x-data-grid';
import { IconEdit, IconTrash, IconEye, IconPlus, IconExternalLink, IconPencil } from '@tabler/icons-react';

// Project Imports
import { useGetRoles, useDeleteRole, useCreateRole, useUpdateRole } from 'hooks/iam/useRoles';
import { Role } from 'types/iam/role.types';
import { RoleFormData } from 'types/iam/role.schema';
import RoleForm, { RoleFormMode } from './RoleForm';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import DataGridWrapper from 'ui-component/extended/DataGridWrapper';
import SplitActionButton from 'ui-component/extended/SplitActionButton';
import { PERMISSIONS, VisibilityScope } from 'constants/permissions';
import { usePermission } from 'contexts/AuthContext';
import { useDiscardWarning } from 'hooks/useDiscardWarning';
import MainCard from 'ui-component/cards/MainCard';

// Helper for Status Chip
const getStatusChip = (isActive?: boolean) => {
    return isActive ? (
        <Chip label="Active" color="success" size="small" variant="outlined" />
    ) : (
        <Chip label="Inactive" color="error" size="small" variant="outlined" />
    );
};

// Helper for Scope Chip
const getScopeChip = (scope: VisibilityScope) => {
    let color: 'success' | 'warning' | 'info' | 'default' = 'default';
    switch (scope) {
        case VisibilityScope.GLOBAL:
            color = 'success';
            break;
        case VisibilityScope.SUBSIDIARY:
            color = 'info';
            break;
        case VisibilityScope.CLIENT:
            color = 'warning';
            break;
    }
    return <Chip label={scope} color={color} size="small" />;
};

const RoleList = () => {
    const navigate = useNavigate();
    const { getLinkTo } = useContextualNavigation('/roles');
    const { can } = usePermission();

    // Queries & Mutations
    const { data: roles = [], isLoading } = useGetRoles();
    const { mutateAsync: deleteRole } = useDeleteRole();
    const { mutateAsync: createRole, isPending: isCreating } = useCreateRole();
    const { mutateAsync: updateRole, isPending: isUpdating } = useUpdateRole();

    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [mode, setMode] = useState<RoleFormMode>('create');
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [createDraft, setCreateDraft] = useState<Partial<RoleFormData>>({});

    // Dirty State for drawer
    const [isFormDirty, setIsFormDirty] = useState(false);

    // Discard Dialog Hook
    const { discardDialogProps, trigger } = useDiscardWarning(
        // Only warn on navigation if drawer is open and dirty (Edit Mode)
        // or potentially other criteria. For now, matching standard pattern.
        (drawerOpen && isFormDirty && mode === 'edit'),
        'You have unsaved changes. Are you sure you want to discard them?'
    );

    const handleOpenDrawer = (newMode: RoleFormMode, role: Role | null = null) => {
        const performOpen = () => {
            setMode(newMode);
            setSelectedRole(role);
            setIsFormDirty(false);
            setDrawerOpen(true);
        };

        performOpen();
    };

    const handleCloseDrawer = (event?: {}, reason?: "backdropClick" | "escapeKeyDown") => {
        const performClose = () => {
            setDrawerOpen(false);
            setIsFormDirty(false);
            setSelectedRole(null);
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
            setSelectedRole(null);
        };

        // Explicit Cancel Button Click
        if (isCreating) {
            // For create, Cancel means discard draft
            if (Object.keys(createDraft).length > 0 || isFormDirty) {
                trigger(performCancel, 'Discard new role draft? This cannot be undone.');
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

    const handleFormValuesChange = useCallback((values: Partial<RoleFormData>) => {
        if (mode === 'create') {
            setCreateDraft(prev => ({ ...prev, ...values }));
        }
    }, [mode]);

    const handleFormSubmit = async (values: any) => {
        try {
            if (mode === 'create') {
                await createRole(values);
                setCreateDraft({}); // Clear draft on success
            } else if (mode === 'edit' && selectedRole) {
                await updateRole({ id: selectedRole._id, data: values });
            }
            // Success closes drawer
            setDrawerOpen(false);
            setCreateDraft({});
            setIsFormDirty(false);
        } catch (error) {
            console.error('Operation failed', error);
        }
    };

    // --- Actions ---
    const handleCreatePage = () => navigate(getLinkTo('/roles/create'));
    const handleViewPage = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent row click
        navigate(getLinkTo(`/roles/${id}`));
    };
    const handleEditPage = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        navigate(getLinkTo(`/roles/${id}/edit`));
    };

    // Delete State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

    const handleDeleteClick = (role: Role, e: React.MouseEvent) => {
        e.stopPropagation();
        setRoleToDelete(role);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (roleToDelete) {
            await deleteRole(roleToDelete._id);
            setDeleteDialogOpen(false);
            setRoleToDelete(null);
        }
    };

    // --- Column Configuration ---
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
            minWidth: 200
        },
        {
            field: 'visibilityScope',
            headerName: 'Scope',
            flex: 0.8,
            minWidth: 150,
            renderCell: (params: GridRenderCellParams) => getScopeChip(params.value as VisibilityScope)
        },
        {
            field: 'isActive',
            headerName: 'Status',
            flex: 0.5,
            minWidth: 100,
            renderCell: (params: GridRenderCellParams) => getStatusChip(params.value as boolean)
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
                const role = params.row as Role;
                return (
                    <>
                        {can(PERMISSIONS.ROLE_VIEW) && (
                            <Tooltip title="View Details">
                                <IconButton
                                    color="primary"
                                    size="small"
                                    onClick={(e) => handleViewPage(role._id, e)}
                                >
                                    <IconEye size={18} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {can(PERMISSIONS.ROLE_EDIT) && (
                            <>
                                <Tooltip title="Edit">
                                    <IconButton
                                        color="secondary"
                                        size="small"
                                        onClick={(e) => handleEditPage(role._id, e)}
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
                                            handleOpenDrawer('edit', role);
                                        }}
                                    >
                                        <IconPencil size={18} />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                        {can(PERMISSIONS.ROLE_DELETE) && (
                            <Tooltip title="Delete">
                                <IconButton
                                    color="error"
                                    size="small"
                                    onClick={(e) => handleDeleteClick(role, e)}
                                >
                                    <IconTrash size={18} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </>
                );
            }
        }
    ], [can, handleViewPage, handleEditPage, handleDeleteClick]);

    return (
        <MainCard
            title="Roles"
            secondary={
                can(PERMISSIONS.ROLE_CREATE) && (
                    <SplitActionButton
                        primaryLabel="Create Role"
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
                rows={roles}
                columns={columns}
                loading={isLoading}
                onRowClick={(params) => handleOpenDrawer('view', params.row as Role)}
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
                            {mode === 'create' ? 'New Role' : mode === 'edit' ? 'Edit Role' : roleName(selectedRole)}
                        </Typography>
                        {mode === 'view' && selectedRole && (
                            <Stack direction="row" spacing={1}>
                                {can(PERMISSIONS.ROLE_EDIT) && (
                                    <Tooltip title="Edit">
                                        <IconButton size="small" onClick={() => setMode('edit')} color="primary">
                                            <IconEdit size={18} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {can(PERMISSIONS.ROLE_DELETE) && (
                                    <Tooltip title="Delete">
                                        <IconButton
                                            size="small"
                                            onClick={(e) => handleDeleteClick(selectedRole, e)}
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

                    <RoleForm
                        mode={mode}
                        role={selectedRole}
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
                title="Delete Role"
                content={`Are you sure you want to delete ${roleToDelete?.name}? This action cannot be undone.`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteDialogOpen(false)}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                confirmColor="error"
            />

        </MainCard>
    );
};

const roleName = (role: Role | null) => role ? role.name : 'Role Details';

export default RoleList;
