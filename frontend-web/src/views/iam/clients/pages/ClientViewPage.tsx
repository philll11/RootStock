import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stack, IconButton, Tooltip, useTheme } from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';

// Project Imports
import { useGetClient, useDeleteClient } from 'hooks/iam/useClients';
import ClientForm from '../ClientForm';
import MainCard from 'ui-component/cards/MainCard';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { usePermission } from 'contexts/AuthContext';

import { PERMISSIONS } from 'constants/permissions';

const ClientViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    
    // Navigation & Permissions
    const { goBack, getLinkTo } = useContextualNavigation('/clients');
    const { can } = usePermission();

    // Data Hooks
    const { data: client, isLoading, error } = useGetClient(id!);
    const { mutateAsync: deleteClient } = useDeleteClient();

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
            await deleteClient(id);
            setDeleteDialogOpen(false);
            goBack();
        } catch (error) {
            console.error('Failed to delete client', error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!client) return <MainCard title="Error">Client not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading client</MainCard>;

    return (
        <MainCard 
            title={client.name}
            secondary={
                <Stack direction="row" spacing={1} alignItems="center">
                    {can(PERMISSIONS.CLIENT_EDIT) && (
                        <Tooltip title="Edit Client">
                            <IconButton 
                                onClick={handleEdit}
                                size="large"
                                sx={{ color: theme.palette.primary.main }}
                            >
                                <IconEdit stroke={1.5} size="1.3rem" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {can(PERMISSIONS.CLIENT_DELETE) && (
                        <Tooltip title="Delete Client">
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
            <ClientForm
                mode="view"
                client={client}
                onSubmit={() => {}}
                isLoading={isLoading}
                onCancel={() => goBack()}
            />
        <ConfirmDialog
            open={deleteDialogOpen}
            title="Delete Client"
            content={`Are you sure you want to delete client "${client.name}"? This action cannot be undone.`}
            onConfirm={handleDelete}
            onCancel={() => setDeleteDialogOpen(false)}
            confirmLabel="Delete"
            confirmColor="error"
        />
        </MainCard>

    );
};

export default ClientViewPage;
