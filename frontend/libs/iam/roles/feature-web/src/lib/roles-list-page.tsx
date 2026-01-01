// frontend/libs/roles/feature-web/src/lib/roles-list-page.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Group, ActionIcon, Badge, Text, Alert } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconAlertCircle, IconEye, IconLayoutSidebarRight, IconPlus, IconFilePlus } from '@tabler/icons-react';
import {
  useGetRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  Role,
  RoleFormData,
} from '@rootstock/iam/roles/roles-data-access';
import { RoleForm, RoleFormMode } from './role-form';
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

export function RolesListPage() {
  const { data: roles = [], isLoading, isError } = useGetRoles();
  const { mutateAsync: createRole, isPending: isCreating } = useCreateRole();
  const { mutateAsync: updateRole, isPending: isUpdating } = useUpdateRole();
  const { mutateAsync: deleteRole } = useDeleteRole();
  const { can } = usePermission();
  const [opened, { open, close }] = useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  const navigate = useNavigate();
  const { getLinkTo } = useContextualNavigation();

  const [mode, setMode] = useState<RoleFormMode>('create');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  const [createFormDraft, setCreateFormDraft] = useState<
    Partial<RoleFormData>
  >({});
  const [isFormDirty, setIsFormDirty] = useState(false);

  const { handleAction: handleCloseWithWarning, modalProps } =
    useDiscardWarning(isFormDirty && mode === 'edit');

  const [sortState, setSortState] = useState<{
    accessor: string;
    direction: 'asc' | 'desc';
  }>({ accessor: 'name', direction: 'asc' });

  const handleCreate = () => {
    setMode('create');
    setSelectedRole(null);
    setIsFormDirty(false);
    open();
  };

  const handleCreatePage = () => {
    navigate(getLinkTo('/roles/new'));
  };

  const handleViewPage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/roles/${id}`));
  };

  const handleEditPage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/roles/${id}/edit`));
  };

  const handleView = (role: Role) => {
    setMode('view');
    setSelectedRole(role);
    setIsFormDirty(false);
    open();
  };

  const handleEdit = (role: Role, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMode('edit');
    setSelectedRole(role);
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
    setRoleToDelete(id);
    openDeleteModal();
  };

  const handleConfirmDelete = async () => {
    if (roleToDelete) {
      await deleteRole(roleToDelete);
      closeDeleteModal();
      setRoleToDelete(null);
    }
  };

  const handleSubmit = async (values: RoleFormData) => {
    try {
      const { __v, ...data } = values;
      if (mode === 'edit' && selectedRole) {
        await updateRole({
          id: selectedRole._id,
          data: data,
        });
      } else if (mode === 'create') {
        const { isActive, ...createData } = data;
        await createRole(createData);
        setCreateFormDraft({});
      }
      close();
    } catch (error) {
      console.error('Failed to save role', error);
    }
  };

  const getDrawerTitle = () => {
    switch (mode) {
      case 'create':
        return 'Create Role';
      case 'edit':
        return 'Edit Role';
      case 'view':
        return 'Role Details';
      default:
        return '';
    }
  };

  const columns: DataTableColumn<Role>[] = [
    { accessor: 'recordId', title: 'ID', sortable: true },
    { accessor: 'name', title: 'Name', sortable: true },
    { accessor: 'visibilityScope', title: 'Visibility Scope', sortable: true },
    {
      accessor: 'isActive',
      title: 'Status',
      render: (role) => (
        <Badge color={role.isActive ? palette.state.active : palette.state.inactive} variant="light">
          {role.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessor: 'actions',
      title: '',
      align: 'right',
      render: (role) => (
        <Group gap={0} justify="flex-end">
          {can(PERMISSIONS.ROLE_VIEW) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.view}
              onClick={(e) => handleViewPage(role._id, e)}
              title="View Page"
            >
              <IconEye size={iconSizes.md} />
            </ActionIcon>
          )}
          {can(PERMISSIONS.ROLE_EDIT) && (
            <>
              <ActionIcon
                variant="subtle"
                color={palette.actions.edit}
                onClick={(e) => handleEditPage(role._id, e)}
                title="Edit Page"
              >
                <IconEdit size={iconSizes.md} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color={palette.actions.edit}
                onClick={(e) => handleEdit(role, e)}
                title="Quick Edit"
              >
                <IconLayoutSidebarRight size={iconSizes.md} />
              </ActionIcon>
            </>
          )}
          {can(PERMISSIONS.ROLE_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.delete}
              onClick={(e) => handleDelete(role._id, e)}
              title="Delete Role"
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )}
        </Group>
      ),
    },
  ];

  const sortedRoles = roles
    ? [...roles].sort((a, b) => {
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

  if (isError) {
    return (
      <Alert
        icon={<IconAlertCircle size={iconSizes.md} />}
        title="Access Denied"
        color="red"
      >
        You do not have permission to view roles.
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        title="Roles"
        action={
          can(PERMISSIONS.ROLE_CREATE) ? (
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
        data={sortedRoles}
        columns={columns}
        isLoading={isLoading}
        onRowClick={handleView}
        noDataMessage="No roles found."
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
        <RoleForm
          key={opened ? 'opened' : 'closed'}
          mode={mode}
          role={selectedRole}
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
        title="Delete Role"
        message="Are you sure you want to delete this role? This action cannot be undone. Note: Roles assigned to users cannot be deleted."
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </>
  );
}
