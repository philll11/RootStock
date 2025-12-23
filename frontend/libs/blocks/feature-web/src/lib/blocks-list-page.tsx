import { useState } from 'react';
import { Group, ActionIcon, Badge, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import { useBlocks, Block, CreateBlockDto } from '@rootstock/blocks/blocks-data-access';
import { BlockForm, BlockFormMode } from './block-form';
import { 
  ConfirmModal, 
  ConfirmDiscardModal, 
  useDiscardWarning,
  PageHeader,
  DataTable,
  FormDrawer,
  DataTableColumn
} from '@rootstock/ui/web';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { palette, iconSizes, layout } from '@rootstock/ui/theme';

export function BlocksListPage() {
  const { orchardId } = useParams<{ orchardId: string }>();
  const { blocksQuery, createBlockMutation, updateBlockMutation, deleteBlockMutation } = useBlocks(orchardId);
  const { data: blocks, isLoading } = blocksQuery;
  const { can } = usePermission();
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [sortState, setSortState] = useState<{ accessor: string; direction: 'asc' | 'desc' }>({ accessor: 'name', direction: 'asc' });

  const [formMode, setFormMode] = useState<BlockFormMode>('create');
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<Block | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [createFormDraft, setCreateFormDraft] = useState<Partial<CreateBlockDto>>({});

  const { handleAction: handleCloseWithWarning, modalProps } = useDiscardWarning(isFormDirty);

  const handleCreate = () => {
    setFormMode('create');
    setSelectedBlock(null);
    setIsFormDirty(false);
    openDrawer();
  };

  const handleView = (block: Block) => {
    setFormMode('view');
    setSelectedBlock(block);
    setIsFormDirty(false);
    openDrawer();
  };

  const handleEdit = (block: Block, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFormMode('edit');
    setSelectedBlock(block);
    setIsFormDirty(false);
    openDrawer();
  };

  const handleDeleteClick = (block: Block, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBlockToDelete(block);
    openDeleteModal();
  };

  const handleConfirmDelete = () => {
    if (blockToDelete) {
      deleteBlockMutation.mutate(blockToDelete._id);
      closeDeleteModal();
      setBlockToDelete(null);
    }
  };

  const handleSubmit = (values: any) => {
    if (formMode === 'create') {
      createBlockMutation.mutate(values, {
        onSuccess: () => {
          closeDrawer();
          setCreateFormDraft({});
        },
      });
    } else if (formMode === 'edit' && selectedBlock) {
      updateBlockMutation.mutate({ id: selectedBlock._id, data: values }, {
        onSuccess: () => {
          closeDrawer();
        },
      });
    }
  };

  const handleClose = () => {
    handleCloseWithWarning(closeDrawer);
  };

  const getDrawerTitle = () => {
    switch (formMode) {
      case 'create': return 'Create Block';
      case 'edit': return 'Edit Block';
      case 'view': return 'Block Details';
      default: return '';
    }
  };

  const columns: DataTableColumn<Block>[] = [
    { accessor: 'name', title: 'Name', sortable: true },
    { accessor: 'recordId', title: 'ID', sortable: true },
    { 
      accessor: 'plantings', 
      title: 'Plantings',
      render: (block) => (
        <>
          {block.plantings.map((p, i) => (
            <div key={i}>
              {p.variety?.name || 'Unknown'} ({p.treeCount})
            </div>
          ))}
        </>
      )
    },
    {
      accessor: 'isActive',
      title: 'Status',
      render: (block) => (
        <Badge color={block.isActive ? 'brand' : 'neutral'} variant="light">
          {block.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      accessor: 'actions',
      title: '',
      align: 'right',
      render: (block) => (
        <Group gap={0} justify="flex-end">
          {can(PERMISSIONS.BLOCK_EDIT) && (
            <ActionIcon variant="subtle" color={palette.actions.edit} onClick={(e) => handleEdit(block, e)}>
              <IconEdit size={iconSizes.md} />
            </ActionIcon>
          )}
          {can(PERMISSIONS.BLOCK_DELETE) && (
            <ActionIcon variant="subtle" color={palette.actions.delete} onClick={(e) => handleDeleteClick(block, e)}>
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )}
        </Group>
      )
    }
  ];

  if (!orchardId) return <Text>Orchard ID is missing</Text>;

  const sortedBlocks = blocks ? [...blocks].sort((a, b) => {
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
        title="Blocks"
        actionLabel="Create Block"
        onActionClick={can(PERMISSIONS.BLOCK_CREATE) ? handleCreate : undefined}
      />

      <DataTable 
        data={sortedBlocks}
        columns={columns}
        isLoading={isLoading}
        onRowClick={handleView}
        noDataMessage="No blocks found."
        onSort={(accessor, direction) => setSortState({ accessor, direction })}
        initialSort={sortState}
      />

      <FormDrawer
        opened={drawerOpened}
        onClose={handleClose}
        title={getDrawerTitle()}
        size={layout.drawers.form}
        isLoading={createBlockMutation.isPending || updateBlockMutation.isPending}
      >
        <BlockForm
          mode={formMode}
          initialValues={selectedBlock}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          onEdit={() => setFormMode('edit')}
          isLoading={createBlockMutation.isPending || updateBlockMutation.isPending}
          onDirtyChange={setIsFormDirty}
          draftValues={createFormDraft}
          onValuesChange={(values) => setCreateFormDraft(values as CreateBlockDto)}
        />
      </FormDrawer>

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Block"
        message={`Are you sure you want to delete block "${blockToDelete?.name}"?`}
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
      
      <ConfirmDiscardModal {...modalProps} />
    </>
  );
}
