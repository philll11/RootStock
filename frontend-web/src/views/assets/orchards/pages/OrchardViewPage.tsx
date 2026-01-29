import { useNavigate, useParams } from 'react-router-dom';
import { IconButton, Stack, Tooltip, useTheme } from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';
import OrchardForm from '../OrchardForm';
import { useDeleteOrchard, useGetOrchard } from 'hooks/assets/useOrchards';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import { useState } from 'react';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';

const OrchardViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    
    // Navigation & Permissions
    const { goBack, getLinkTo } = useContextualNavigation('/orchards');
    const { can } = usePermission();

    // Data Hooks
    const { data: orchard, isLoading, error } = useGetOrchard(id!);
    const { mutateAsync: deleteOrchard } = useDeleteOrchard();

    // Local State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Handlers
    const handleEdit = () => {
        if (!id) return;
        navigate(getLinkTo('edit', { strategy: 'stack' }));
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteOrchard(id);
            setDeleteDialogOpen(false);
            goBack();
        } catch (error) {
            console.error('Failed to delete orchard', error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!orchard) return <MainCard title="Error">Orchard not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading orchard</MainCard>;


    return (
        <MainCard 
            title={orchard.name}
            secondary={
                <Stack direction="row" spacing={1} alignItems="center">
                    {can(PERMISSIONS.ORCHARD_EDIT) && (
                            <Tooltip title="Edit Orchard">
                                <IconButton 
                                onClick={handleEdit}
                                size="large"
                                sx={{ color: theme.palette.primary.main }}
                            >
                                <IconEdit stroke={1.5} size="1.3rem" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {can(PERMISSIONS.ORCHARD_DELETE) && (
                        <Tooltip title="Delete Orchard">
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
            <OrchardForm
                mode="view"
                orchard={orchard}
                onSubmit={() => {}}
                isLoading={isLoading}
                onCancel={() => goBack()}
            />
        <ConfirmDialog
            open={deleteDialogOpen}
            title="Delete Orchard"
            content={`Are you sure you want to delete orchard "${orchard.name}"? This action cannot be undone.`}
            onConfirm={handleDelete}
            onCancel={() => setDeleteDialogOpen(false)}
            confirmLabel="Delete"
            confirmColor="error"
        />
        </MainCard>

    );
};

export default OrchardViewPage;
