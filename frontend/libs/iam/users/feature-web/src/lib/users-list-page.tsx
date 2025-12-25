// frontend/libs/users/feature-web/src/lib/users-list-page.tsx
import { useState } from 'react';
import { Group, ActionIcon, Badge, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import {
  useUsers,
  User,
  CreateUserDto,
  UpdateUserDto,
} from '@rootstock/users/users-data-access';
import { UserForm, UserFormMode } from './user-form';
import {
  ConfirmDiscardModal,
  ConfirmModal,
  useDiscardWarning,
  PageHeader,
  DataTable,
  FormDrawer,
  DataTableColumn,
} from '@rootstock/ui/web';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { palette, iconSizes, layout } from '@rootstock/ui/theme';

export function UsersListPage() {
  const {
    users,
    isLoading,
    createUser,
    updateUser,
    deleteUser,
    isCreating,
    isUpdating,
  } = useUsers();
  const { can } = usePermission();
  const [opened, { open, close }] = useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  const [mode, setMode] = useState<UserFormMode>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const [createFormDraft, setCreateFormDraft] = useState<
    Partial<CreateUserDto>
  >({});
  const [isFormDirty, setIsFormDirty] = useState(false);

  const { handleAction: handleCloseWithWarning, modalProps } =
    useDiscardWarning(isFormDirty);

  const [sortState, setSortState] = useState<{
    accessor: string;
    direction: 'asc' | 'desc';
  }>({ accessor: 'name', direction: 'asc' });

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
        await updateUser({
          id: selectedUser._id,
          data: values as UpdateUserDto,
        });
      } else if (mode === 'create') {
        await createUser(values as CreateUserDto);
        setCreateFormDraft({}); // Clear draft after successful creation
      }
      close();
    } catch (error) {
      console.error('Failed to save user', error);
    }
  };

  const getDrawerTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create User';
      case 'edit':
        return 'Edit User';
      case 'view':
        return 'User Details';
      default:
        return '';
    }
  };

  const columns: DataTableColumn<User>[] = [
    { accessor: 'recordId', title: 'ID', sortable: true },
    { accessor: 'name', title: 'Name', sortable: true },
    { accessor: 'email', title: 'Email', sortable: true },
    {
      accessor: 'userType',
      title: 'Type',
      sortable: true,
      render: (user) => (
        <Badge color={user.userType === 'employee' ? 'brand' : 'blue'}>
          {user.userType}
        </Badge>
      ),
    },
    {
      accessor: 'isActive',
      title: 'Status',
      render: (user) => (
        <Badge color={user.isActive ? 'brand' : 'neutral'} variant="light">
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessor: 'actions',
      title: '',
      align: 'right',
      render: (user) => (
        <Group gap={0} justify="flex-end">
          {can(PERMISSIONS.USER_EDIT) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.edit}
              onClick={(e) => handleEdit(user, e)}
            >
              <IconEdit size={iconSizes.md} />
            </ActionIcon>
          )}
          {can(PERMISSIONS.USER_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.delete}
              onClick={(e) => handleDelete(user._id, e)}
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )}
        </Group>
      ),
    },
  ];

  const sortedUsers = users
    ? [...users].sort((a, b) => {
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
        title="Users"
        actionLabel="Add User"
        onActionClick={can(PERMISSIONS.USER_CREATE) ? handleCreate : undefined}
      />

      <DataTable
        data={sortedUsers}
        columns={columns}
        isLoading={isLoading}
        onRowClick={handleView}
        noDataMessage="No users found."
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
        <UserForm
          key={opened ? 'opened' : 'closed'}
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
      </FormDrawer>

      <ConfirmDiscardModal {...modalProps} />

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </>
  );
}
