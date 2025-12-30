// frontend/libs/users/feature-web/src/lib/users-list-page.tsx
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
  useClients,
  Client,
  CreateClientDto,
  UpdateClientDto,
} from '@rootstock/clients/clients-data-access';
import { ClientForm, ClientFormMode } from './client-form';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function ClientsListPage() {
  const {
    clients,
    isLoading,
    createClient,
    updateClient,
    deleteClient,
    isCreating,
    isUpdating,
  } = useClients();
  const { can } = usePermission();
  const [opened, { open, close }] = useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  const navigate = useNavigate();
  const { getLinkTo } = useContextualNavigation();

  const [mode, setMode] = useState<ClientFormMode>('create');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [createFormDraft, setCreateFormDraft] = useState<Partial<CreateClientDto>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);

  const { handleAction: handleCloseWithWarning, modalProps } = useDiscardWarning(isFormDirty && mode === 'edit');

  const [sortState, setSortState] = useState<{
    accessor: string;
    direction: 'asc' | 'desc';
  }>({ accessor: 'name', direction: 'asc' });

  const handleCreate = () => {
    setMode('create');
    setSelectedClient(null);
    setIsFormDirty(false);
    open();
  };

  const handleCreatePage = () => {
    navigate(getLinkTo('/clients/new'));
  };

  const handleViewPage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/clients/${id}`));
  };

  const handleEditPage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/clients/${id}/edit`));
  };

  const handleView = (client: Client) => {
    setMode('view');
    setSelectedClient(client);
    setIsFormDirty(false);
    open();
  };
  const handleEdit = (client: Client, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMode('edit');
    setSelectedClient(client);
    setIsFormDirty(false);
    open();
  };

  const handleClose = () => {
    handleCloseWithWarning(() => {
      setIsFormDirty(false);
      close();
    });
  };


  const handleDeleteClick = (client: Client, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedClient(client);
    openDeleteModal();
  };

  const handleConfirmDelete = async () => {
    if (selectedClient) {
      try {
        await deleteClient(selectedClient._id);
        closeDeleteModal();
      } catch (error: any) {
        // Error handling is done in the hook via notify
      }
    }
  };

  const handleSubmit = async (values: CreateClientDto | UpdateClientDto) => {
    try {
      if (mode === 'create') {
        await createClient(values as CreateClientDto);
        setCreateFormDraft({});
      } else {
        if (selectedClient) {
          await updateClient({
            id: selectedClient._id,
            data: values as UpdateClientDto,
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
        return 'Create Client';
      case 'edit':
        return 'Edit Client';
      case 'view':
        return 'Client Details';
      default:
        return '';
    }
  };

  const columns: DataTableColumn<Client>[] = [
    { accessor: 'recordId', title: 'ID', sortable: true },
    { accessor: 'name', title: 'Name', sortable: true },
    {
      accessor: 'isActive',
      title: 'Status',
      render: (client) => (
        <Badge color={client.isActive ? 'brand' : 'neutral'} variant="light">
          {client.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessor: 'actions',
      title: '',
      align: 'right',
      render: (client) => (
        <Group gap={0} justify="flex-end">
          {can(PERMISSIONS.CLIENT_VIEW) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.view}
              onClick={(e) => handleViewPage(client._id, e)}
              title="View Page"
            >
              <IconEye size={iconSizes.md} />
            </ActionIcon>
          )}
          {can(PERMISSIONS.CLIENT_EDIT) && (
            <>
              <ActionIcon
                variant="subtle"
                color={palette.actions.edit}
                onClick={(e) => handleEditPage(client._id, e)}
                title="Edit Page"
              >
                <IconEdit size={iconSizes.md} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color={palette.actions.edit}
                onClick={(e) => handleEdit(client, e)}
                title="Quick Edit"
              >
                <IconLayoutSidebarRight size={iconSizes.md} />
              </ActionIcon>
            </>
          )}
          {can(PERMISSIONS.CLIENT_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.delete}
              onClick={(e) => handleDeleteClick(client, e)}
              title="Delete Client"
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )}
        </Group>
      ),
    },
  ];

  const sortedClients = clients ? [...clients].sort((a, b) => {
    const { accessor, direction } = sortState;
    const aValue = (a as any)[accessor] || '';
    const bValue = (b as any)[accessor] || '';

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
        title="Clients"
        action={
          can(PERMISSIONS.CLIENT_CREATE) ? (
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
        data={sortedClients}
        columns={columns}
        isLoading={isLoading}
        onRowClick={handleView}
        noDataMessage="No clients found."
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
        <ClientForm
          key={opened ? 'opened' : 'closed'}
          mode={mode}
          client={selectedClient}
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
        title="Delete Client"
        message={`Are you sure you want to delete "${selectedClient?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </>
  );
}
