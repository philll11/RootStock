import { Title, Table, Button, Group, Drawer, ActionIcon, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { useUsers, User, CreateUserDto, UpdateUserDto } from '@rootstock/users/users-data-access';
import { UserForm, UserFormMode } from './user-form';
import { useState } from 'react';
import { ConfirmDiscardModal, ConfirmModal, useDiscardWarning } from '@rootstock/ui/web';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function UsersListPage() {
  const { users, isLoading, createUser, updateUser, deleteUser, isCreating, isUpdating } = useUsers();
  const { can } = usePermission();
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  
  // State for drawer mode and selected user
  const [mode, setMode] = useState<UserFormMode>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  // State for persisting create form data
  const [createFormDraft, setCreateFormDraft] = useState<Partial<CreateUserDto>>({});
  
  // State for dirty check in edit mode
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Use the shared hook for discard warning
  const { handleAction: handleCloseWithWarning, modalProps } = useDiscardWarning(isFormDirty);

  const handleCreate = () => {
    setMode('create');
    setSelectedUser(null);
    setIsFormDirty(false);
    open();
  };

  const handleView = (user: User) => {
    setMode('view');
    setSelectedUser(user);
    setIsFormDirty(false);
    open();
  };

  const handleEdit = (user: User, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMode('edit');
    setSelectedUser(user);
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
    setUserToDelete(id);
    openDeleteModal();
  };

  const handleConfirmDelete = async () => {
    if (userToDelete) {
      await deleteUser(userToDelete);
      closeDeleteModal();
      setUserToDelete(null);
    }
  };

  const handleSubmit = async (values: CreateUserDto | UpdateUserDto) => {
    try {
      if (mode === 'edit' && selectedUser) {
        await updateUser({ id: selectedUser._id, data: values as UpdateUserDto });
      } else if (mode === 'create') {
        await createUser(values as CreateUserDto);
        setCreateFormDraft({}); // Clear draft on successful create
      }
      close();
    } catch (error) {
      console.error('Failed to save user', error);
    }
  };

  const getDrawerTitle = () => {
    switch (mode) {
      case 'create': return 'Create User';
      case 'edit': return 'Edit User';
      case 'view': return 'User Details';
      default: return '';
    }
  };

  const rows = users.map((user) => (
    <Table.Tr 
      key={user._id} 
      onClick={() => handleView(user)}
      style={{ cursor: 'pointer' }}
    >
      <Table.Td>{user.recordId}</Table.Td>
      <Table.Td>{user.name}</Table.Td>
      <Table.Td>{user.email}</Table.Td>
      <Table.Td>
        <Badge color={user.userType === 'employee' ? 'brand' : 'blue'}>
          {user.userType}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Badge color={user.isActive ? 'brand' : 'neutral'} variant="light">
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={0} justify="flex-end">
          {can(PERMISSIONS.USER_EDIT) && (
            <ActionIcon variant="subtle" color="neutral" onClick={(e) => handleEdit(user, e)}>
              <IconEdit size={16} />
            </ActionIcon>
          )}
          {can(PERMISSIONS.USER_DELETE) && (
            <ActionIcon variant="subtle" color="error" onClick={(e) => handleDelete(user._id, e)}>
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Users</Title>
        {can(PERMISSIONS.USER_CREATE) && (
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
            Add User
          </Button>
        )}
      </Group>

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>ID</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>

      <Drawer
        opened={opened}
        onClose={handleClose}
        title={getDrawerTitle()}
        position="right"
        size="md"
      >
        <UserForm
          mode={mode}
          user={selectedUser}
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
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmLabel="Delete"
        confirmColor="error"
      />
    </>
  );
}
