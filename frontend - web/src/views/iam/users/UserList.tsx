import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Chip,
    Avatar,
    Drawer,
    Tooltip,
    IconButton,
    Divider,
    Stack
} from '@mui/material';
import {
    GridColDef,
    GridRenderCellParams,
} from '@mui/x-data-grid';
import { IconEdit, IconTrash, IconEye, IconPlus, IconExternalLink, IconPencil } from '@tabler/icons-react';

// Project Imports
import { useGetUsers, useDeleteUser, useCreateUser, useUpdateUser } from 'hooks/iam/useUsers';
import { User, UserType } from 'types/iam/user.types';
import { UserFormData } from 'types/iam/user.schema';
import UserForm, { UserFormMode } from './UserForm';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import DataGridWrapper from 'ui-component/extended/DataGridWrapper';
import SplitActionButton from 'ui-component/extended/SplitActionButton';
import { PERMISSIONS } from 'constants/permissions';
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

const getInitials = (first: string, last: string) => {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
};

const userName = (user: User | null) => {
    if (!user) return 'User Details';
    return `${user.firstName} ${user.lastName}`;
}

const UserList = () => {
    const navigate = useNavigate();
    const { getLinkTo } = useContextualNavigation('/users');
    const { can } = usePermission();

    // Queries & Mutations
    const { data: users = [], isLoading } = useGetUsers();
    const { mutateAsync: deleteUser } = useDeleteUser();
    const { mutateAsync: createUser, isPending: isCreating } = useCreateUser();
    const { mutateAsync: updateUser, isPending: isUpdating } = useUpdateUser();

    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [mode, setMode] = useState<UserFormMode>('create');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [createDraft, setCreateDraft] = useState<Partial<UserFormData>>({});

    // Dirty State for drawer
    const [isFormDirty, setIsFormDirty] = useState(false);

    // Discard Dialog
    const { discardDialogProps, trigger } = useDiscardWarning(
        (drawerOpen && isFormDirty && mode === 'edit'),
        'You have unsaved changes. Are you sure you want to discard them?'
    );

    const handleOpenDrawer = (newMode: UserFormMode, user: User | null = null) => {
        setMode(newMode);
        setSelectedUser(user);
        setIsFormDirty(false);
        setDrawerOpen(true);
    };

    const handleCloseDrawer = (event?: {}, reason?: "backdropClick" | "escapeKeyDown") => {
        const performClose = () => {
            setDrawerOpen(false);
            setIsFormDirty(false);
            setSelectedUser(null);
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
            setSelectedUser(null);
        };

        // Explicit Cancel Button Click
        if (isCreating) {
            // For create, Cancel means discard draft
            if (Object.keys(createDraft).length > 0 || isFormDirty) {
                trigger(performCancel, 'Discard new user draft? This cannot be undone.');
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

    const handleFormValuesChange = useCallback((values: Partial<UserFormData>) => {
        if (mode === 'create') {
            setCreateDraft(prev => ({ ...prev, ...values }));
        }
    }, [mode]);

    // Form Submit Handler
    const handleFormSubmit = async (values: any) => {
        try {
            if (mode === 'create') {
                await createUser(values);
            } else if (mode === 'edit' && selectedUser) {
                await updateUser({ id: selectedUser._id, data: values });
            }
            setDrawerOpen(false);
            setCreateDraft({});
            setIsFormDirty(false);
        } catch (error) {
            // Error is handled by hook notifications
        }
    };

    // --- Actions ---
    const handleCreatePage = () => navigate(getLinkTo('/users/create'));
    const handleViewPage = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent row click
        navigate(getLinkTo(`/users/${id}`));
    };
    const handleEditPage = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        navigate(getLinkTo(`/users/${id}/edit`));
    };


    // Delete State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    const handleDeleteClick = (user: User, e: React.MouseEvent) => {
        e.stopPropagation();
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (userToDelete) {
            await deleteUser(userToDelete._id);
            setDeleteDialogOpen(false);
            setUserToDelete(null);
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
            headerName: 'User',
            flex: 2,
            minWidth: 200,
            renderCell: (params: GridRenderCellParams) => {
                const user = params.row as User;
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar>{getInitials(user.firstName, user.lastName)}</Avatar>
                        <Box>
                            <Typography variant="subtitle1">{user.firstName} {user.lastName}</Typography>
                            <Typography variant="caption" color="textSecondary">{user.email}</Typography>
                        </Box>
                    </Box>
                );
            }
        },
        {
            field: 'userType',
            headerName: 'Type',
            flex: 0.8,
            minWidth: 100,
            renderCell: (params) => (
                <Chip
                    label={params.value === UserType.Employee ? 'Employee' : 'Contact'}
                    color="secondary"
                    variant="outlined"
                    size="small"
                />
            )
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
                const user = params.row as User;
                return (
                    <>
                        {can(PERMISSIONS.USER_VIEW) && (
                            <Tooltip title="View Details">
                                <IconButton
                                    color="primary"
                                    size="small"
                                    onClick={(e) => handleViewPage(user._id, e)}
                                >
                                    <IconEye size={18} />
                                </IconButton>
                            </Tooltip>
                        )}
                        {can(PERMISSIONS.USER_EDIT) && (
                            <>
                                <Tooltip title="Edit">
                                    <IconButton
                                        color="secondary"
                                        size="small"
                                        onClick={(e) => handleEditPage(user._id, e)}
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
                                            handleOpenDrawer('edit', user);
                                        }}
                                    >
                                        <IconPencil size={18} />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                        {can(PERMISSIONS.USER_DELETE) && (
                            <Tooltip title="Delete">
                                <IconButton
                                    color="error"
                                    size="small"
                                    onClick={(e) => handleDeleteClick(user, e)}
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
            title="Users"
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
                rows={users}
                columns={columns}
                loading={isLoading}
                onRowClick={(params) => handleOpenDrawer('view', params.row as User)}
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
                            {mode === 'create' ? 'New User' : mode === 'edit' ? 'Edit User' : userName(selectedUser)}
                        </Typography>
                        {mode === 'view' && selectedUser && (
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
                                            onClick={(e) => handleDeleteClick(selectedUser, e)}
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

                    <UserForm
                        mode={mode}
                        user={selectedUser}
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
                title="Delete User"
                content={`Are you sure you want to delete ${userName(selectedUser)}? This action cannot be undone.`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteDialogOpen(false)}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                confirmColor="error"
            />

        </MainCard>
    );
};


export default UserList;
