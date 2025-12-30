import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Group, ActionIcon, Badge, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconFilePlus, IconEdit, IconTrash, IconEye, IconLayoutSidebarRight, IconPlus } from '@tabler/icons-react';

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
import { palette, iconSizes, layout } from '@rootstock/ui/theme';
import {
  useGetOrchards,
  useCreateOrchard,
  useUpdateOrchard,
  useDeleteOrchard,
  Orchard,
  CreateOrchardDto,
  UpdateOrchardDto,
} from '@rootstock/assets/orchards/orchards-data-access';
import { OrchardForm, OrchardFormMode } from './orchard-form';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function OrchardsListPage() {
  const { data: orchards = [], isLoading } = useGetOrchards();
  const { mutateAsync: createOrchard, isPending: isCreating } = useCreateOrchard();
  const { mutateAsync: updateOrchard, isPending: isUpdating } = useUpdateOrchard();
  const { mutateAsync: deleteOrchard } = useDeleteOrchard();
  const { can } = usePermission();
  const [opened, { open, close }] = useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  
  const navigate = useNavigate();
  const { getLinkTo } = useContextualNavigation();

  const [mode, setMode] = useState<OrchardFormMode>('create');
  const [selectedOrchard, setSelectedOrchard] = useState<Orchard | null>(null);

  const [createFormDraft, setCreateFormDraft] = useState<Partial<CreateOrchardDto>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);

  const { handleAction: handleCloseWithWarning, modalProps } = useDiscardWarning(isFormDirty && mode === 'edit');
  
  const [sortState, setSortState] = useState<{
    accessor: string;
    direction: 'asc' | 'desc';
  }>({ accessor: 'name', direction: 'asc' });

  const handleCreate = () => {
    setMode('create');
    setSelectedOrchard(null);
    setIsFormDirty(false);
    open();
  };

  const handleCreatePage = () => {
    navigate(getLinkTo('/orchards/new'));
  };

  const handleViewPage = (orchard: Orchard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/orchards/${orchard._id}`));
  };
  
  const handleEditPage = (orchard: Orchard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/orchards/${orchard._id}/edit`));
  };

  const handleView = (orchard: Orchard) => {
    setMode('view');
    setSelectedOrchard(orchard);
    setIsFormDirty(false);
    open();
  };
  const handleEdit = (orchard: Orchard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMode('edit');
    setSelectedOrchard(orchard);
    setIsFormDirty(false);
    open();
  };

  const handleClose = () => {
    handleCloseWithWarning(() => {
      setIsFormDirty(false);
      close();
    });
  };

  const handleDeleteClick = (orchard: Orchard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedOrchard(orchard);
    openDeleteModal();
  };

  const handleConfirmDelete = async () => {
    if (selectedOrchard) {
      try {
        await deleteOrchard(selectedOrchard._id);
        closeDeleteModal();
      } catch (error: any) {
        // Error handling is done in the hook via notify
      }
    }
  };

  const handleSubmit = async (values: CreateOrchardDto | UpdateOrchardDto) => {
    try {
      if (mode === 'create') {
        await createOrchard(values as CreateOrchardDto);
        setCreateFormDraft({});
      } else {
        if (selectedOrchard) {
          await updateOrchard({
            id: selectedOrchard._id,
            data: values as UpdateOrchardDto,
          });
        }
      }
      close();
    } catch (error) {
      // Error handling is done in the hook via notify
    }
  };
  
  const getDrawerTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create Orchard';
      case 'edit':
        return 'Edit Orchard';
      case 'view':
        return 'Orchard Details';
      default:
        return '';
    }
  };

  const columns: DataTableColumn<Orchard>[] = [
    { accessor: 'recordId', title: 'ID', sortable: true },
    { accessor: 'name', title: 'Name', sortable: true },
    {
      accessor: 'clientId',
      title: 'Client',
      sortable: true,
      render: (orchard) => typeof orchard.clientId === 'object' ? orchard.clientId.name : 'Unknown Client',
    },
    {
      accessor: 'isActive',
      title: 'Status',
      render: (orchard) => (
        <Badge color={orchard.isActive ? 'brand' : 'neutral'} variant="light">
          {orchard.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessor: 'actions',
      title: '',
      align: 'right',
      render: (orchard) => (
        <Group gap={0} justify="flex-end">
          {can(PERMISSIONS.ORCHARD_VIEW) && (
          <ActionIcon
            variant="subtle"
            color={palette.actions.view}
            onClick={(e) => handleViewPage(orchard, e)}
            title="View Page"
          >
            <IconEye size={iconSizes.md} />
          </ActionIcon>
          )}
          {can(PERMISSIONS.ORCHARD_EDIT) && (
            <>
              <ActionIcon
                variant="subtle"
                color={palette.actions.edit}
                onClick={(e) => handleEditPage(orchard, e)}
                title="Edit Page"
              >
                <IconEdit size={iconSizes.md} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color={palette.actions.edit}
                onClick={(e) => handleEdit(orchard, e)}
                title="Quick Edit"
              >
                <IconLayoutSidebarRight size={iconSizes.md} />
              </ActionIcon>
            </>
          )}
          {can(PERMISSIONS.ORCHARD_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.delete}
              onClick={(e) => handleDeleteClick(orchard, e)}
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )}
        </Group>
      ),
    },
  ];

  const sortedOrchards = orchards
    ? [...orchards].sort((a, b) => {
        const { accessor, direction } = sortState;
        let aValue = (a as any)[accessor];
        let bValue = (b as any)[accessor];

        if (accessor === 'clientId') {
          aValue = typeof a.clientId === 'object' ? a.clientId.name : '';
          bValue = typeof b.clientId === 'object' ? b.clientId.name : '';
        }

        aValue = aValue || '';
        bValue = bValue || '';

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
      })
    : undefined;

  return (
    <>
      <PageHeader
        title="Orchards"
        action={
          can(PERMISSIONS.ORCHARD_CREATE) ? (
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
        data={sortedOrchards}
        columns={columns}
        isLoading={isLoading}
        onRowClick={handleView}
        noDataMessage="No orchards found."
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
        <OrchardForm
          key={opened ? 'opened' : 'closed'}
          mode={mode}
          orchard={selectedOrchard}
          initialValues={createFormDraft}
          onSubmit={handleSubmit}
          isLoading={isCreating || isUpdating}
          onCancel={handleClose}
          onEdit={() => setMode('edit')}
          onValuesChange={setCreateFormDraft}
          onDirtyChange={setIsFormDirty}
        />
      </FormDrawer>

      <ConfirmDiscardModal {...modalProps} />

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Orchard"
        message={`Are you sure you want to delete "${selectedOrchard?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </>
  );
}
