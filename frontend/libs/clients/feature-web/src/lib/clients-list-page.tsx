// frontend/libs/users/feature-web/src/lib/users-list-page.tsx
import { useState } from 'react';
import { Group, ActionIcon, Badge, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useClients, Client, CreateClientDto, UpdateClientDto } from '@rootstock/clients/clients-data-access';
import { ClientForm, ClientFormMode } from './client-form';
import { 
  ConfirmModal, 
  ConfirmDiscardModal, 
  useDiscardWarning,
  PageHeader,
  DataTable,
  FormDrawer,
  DataTableColumn
} from '@rootstock/ui/web';
import { palette, iconSizes, layout } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function ClientsListPage() {
  const { clients, isLoading, createClient, updateClient, deleteClient, isCreating, isUpdating } = useClients();
  const { can } = usePermission();
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  
  const [mode, setMode] = useState<ClientFormMode>('create');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  const [createFormDraft, setCreateFormDraft] = useState<Partial<CreateClientDto>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { handleAction: handleCloseWithWarning, modalProps } = useDiscardWarning(isFormDirty);
  
  const [sortState, setSortState] = useState<{ accessor: string; direction: 'asc' | 'desc' }>({ accessor: 'name', direction: 'asc' });

  const handleCreate = () => {
    setMode('create');
    setSelectedClient(null);
    setIsFormDirty(false);
    open();
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

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setClientToDelete(id);
    openDeleteModal();
  };

  const handleConfirmDelete = async () => {
    if (clientToDelete) {
      await deleteClient(clientToDelete);
      closeDeleteModal();
      setClientToDelete(null);
    }
  };

  const handleSubmit = async (values: CreateClientDto | UpdateClientDto) => {
    try {
      if (mode === 'edit' && selectedClient) {
        await updateClient({ id: selectedClient._id, data: values as UpdateClientDto });
      } else if (mode === 'create') {
        await createClient(values as CreateClientDto);
        setCreateFormDraft({}); // Clear draft after successful creation
      }
      close();
    } catch (error) {
      console.error('Failed to save client', error);
    }
  };

  const getDrawerTitle = () => {
    switch (mode) {
      case 'create': return 'Create Client';
      case 'edit': return 'Edit Client';
      case 'view': return 'Client Details';
      default: return '';
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
      )
    },
    {
      accessor: 'actions',
      title: '',
      align: 'right',
      render: (client) => (
        <Group gap={0} justify="flex-end">
          {can(PERMISSIONS.CLIENT_EDIT) && (
            <ActionIcon variant="subtle" color={palette.actions.edit} onClick={(e) => handleEdit(client, e)}>
              <IconEdit size={iconSizes.md} />
            </ActionIcon>
          )}
          {can(PERMISSIONS.CLIENT_DELETE) && (
            <ActionIcon variant="subtle" color={palette.actions.delete} onClick={(e) => handleDelete(client._id, e)}>
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )}
        </Group>
      )
    }
  ];

  const sortedClients = clients ? [...clients].sort((a, b) => {
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
        title="Clients"
        actionLabel="Add Client"
        onActionClick={can(PERMISSIONS.CLIENT_CREATE) ? handleCreate : undefined}
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
        message="Are you sure you want to delete this client? This action cannot be undone."
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </>
  );
}