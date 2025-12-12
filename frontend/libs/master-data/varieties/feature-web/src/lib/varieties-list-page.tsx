import { Title, Table, Button, Group, Drawer, ActionIcon, Badge, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { useVarieties, Variety } from '@rootstock/master-data/varieties/varieties-data-access';
import { VarietyForm, VarietyFormMode } from './variety-form';
import { useState } from 'react';
import { ConfirmModal, useDiscardWarning } from '@rootstock/ui/web';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { palette } from '@rootstock/ui/theme';

export function VarietiesListPage() {
  const { varietiesQuery, createVarietyMutation, updateVarietyMutation, deleteVarietyMutation } = useVarieties();
  const { data: varieties, isLoading } = varietiesQuery;
  const { can } = usePermission();
  const [opened, { open, close }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const [mode, setMode] = useState<VarietyFormMode>('create');
  const [selectedVariety, setSelectedVariety] = useState<Variety | null>(null);
  const [varietyToDelete, setVarietyToDelete] = useState<Variety | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);

  const { handleAction: handleCloseWithWarning, modalProps } = useDiscardWarning(isFormDirty);

  const handleCreate = () => {
    setMode('create');
    setSelectedVariety(null);
    setIsFormDirty(false);
    open();
  };

  const handleView = (variety: Variety) => {
    setMode('view');
    setSelectedVariety(variety);
    setIsFormDirty(false);
    open();
  };

  const handleEdit = (variety: Variety, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMode('edit');
    setSelectedVariety(variety);
    setIsFormDirty(false);
    open();
  };

  const handleDeleteClick = (variety: Variety, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setVarietyToDelete(variety);
    openDeleteModal();
  };

  const handleConfirmDelete = () => {
    if (varietyToDelete) {
      deleteVarietyMutation.mutate(varietyToDelete._id);
      closeDeleteModal();
      setVarietyToDelete(null);
    }
  };

  const handleSubmit = (values: any) => {
    if (mode === 'create') {
      createVarietyMutation.mutate(values, {
        onSuccess: () => {
          close();
        },
      });
    } else if (mode === 'edit' && selectedVariety) {
      updateVarietyMutation.mutate({ id: selectedVariety._id, data: values }, {
        onSuccess: () => {
          close();
        },
      });
    }
  };

  const handleClose = () => {
    handleCloseWithWarning(close);
  };

  const getDrawerTitle = () => {
    switch (mode) {
      case 'create': return 'Create Variety';
      case 'edit': return 'Edit Variety';
      case 'view': return 'Variety Details';
      default: return '';
    }
  };

  const rows = varieties?.map((variety) => (
    <Table.Tr 
      key={variety._id}
      onClick={() => handleView(variety)}
      style={{ cursor: 'pointer' }}
    >
      <Table.Td>{variety.name}</Table.Td>
      <Table.Td>{variety.recordId}</Table.Td>
      <Table.Td>
        <Badge color={variety.isActive ? 'brand' : 'neutral'} variant="light">
          {variety.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={0} justify="flex-end">
          {can(PERMISSIONS.VARIETY_EDIT) && (
            <ActionIcon variant="subtle" color={palette.actions.edit} onClick={(e) => handleEdit(variety, e)}>
              <IconEdit size={16} />
            </ActionIcon>
          )}
          {can(PERMISSIONS.VARIETY_DELETE) && (
            <ActionIcon variant="subtle" color={palette.actions.delete} onClick={(e) => handleDeleteClick(variety, e)}>
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
        <Title order={2}>Varieties</Title>
        {can(PERMISSIONS.VARIETY_CREATE) && (
          <Button leftSection={<IconPlus size={14} />} onClick={handleCreate}>
            Create Variety
          </Button>
        )}
      </Group>

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>ID</Table.Th>
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
      >
        <VarietyForm
          mode={mode}
          initialValues={selectedVariety}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          onEdit={() => setMode('edit')}
          isLoading={createVarietyMutation.isPending || updateVarietyMutation.isPending}
          onDirtyChange={setIsFormDirty}
        />
      </Drawer>

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Variety"
        message={`Are you sure you want to delete variety "${varietyToDelete?.name}"?`}
      />
      
      <ConfirmModal
         opened={modalProps.opened}
         onClose={modalProps.onClose}
         onConfirm={modalProps.onConfirm}
         title="Discard Changes?"
         message="You have unsaved changes. Are you sure you want to discard them?"
         confirmLabel="Discard"
      />
    </>
  );
}
