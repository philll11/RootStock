import { useNavigate, useParams } from 'react-router-dom';
import { IconButton, Stack, Tooltip, useTheme } from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';
import AssessmentForm from '../AssessmentForm';
import { useDeleteAssessment, useGetAssessment } from 'hooks/operations/useAssessments';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import { useState } from 'react';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';

const AssessmentViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();

    // Navigation & Permissions
    const { goBack, getLinkTo } = useContextualNavigation('/assessments');
    const { can } = usePermission();

    // Data Hooks
    const { data: assessment, isLoading, error } = useGetAssessment(id!);
    const { mutateAsync: deleteAssessment } = useDeleteAssessment();

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
            await deleteAssessment(id);
            setDeleteDialogOpen(false);
            goBack();
        } catch (error) {
            console.error('Failed to delete assessment', error);
        }
    };

    if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
    if (!assessment) return <MainCard title="Error">Assessment not found</MainCard>;
    if (error) return <MainCard title="Error">Error loading assessment</MainCard>;


    return (
        <MainCard
            title={assessment.name}
            secondary={
                <Stack direction="row" spacing={1} alignItems="center">
                    {can(PERMISSIONS.ORCHARD_EDIT) && (
                        <Tooltip title="Edit Assessment">
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
                        <Tooltip title="Delete Assessment">
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
            <AssessmentForm
                mode="view"
                assessment={assessment}
                onSubmit={() => { }}
                isLoading={isLoading}
                onCancel={() => goBack()}
            />
            <ConfirmDialog
                open={deleteDialogOpen}
                title="Delete Assessment"
                content={`Are you sure you want to delete assessment "${assessment.name}"? This action cannot be undone.`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteDialogOpen(false)}
                confirmLabel="Delete"
                confirmColor="error"
            />
        </MainCard>

    );
};

export default AssessmentViewPage;
