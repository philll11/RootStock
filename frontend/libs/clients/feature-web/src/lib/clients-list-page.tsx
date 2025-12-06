import { Title, Table, Button, Group, Drawer, ActionIcon, Badge, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { useClients, Client, CreateClientDto, UpdateClientDto } from '@rootstock/clients/clients-data-access';
import { ClientForm, ClientFormMode } from './client-form';
import { useState } from 'react';
import { ConfirmModal, ConfirmDiscardModal, useDiscardWarning } from '@rootstock/ui/web';
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

  // State for persisting create form data
  const [createFormDraft, setCreateFormDraft] = useState<Partial<CreateClientDto>>({});
  
  // State for dirty check in edit mode
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Use the shared hook for discard warning
  const { handleAction: handleCloseWithWarning, modalProps } = useDiscardWarning(isFormDirty);

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
        setCreateFormDraft({}); // Clear draft on successful create
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

  const rows = clients.map((client) => (
    <Table.Tr 
      key={client._id} 
      onClick={() => handleView(client)}
      style={{ cursor: 'pointer' }}
    >
      <Table.Td>{client.recordId}</Table.Td>
      <Table.Td>{client.name}</Table.Td>
      <Table.Td>
        <Badge color={client.isActive ? 'brand' : 'neutral'} variant="light">
          {client.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={0} justify="flex-end">
          {can(PERMISSIONS.CLIENT_EDIT) && (
            <ActionIcon variant="subtle" color="neutral" onClick={(e) => handleEdit(client, e)}>
              <IconEdit size={16} />
            </ActionIcon>
          )}
          {can(PERMISSIONS.CLIENT_DELETE) && (
            <ActionIcon variant="subtle" color="error" onClick={(e) => handleDelete(client._id, e)}>
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Clients</Title>
        {can(PERMISSIONS.CLIENT_CREATE) && (
          <Button leftSection={<IconPlus size={14} />} onClick={handleCreate}>
            Add Client
          </Button>
        )}
      </Group>

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>ID</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? rows : (
            <Table.Tr>
              <Table.Td colSpan={4}>
                <Text ta="center" c="dimmed" py="xl">No clients found</Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      <Drawer
        opened={opened}
        onClose={handleClose}
        title={getDrawerTitle()}
        position="right"
        size="md"
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
      </Drawer>

      <ConfirmDiscardModal {...modalProps} />

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Client"
        message="Are you sure you want to delete this client? This action cannot be undone."
        confirmLabel="Delete"
        confirmColor="error"
      />
    </>
  );
}
