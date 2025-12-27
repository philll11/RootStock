import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Group, ActionIcon, Badge, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconEye, IconLayoutSidebarRight, IconPlus, IconFilePlus } from '@tabler/icons-react';
import {
  useBlocks,
  Block,
  CreateBlockDto,
} from '@rootstock/blocks/blocks-data-access';
import { BlockForm, BlockFormMode } from './block-form';
import {
  ConfirmModal,
  ConfirmDiscardModal,
  useDiscardWarning,
  useContextualNavigation,
  PageHeader,
  DataTable,
  FormDrawer,
  DataTableColumn,
  ActionSplitButton, 
} from '@rootstock/ui/web';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { palette, iconSizes, layout } from '@rootstock/ui/theme';

interface BlocksListProps {
  orchardId?: string;
}

export function BlocksList({ orchardId }: BlocksListProps) {
  const navigate = useNavigate();
  const { getLinkTo } = useContextualNavigation();
  const {
    blocks,
    isLoading,
    createBlock,
    updateBlock,
    deleteBlock,
    isCreating,
    isUpdating,
  } = useBlocks(orchardId);
  const { can } = usePermission();
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const [sortState, setSortState] = useState<{
    accessor: string;
    direction: 'asc' | 'desc';
  }>({ accessor: 'name', direction: 'asc' });

  const [formMode, setFormMode] = useState<BlockFormMode>('create');
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<Block | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [createFormDraft, setCreateFormDraft] = useState<
    Partial<CreateBlockDto>
  >({});

  const { handleAction: handleCloseWithWarning, modalProps } =
    useDiscardWarning(isFormDirty && formMode === 'edit');

  const handleCreate = () => {
    setFormMode('create');
    setSelectedBlock(null);
    setIsFormDirty(false);
    openDrawer();
  };

  const handleCreatePage = () => {
    const url = orchardId ? `/blocks/new?orchardId=${orchardId}` : '/blocks/new';
    navigate(getLinkTo(url));
  };

  const handleView = (block: Block) => {
    setFormMode('view');
    setSelectedBlock(block);
    setIsFormDirty(false);
    openDrawer();
  };

  const handleViewPage = (block: Block, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/blocks/${block._id}`));
  };

  const handleEdit = (block: Block, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFormMode('edit');
    setSelectedBlock(block);
    setIsFormDirty(false);
    openDrawer();
  };

  const handleEditPage = (block: Block, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(getLinkTo(`/blocks/${block._id}/edit`));
  };

  const handleDeleteClick = (block: Block, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBlockToDelete(block);
    openDeleteModal();
  };

  const handleConfirmDelete = async () => {
    if (blockToDelete) {
      try {
        await deleteBlock({ id: blockToDelete._id });
        closeDeleteModal();
        setBlockToDelete(null);
      } catch (error) {
        // Error handled by hook
      }
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (formMode === 'create') {
        await createBlock({ data: values, orchardId });
        setCreateFormDraft({});
      } else {
        if (selectedBlock) {
          await updateBlock({
            id: selectedBlock._id,
            data: values,
          });
        }
      }
      closeDrawer();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleClose = () => {
    handleCloseWithWarning(() => {
      setIsFormDirty(false);
      closeDrawer();
    });
  };

  const getDrawerTitle = () => {
    switch (formMode) {
      case 'create':
        return 'Create Block';
      case 'edit':
        return 'Edit Block';
      case 'view':
        return 'Block Details';
      default:
        return '';
    }
  };

  const columns: DataTableColumn<Block>[] = [
    { accessor: 'recordId', title: 'ID', sortable: true },
    { accessor: 'name', title: 'Name', sortable: true },
    {
      accessor: 'plantings',
      title: 'Plantings',
      render: (block) => (
        <>
          {block.plantings.map((p, i) => (
            <div key={i}>
              {typeof p.varietyId === 'object' ? p.varietyId.name : 'Unknown'} (
              {p.treeCount})
            </div>
          ))}
        </>
      ),
    },
    {
      accessor: 'isActive',
      title: 'Status',
      render: (block) => (
        <Badge color={block.isActive ? 'brand' : 'neutral'} variant="light">
          {block.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessor: 'actions',
      title: '',
      align: 'right',
      render: (block) => (
        <Group gap={0} justify="flex-end">
          <ActionIcon
            variant="subtle"
            color={palette.actions.view}
            onClick={(e) => handleViewPage(block, e)}
            title="View Page"
          >
            <IconEye size={iconSizes.md} />
          </ActionIcon>
          {can(PERMISSIONS.BLOCK_EDIT) && (
            <>
              <ActionIcon
                variant="subtle"
                color={palette.actions.edit}
                onClick={(e) => handleEditPage(block, e)}
                title="Edit Page"
              >
                <IconEdit size={iconSizes.md} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color={palette.actions.edit}
                onClick={(e) => handleEdit(block, e)}
                title="Quick Edit"
              >
                <IconLayoutSidebarRight size={iconSizes.md} />
              </ActionIcon>
            </>
          )}
          {can(PERMISSIONS.BLOCK_DELETE) && (
            <ActionIcon
              variant="subtle"
              color={palette.actions.delete}
              onClick={(e) => handleDeleteClick(block, e)}
            >
              <IconTrash size={iconSizes.md} />
            </ActionIcon>
          )}
        </Group>
      ),
    },
  ];

  const sortedBlocks = blocks
    ? [...blocks].sort((a, b) => {
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

  const actionButton = can(PERMISSIONS.BLOCK_CREATE) ? (
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
  ) : undefined;

  const content = (
    <>
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
        isLoading={isCreating || isUpdating}
      >
        <BlockForm
          key={drawerOpened ? 'opened' : 'closed'}
          mode={formMode}
          block={selectedBlock}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          onEdit={() => setFormMode('edit')}
          isLoading={isCreating || isUpdating}
          onDirtyChange={setIsFormDirty}
          initialValues={createFormDraft}
          onValuesChange={setCreateFormDraft}
          orchardId={orchardId}
        />
      </FormDrawer>

      <ConfirmDiscardModal {...modalProps} />

      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Block"
        message={`Are you sure you want to delete block "${blockToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor={palette.actions.delete}
      />
    </>
  );

  return (
    <>
      <PageHeader title="Blocks" action={actionButton} />
      {content}
    </>
  );
}
