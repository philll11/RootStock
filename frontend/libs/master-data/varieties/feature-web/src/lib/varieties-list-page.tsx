import { useState } from 'react';
import { Group, ActionIcon, Badge, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useVarieties, Variety } from '@rootstock/master-data/varieties/varieties-data-access';
import { VarietyForm, VarietyFormMode } from './variety-form';
import { 
  ConfirmModal, 
  ConfirmDiscardModal, 
  useDiscardWarning,
  PageHeader,
  DataTable,
  FormDrawer,
  DataTableColumn
} from '@rootstock/ui/web';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { palette, iconSizes, layout } from '@rootstock/ui/theme';

export function VarietiesListPage() {
  const { varietiesQuery, createVarietyMutation, updateVarietyMutation, deleteVarietyMutation } = useVarieties();
  const { data: varieties, isLoading } = varietiesQuery;
  const { can } = usePermission();
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const [mode, setMode] = useState<VarietyFormMode>('create');
  const [selectedVariety, setSelectedVariety] = useState<Variety | null>(null);
  const [varietyToDelete, setVarietyToDelete] = useState<Variety | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);

  const { handleAction: handleCloseWithWarning, modalProps } = useDiscardWarning(isFormDirty);
  
  const [sortState, setSortState] = useState<{ accessor: string; direction: 'asc' | 'desc' }>({ accessor: 'name', direction: 'asc' });

  const handleCreate = () => {
    setMode('create');
    setSelectedVariety(null);
    setIsFormDirty(false);
    open();
  };

  const handleView = (variety: Variety) => {
    setMode('view');
    setSelectedVariety(variety);
    setIsFormDirty(false);
    open();
  };

  const handleEdit = (variety: Variety, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMode('edit');
    setSelectedVariety(variety);
    setIsFormDirty(false);
    open();
  };

  const handleDeleteClick = (variety: Variety, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVarietyToDelete(variety);
    openDeleteModal();
  };

  const handleConfirmDelete = () => {
    if (varietyToDelete) {
      deleteVarietyMutation.mutate(varietyToDelete._id);
      closeDeleteModal();
      setVarietyToDelete(null);
    }
  };

  const handleSubmit = (values: any) => {
    if (mode === 'create') {
      createVarietyMutation.mutate(values, {
        onSuccess: () => {
          close();
        },
      });
    } else if (mode === 'edit' && selectedVariety) {
      updateVarietyMutation.mutate({ id: selectedVariety._id, data: values }, {
        onSuccess: () => {
          close();
        },
      });
    }
  };

  const handleClose = () => {
    handleCloseWithWarning(close);
  };

  const getDrawerTitle = () => {
    switch (mode) {
      case 'create': return 'Create Variety';
      case 'edit': return 'Edit Variety';
      case 'view': return 'Variety Details';
      default: return '';
    }
  };

  const columns: DataTableColumn<Variety>[] = [
    { accessor: 'name', title: 'Name', sortable: true },
    { accessor: 'recordId', title: 'Record ID', sortable: true },
    {
      accessor: 'isActive',
      title: 'Status',
      render: (variety) => (
        <Badge color={variety.isActive ? 'brand' : 'neutral'} variant="light">
          {variety.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      accessor: 'actions',
      title: '',
      align: 'right',
      render: (variety) => (
        <Group gap={0} justify="flex-end">
          {can(PERMISSIONS.VARIETY_EDIT) && (
            <ActionIcon variant="subtle" color={palette.actions.edit} onClick={(e) => handleEdit(variety, e)}>
              <IconEdit size={iconSizes.md} />
            </ActionIcon>
          )}
          {can(PERMISSIONS.VARIETY_DELETE) && (
            <ActionIcon variant="subtle" color={palette.actions.delete} onClick={(e) => handleDeleteClick(variety, e)}>
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )}
        </Group>
      )
    }
  ];

  const sortedVarieties = varieties ? [...varieties].sort((a, b) => {
    const { accessor, direction } = sortState;
    const aValue = (a as any)[accessor] || '';
    const bValue = (b as any)[accessor] || '';
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  }) : undefined;

  return (
    <>
      <PageHeader 
        title="Varieties"
        actionLabel="Add Variety"
        onActionClick={can(PERMISSIONS.VARIETY_CREATE) ? handleCreate : undefined}
      />

      <DataTable 
        data={sortedVarieties}
        columns={columns}
        isLoading={isLoading}
        onRowClick={handleView}
        noDataMessage="No varieties found."
        onSort={(accessor, direction) => setSortState({ accessor, direction })}
        initialSort={sortState}
      />

      <FormDrawer
        opened={opened}
        onClose={handleClose}
        title={getDrawerTitle()}
        size={layout.drawers.form}
        isLoading={createVarietyMutation.isPending || updateVarietyMutation.isPending}
      >
        <VarietyForm
          mode={mode}
          initialValues={selectedVariety}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          onEdit={() => setMode('edit')}
          isLoading={createVarietyMutation.isPending || updateVarietyMutation.isPending}
          onDirtyChange={setIsFormDirty}
        />
      </FormDrawer>

      <ConfirmDiscardModal {...modalProps} />

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Variety"
        message={`Are you sure you want to delete variety "${varietyToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </>
  );
}