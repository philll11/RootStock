import { useState } from 'react';
import { Table, Group, Button, Title, ActionIcon, Drawer, Badge, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { ConfirmModal, ConfirmDiscardModal, useDiscardWarning } from '@rootstock/ui/web';
import { palette, iconSizes, layout } from '@rootstock/ui/theme'; // NEW IMPORTS
import { useOrchards, Orchard, CreateOrchardDto, UpdateOrchardDto } from '@rootstock/orchards/orchards-data-access';
import { OrchardForm } from './orchard-form';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function OrchardsListPage() {
  const { 
    orchards, 
    isLoading, 
    deleteOrchard,
    createOrchard,
    updateOrchard,
    isCreating,
    isUpdating
  } = useOrchards();
  
  const { can } = usePermission();
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  
  const [selectedOrchard, setSelectedOrchard] = useState<Orchard | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [createFormDraft, setCreateFormDraft] = useState<Partial<CreateOrchardDto>>({});

  const { handleAction: handleCloseWithWarning, modalProps } = useDiscardWarning(isFormDirty);

  const handleCreate = () => {
    setSelectedOrchard(null);
    setFormMode('create');
    setIsFormDirty(false);
    openDrawer();
  };

  const handleEdit = (orchard: Orchard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedOrchard(orchard);
    setFormMode('edit');
    setIsFormDirty(false);
    openDrawer();
  };

  const handleView = (orchard: Orchard) => {
    setSelectedOrchard(orchard);
    setFormMode('view');
    setIsFormDirty(false);
    openDrawer();
  };

  const handleClose = () => {
    handleCloseWithWarning(() => {
      setIsFormDirty(false);
      closeDrawer();
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
      if (formMode === 'create') {
        await createOrchard(values as CreateOrchardDto);
        setCreateFormDraft({});
      } else {
        if (selectedOrchard) {
           await updateOrchard({ id: selectedOrchard._id, data: values as UpdateOrchardDto });
        }
      }
      closeDrawer();
    } catch (error) {
      // Error handling is done in the hook via notify
    }
  };

  const rows = orchards?.map((orchard) => (
    <Table.Tr 
      key={orchard._id}
      onClick={() => handleView(orchard)}
      style={{ cursor: 'pointer' }}
    >
      <Table.Td>{orchard.recordId}</Table.Td>
      <Table.Td>{orchard.name}</Table.Td>
      <Table.Td>{typeof orchard.clientId === 'object' ? orchard.clientId.name : 'Unknown Client'}</Table.Td>
      <Table.Td>
        <Badge color={orchard.isActive ? 'brand' : 'neutral'} variant="light">
          {orchard.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={0} justify="flex-end">
          {can(PERMISSIONS.ORCHARD_EDIT) && (
            <ActionIcon 
              variant="subtle" 
              color={palette.actions.edit} 
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(orchard);
              }}
            >
              <IconEdit size={iconSizes.md} />
            </ActionIcon>
          )}
          {can(PERMISSIONS.ORCHARD_DELETE) && (
            <ActionIcon 
              variant="subtle" 
              color={palette.actions.delete} 
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(orchard);
              }}
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Orchards</Title>
        {can(PERMISSIONS.ORCHARD_CREATE) && (
          <Button leftSection={<IconPlus size={iconSizes.sm} />} onClick={handleCreate}>
            Add Orchard
          </Button>
        )}
      </Group>

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>ID</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Client</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows && rows.length > 0 ? rows : (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text ta="center" c="dimmed" py="xl">No orchards found.</Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      <Drawer
        opened={drawerOpened}
        onClose={handleClose}
        title={formMode === 'create' ? 'Create Orchard' : formMode === 'edit' ? 'Edit Orchard' : 'Orchard Details'}
        position="right"
        size={layout.drawers.form}
      >
        <OrchardForm 
          orchard={selectedOrchard} 
          mode={formMode} 
          onSubmit={handleSubmit}
          onCancel={handleClose}
          onEdit={() => setFormMode('edit')}
          isLoading={isCreating || isUpdating}
          onDirtyChange={setIsFormDirty}
          initialValues={createFormDraft}
          onValuesChange={(values) => setCreateFormDraft(values as CreateOrchardDto)}
        />
      </Drawer>

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