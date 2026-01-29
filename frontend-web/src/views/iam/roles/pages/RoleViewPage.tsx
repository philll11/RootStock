import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme, Tooltip, IconButton, Stack } from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';

// Project Imports
import MainCard from 'ui-component/cards/MainCard';
import RoleForm from '../RoleForm';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { useGetRole, useDeleteRole } from 'hooks/iam/useRoles';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';

const RoleViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();

    const { goBack, getLinkTo } = useContextualNavigation('/roles');
    const { can } = usePermission();

    // Data Hooks
    const { data: role, isLoading, error } = useGetRole(id!);
    const { mutateAsync: deleteRole } = useDeleteRole();

    // Local State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleEdit = () => {
        if (!id) return;
        navigate(getLinkTo('edit', { strategy: 'stack' }));
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteRole(id);
            setDeleteDialogOpen(false);
            goBack();
        } catch (error) {
            console.error('Failed to delete role', error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!role) return <MainCard title="Error">Role not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading role</MainCard>;

    return (
        <MainCard 
            title={role.name}
            secondary={
                <Stack direction="row" spacing={1} alignItems="center">
                    {can(PERMISSIONS.ROLE_EDIT) && (
                        <Tooltip title="Edit Role">
                            <IconButton 
                                onClick={handleEdit}
                                size="large"
                                sx={{ color: theme.palette.primary.main }}
                            >
                                <IconEdit stroke={1.5} size="1.3rem" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {can(PERMISSIONS.ROLE_DELETE) && (
                        <Tooltip title="Delete Role">
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
            <RoleForm
                mode="view"
                role={role}
                onSubmit={() => {}} 
                isLoading={isLoading}
                onCancel={goBack}
            />

            <ConfirmDialog
                open={deleteDialogOpen}
                title="Delete Role"
                content={`Are you sure you want to delete role "${role.name}"? This action cannot be undone.`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteDialogOpen(false)}
                confirmLabel="Delete"
                confirmColor="error"
            />
        </MainCard>
    );
};

export default RoleViewPage;
