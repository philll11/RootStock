// frontend/libs/users/feature-web/src/lib/users-list-page.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Group, ActionIcon, Badge, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconEye, IconLayoutSidebarRight, IconPlus, IconFilePlus } from '@tabler/icons-react';
import {
  useGetUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  User,
  UserFormData,
} from '@rootstock/iam/users/users-data-access';
import { UserForm, UserFormMode } from './user-form';
import {
  ConfirmDiscardModal,
  ConfirmModal,
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

export function UsersListPage() {
  const { data: users = [], isLoading, isError } = useGetUsers();
  const { mutateAsync: createUser, isPending: isCreating } = useCreateUser();
  const { mutateAsync: updateUser, isPending: isUpdating } = useUpdateUser();
  const { mutateAsync: deleteUser } = useDeleteUser();
  const { can } = usePermission();
  const [opened, { open, close }] = useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  const navigate = useNavigate();
  const { getLinkTo } = useContextualNavigation();

  const [mode, setMode] = useState<UserFormMode>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const [createFormDraft, setCreateFormDraft] = useState<
    Partial<UserFormData>
  >({});
  const [isFormDirty, setIsFormDirty] = useState(false);

  const { handleAction: handleCloseWithWarning, modalProps } = useDiscardWarning(isFormDirty && mode === 'edit');

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

  const handleCreatePage = () => {
    navigate(getLinkTo('/users/new'));
  };

  const handleViewPage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/users/${id}`));
  };

  const handleEditPage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/users/${id}/edit`));
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

  const handleSubmit = async (values: UserFormData) => {
    try {
      const { __v, ...data } = values;
      if (mode === 'create') {
        const { isActive, ...createData } = data;
        await createUser(createData);
        setCreateFormDraft({});
      } else {
        if (selectedUser) {
          await updateUser({
            id: selectedUser._id,
            data: data,
          });
        }
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
          {can(PERMISSIONS.USER_VIEW) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.view}
              onClick={(e) => handleViewPage(user._id, e)}
              title="View Page"
            >
              <IconEye size={iconSizes.md} />
            </ActionIcon>
          )}
          {can(PERMISSIONS.USER_EDIT) && (
            <>
              <ActionIcon
                variant="subtle"
                color={palette.actions.edit}
                onClick={(e) => handleEditPage(user._id, e)}
                title="Edit Page"
              >
                <IconEdit size={iconSizes.md} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color={palette.actions.edit}
                onClick={(e) => handleEdit(user, e)}
                title="Quick Edit"
              >
                <IconLayoutSidebarRight size={iconSizes.md} />
              </ActionIcon>
            </>
          )}
          {can(PERMISSIONS.USER_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.delete}
              onClick={(e) => handleDelete(user._id, e)}
              title="Delete User"
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )}
        </Group>
      ),
    },
  ];

  const sortedUsers = users ? [...users].sort((a, b) => {
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
        action={
          can(PERMISSIONS.USER_CREATE) ? (
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
        message={`Are you sure you want to delete "${selectedUser?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </>
  );
}
