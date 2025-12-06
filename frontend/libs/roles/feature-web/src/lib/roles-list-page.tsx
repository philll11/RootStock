import { Title, Table, Button, Group, Drawer, ActionIcon, Badge, Text, Alert } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconPlus, IconAlertCircle } from '@tabler/icons-react';
import { useRoles, Role, CreateRoleDto, UpdateRoleDto } from '@rootstock/roles/roles-data-access';
import { RoleForm, RoleFormMode } from './role-form';
import { useState } from 'react';
import { ConfirmDiscardModal, ConfirmModal, useDiscardWarning } from '@rootstock/ui/web';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function RolesListPage() {
  const { roles, isLoading, isError, createRole, updateRole, deleteRole, isCreating, isUpdating } = useRoles();
  const { can } = usePermission();
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  
  // State for drawer mode and selected role
  const [mode, setMode] = useState<RoleFormMode>('create');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  
  // State for persisting create form data
  const [createFormDraft, setCreateFormDraft] = useState<Partial<CreateRoleDto>>({});
  
  // State for dirty check in edit mode
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Use the shared hook for discard warning
  const { handleAction: handleCloseWithWarning, modalProps } = useDiscardWarning(isFormDirty);

  const handleCreate = () => {
    setMode('create');
    setSelectedRole(null);
    setIsFormDirty(false);
    open();
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

  const handleSubmit = async (values: CreateRoleDto | UpdateRoleDto) => {
    try {
      if (mode === 'edit' && selectedRole) {
        await updateRole({ id: selectedRole._id, data: values as UpdateRoleDto });
      } else if (mode === 'create') {
        await createRole(values as CreateRoleDto);
        setCreateFormDraft({}); // Clear draft on successful create
      }
      close();
    } catch (error) {
      console.error('Failed to save role', error);
    }
  };

  const getDrawerTitle = () => {
    switch (mode) {
      case 'create': return 'Create Role';
      case 'edit': return 'Edit Role';
      case 'view': return 'Role Details';
      default: return '';
    }
  };

  const rows = roles.map((role) => (
    <Table.Tr 
      key={role._id} 
      onClick={() => handleView(role)}
      style={{ cursor: 'pointer' }}
    >
      <Table.Td>{role.recordId}</Table.Td>
      <Table.Td>{role.name}</Table.Td>
      <Table.Td>{role.visibilityScope}</Table.Td>
      <Table.Td>
        <Badge color={role.isActive ? 'brand' : 'neutral'} variant="light">
          {role.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={0} justify="flex-end">
          {can(PERMISSIONS.ROLE_EDIT) && (
            <ActionIcon variant="subtle" color="neutral" onClick={(e) => handleEdit(role, e)}>
              <IconEdit size={16} />
            </ActionIcon>
          )}
          {can(PERMISSIONS.ROLE_DELETE) && (
            <ActionIcon variant="subtle" color="error" onClick={(e) => handleDelete(role._id, e)}>
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  if (isError) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Access Denied" color="red">
        You do not have permission to view roles.
      </Alert>
    );
  }

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Roles</Title>
        {can(PERMISSIONS.ROLE_CREATE) && (
          <Button leftSection={<IconPlus size={14} />} onClick={handleCreate}>
            Add Role
          </Button>
        )}
      </Group>

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>ID</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Visibility Scope</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? rows : (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text ta="center" c="dimmed">No roles found.</Text>
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
        size="lg"
      >
        <RoleForm
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
      </Drawer>

      <ConfirmDiscardModal {...modalProps} />
      
      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Role"
        message="Are you sure you want to delete this role? This action cannot be undone. Note: Roles assigned to users cannot be deleted."
        confirmLabel="Delete"
        confirmColor="error"
      />
    </>
  );
}
