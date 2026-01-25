import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainCard from 'ui-component/cards/MainCard';
import UserForm from '../UserForm';
import { useGetUser, useDeleteUser } from 'hooks/iam/useUsers';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { useTheme, Tooltip, IconButton, Stack } from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';

const UserViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();

    const { goBack, getLinkTo } = useContextualNavigation('/users');
    const { can } = usePermission();

    // Data Hooks
    const { data: user, isLoading, error } = useGetUser(id!);
    const { mutateAsync: deleteUser } = useDeleteUser();

    // Local State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleEdit = () => {
        if (!id) return;
        navigate(getLinkTo('edit', { strategy: 'stack' }));
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteUser(id);
            setDeleteDialogOpen(false);
            goBack();
        } catch (error) {
            console.error('Failed to delete user', error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!user) return <MainCard title="Error">User not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading user</MainCard>;

    return (
        <MainCard
            title={`${user.firstName} ${user.lastName}`}
            secondary={
                <Stack direction="row" spacing={1} alignItems="center">
                    {can(PERMISSIONS.USER_EDIT) && (
                        <Tooltip title="Edit User">
                            <IconButton
                                onClick={handleEdit}
                                size="large"
                                sx={{ color: theme.palette.primary.main }}
                            >
                                <IconEdit stroke={1.5} size="1.3rem" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {can(PERMISSIONS.USER_DELETE) && (
                        <Tooltip title="Delete User">
                            <IconButton
                                onClick={() => setDeleteDialogOpen(true)}
                                size="large"
                                sx={{ color: theme.palette.error.main }}
                            >
                                <IconTrash stroke={1.5} size="1.3rem" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            }
        >
            <UserForm
                mode="view"
                user={user}
                onSubmit={() => { }} // No-op
                isLoading={isLoading}
                onCancel={() => goBack()}
            />

            <ConfirmDialog
                open={deleteDialogOpen}
                title="Delete User"
                content={`Are you sure you want to delete user "${user.firstName} ${user.lastName}"? This action cannot be undone.`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteDialogOpen(false)}
                confirmLabel="Delete"
                confirmColor="error"
            />
        </MainCard>
    );
};

export default UserViewPage;
