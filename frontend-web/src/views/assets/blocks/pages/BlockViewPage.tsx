import { useNavigate, useParams } from 'react-router-dom';
import { IconButton, Stack, Tooltip, useTheme } from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';
import BlockForm from '../BlockForm';
import { useDeleteBlock, useGetBlock } from 'hooks/assets/useBlocks';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import { useState } from 'react';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';

const BlockViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    
    // Navigation & Permissions
    const { goBack, getLinkTo } = useContextualNavigation('/blocks');
    const { can } = usePermission();

    // Data Hooks
    const { data: block, isLoading, error } = useGetBlock(id!);
    const { mutateAsync: deleteBlock } = useDeleteBlock();

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
            await deleteBlock(id);
            setDeleteDialogOpen(false);
            goBack();
        } catch (error) {
            console.error('Failed to delete block', error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!block) return <MainCard title="Error">Block not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading block</MainCard>;


    return (
        <MainCard 
            title={block.name}
            secondary={
                <Stack direction="row" spacing={1} alignItems="center">
                    {can(PERMISSIONS.ORCHARD_EDIT) && (
                            <Tooltip title="Edit Block">
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
                        <Tooltip title="Delete Block">
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
            <BlockForm
                mode="view"
                block={block}
                onSubmit={() => {}}
                isLoading={isLoading}
                onCancel={() => goBack()}
            />
        <ConfirmDialog
            open={deleteDialogOpen}
            title="Delete Block"
            content={`Are you sure you want to delete block "${block.name}"? This action cannot be undone.`}
            onConfirm={handleDelete}
            onCancel={() => setDeleteDialogOpen(false)}
            confirmLabel="Delete"
            confirmColor="error"
        />
        </MainCard>

    );
};

export default BlockViewPage;
