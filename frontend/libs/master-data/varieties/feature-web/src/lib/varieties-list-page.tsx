import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Group, ActionIcon, Badge, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconEye, IconLayoutSidebarRight, IconPlus, IconFilePlus } from '@tabler/icons-react';
import { useGetVarieties, useCreateVariety, useUpdateVariety, useDeleteVariety, Variety, VarietyFormData } from '@rootstock/master-data/varieties/varieties-data-access';
import { VarietyForm, VarietyFormMode } from './variety-form';
import { 
  ConfirmModal, 
  ConfirmDiscardModal, 
  useDiscardWarning,
  PageHeader,
  DataTable,
  FormDrawer,
  DataTableColumn,
  ActionSplitButton,
  useContextualNavigation,
} from '@rootstock/ui/web';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { palette, iconSizes, layout } from '@rootstock/ui/theme';

export function VarietiesListPage() {
  const navigate = useNavigate();
  const { getLinkTo } = useContextualNavigation();
  const { data: varieties, isLoading: isVarietiesLoading } = useGetVarieties();
  const { mutateAsync: createVariety, isPending: isCreating } = useCreateVariety();
  const { mutateAsync: updateVariety, isPending: isUpdating } = useUpdateVariety();
  const { mutateAsync: deleteVariety } = useDeleteVariety();

  const { can } = usePermission();
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const [mode, setMode] = useState<VarietyFormMode>('create');
  const [selectedVariety, setSelectedVariety] = useState<Variety | null>(null);
  const [varietyToDelete, setVarietyToDelete] = useState<Variety | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [createFormDraft, setCreateFormDraft] = useState<Partial<VarietyFormData>>({});

  const { handleAction: handleCloseWithWarning, modalProps } = useDiscardWarning(isFormDirty && mode === 'edit');
  
  const [sortState, setSortState] = useState<{ accessor: string; direction: 'asc' | 'desc' }>({ accessor: 'name', direction: 'asc' });

  const handleCreate = () => {
    setMode('create');
    setSelectedVariety(null);
    setIsFormDirty(false);
    open();
  };

  const handleCreatePage = () => {
    navigate(getLinkTo('/varieties/new'));
  };

  const handleView = (variety: Variety) => {
    setMode('view');
    setSelectedVariety(variety);
    setIsFormDirty(false);
    open();
  };

  const handleViewPage = (variety: Variety, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/varieties/${variety._id}`));
  };

  const handleEdit = (variety: Variety, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMode('edit');
    setSelectedVariety(variety);
    setIsFormDirty(false);
    open();
  };

  const handleEditPage = (variety: Variety, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/varieties/${variety._id}/edit`));
  };

  const handleDeleteClick = (variety: Variety, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVarietyToDelete(variety);
    openDeleteModal();
  };

  const handleConfirmDelete = () => {
    if (varietyToDelete) {
      deleteVariety(varietyToDelete._id);
      closeDeleteModal();
      setVarietyToDelete(null);
    }
  };

  const handleSubmit = (values: VarietyFormData) => {
    if (mode === 'create') {
      const { isActive, __v, ...createData } = values;
      createVariety(createData, {
        onSuccess: () => {
          close();
          setCreateFormDraft({});
        },
      });
    } else if (mode === 'edit' && selectedVariety) {
      updateVariety({ 
        id: selectedVariety._id, 
        data: {
          ...values,
          __v: selectedVariety.__v
        } 
      }, {
        onSuccess: () => {
          close();
        },
      });
    }
  };

  const handleClose = () => {
    handleCloseWithWarning(() => {
      setIsFormDirty(false);
      close();
    });
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
    { accessor: 'recordId', title: 'ID', sortable: true },
    { accessor: 'name', title: 'Name', sortable: true },
    {
      accessor: 'isActive',
      title: 'Status',
      render: (variety) => (
        <Badge color={variety.isActive ? palette.state.active : palette.state.inactive} variant="light">
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
          <ActionIcon
            variant="subtle"
            color={palette.icons.view}
            onClick={(e) => handleViewPage(variety, e)}
            title="View Page"
          >
            <IconEye size={iconSizes.md} />
          </ActionIcon>
          {can(PERMISSIONS.VARIETY_EDIT) && (
            <>
              <ActionIcon
                variant="subtle"
                color={palette.icons.edit}
                onClick={(e) => handleEditPage(variety, e)}
                title="Edit Page"
              >
                <IconEdit size={iconSizes.md} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color={palette.icons.edit}
                onClick={(e) => handleEdit(variety, e)}
                title="Quick Edit"
              >
                <IconLayoutSidebarRight size={iconSizes.md} />
              </ActionIcon>
            </>
          )}
          {can(PERMISSIONS.VARIETY_DELETE) && (
            <ActionIcon variant="subtle" color={palette.icons.delete} onClick={(e) => handleDeleteClick(variety, e)}>
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
        action={
          can(PERMISSIONS.VARIETY_CREATE) ? (
            <ActionSplitButton
              mainLabel="Create"
              onMainClick={handleCreate}
              mainIcon={<IconPlus size={iconSizes.md} />}
              options={[
                {
                  label: 'Create in New Page',
                  onClick: handleCreatePage,
                  icon: <IconFilePlus size={iconSizes.md} />,
                },
              ]}
            />
          ) : undefined
        }
      />

      <DataTable 
        data={sortedVarieties}
        columns={columns}
        isLoading={isVarietiesLoading}
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
        isLoading={isCreating || isUpdating}
      >
        <VarietyForm
          key={opened ? 'opened' : 'closed'}
          mode={mode}
          variety={selectedVariety}
          initialValues={createFormDraft}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          onEdit={() => setMode('edit')}
          isLoading={isCreating || isUpdating}
          onDirtyChange={setIsFormDirty}
          onValuesChange={setCreateFormDraft}
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
        confirmColor={palette.icons.delete}
      />
    </>
  );
}
