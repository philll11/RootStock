import { useNavigate, useParams } from 'react-router-dom';
import { IconButton, Stack, Tooltip, useTheme } from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import MainCard from 'ui-component/cards/MainCard';
import VarietyForm from '../VarietyForm';
import { useDeleteVariety, useGetVariety } from 'hooks/master-data/useVarieties';
import { useContextualNavigation } from 'hooks/useContextualNavigation';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';
import { useState } from 'react';
import ConfirmDialog from 'ui-component/extended/ConfirmDialog';

const VarietyViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();

  // Navigation & Permissions
  const { goBack, getLinkTo } = useContextualNavigation('/varieties');
  const { can } = usePermission();

  // Data Hooks
  const { data: variety, isLoading, error } = useGetVariety(id!);
  const { mutateAsync: deleteVariety } = useDeleteVariety();

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
      await deleteVariety(id);
      setDeleteDialogOpen(false);
      goBack();
    } catch (error) {
      console.error('Failed to delete variety', error);
    }
  };

  if (isLoading) return <MainCard title="Loading...">Loading...</MainCard>;
  if (!variety) return <MainCard title="Error">Variety not found</MainCard>;
  if (error) return <MainCard title="Error">Error loading variety</MainCard>;

  return (
    <MainCard
      title={variety.name}
      secondary={
        <Stack direction="row" spacing={1} alignItems="center">
          {can(PERMISSIONS.ORCHARD_EDIT) && (
            <Tooltip title="Edit Variety">
              <IconButton onClick={handleEdit} size="large" sx={{ color: theme.palette.primary.main }}>
                <IconEdit stroke={1.5} size="1.3rem" />
              </IconButton>
            </Tooltip>
          )}
          {can(PERMISSIONS.ORCHARD_DELETE) && (
            <Tooltip title="Delete Variety">
              <IconButton onClick={() => setDeleteDialogOpen(true)} size="large" sx={{ color: theme.palette.error.main }}>
                <IconTrash stroke={1.5} size="1.3rem" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      }
    >
      <VarietyForm mode="view" variety={variety} onSubmit={() => {}} isLoading={isLoading} onCancel={() => goBack()} />
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Variety"
        content={`Are you sure you want to delete variety "${variety.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmLabel="Delete"
        confirmColor="error"
      />
    </MainCard>
  );
};

export default VarietyViewPage;
