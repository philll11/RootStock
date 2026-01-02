import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Group, ActionIcon, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconEye, IconLayoutSidebarRight, IconPlus, IconFilePlus } from '@tabler/icons-react';
import {
  useGetBlocks,
  useCreateBlock,
  useUpdateBlock,
  useDeleteBlock,
  Block,
  CreateBlockDto,
  BlockFormData,
} from '@rootstock/assets/blocks/blocks-data-access';
import { BlockForm, BlockFormMode } from './block-form';
import {
  ConfirmModal,
  ConfirmDiscardModal,
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

export function BlocksListPage() {
  const navigate = useNavigate();
  const { getLinkTo } = useContextualNavigation();
  const { data: blocks, isLoading } = useGetBlocks();
  const { mutateAsync: createBlock, isPending: isCreating } = useCreateBlock();
  const { mutateAsync: updateBlock, isPending: isUpdating } = useUpdateBlock();
  const { mutateAsync: deleteBlock } = useDeleteBlock();

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

  const [mode, setMode] = useState<BlockFormMode>('create');
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<Block | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [createFormDraft, setCreateFormDraft] = useState<Partial<BlockFormData>>({});

  const { handleAction: handleCloseWithWarning, modalProps } =
    useDiscardWarning(isFormDirty && mode === 'edit');

  const handleCreate = () => {
    setMode('create');
    setSelectedBlock(null);
    setIsFormDirty(false);
    openDrawer();
  };

  const handleCreatePage = () => {
    navigate(getLinkTo('/blocks/new'));
  };

  const handleView = (block: Block) => {
    setMode('view');
    setSelectedBlock(block);
    setIsFormDirty(false);
    openDrawer();
  };

  const handleViewPage = (block: Block, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(`/blocks/${block._id}`);
  };

  const handleEdit = (block: Block, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMode('edit');
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
        await deleteBlock(blockToDelete._id);
        closeDeleteModal();
        setBlockToDelete(null);
      } catch (error) {
        // Error handled by hook
      }
    }
  };

  const handleSubmit = async (values: BlockFormData) => {
    try {
      if (mode === 'create') {
        await createBlock({
          name: values.name,
          orchardId: values.orchardId!,
          plantings: values.plantings.map(p => ({
            varietyId: p.varietyId!,
            treeCount: p.treeCount
          })),
        });
        setCreateFormDraft({});
      } else {
        if (selectedBlock) {
          await updateBlock({
            id: selectedBlock._id,
            data: {
              name: values.name,
              isActive: values.isActive,
              plantings: values.plantings.map(p => ({
                varietyId: p.varietyId!,
                treeCount: p.treeCount
              })),
              __v: selectedBlock.__v
            },
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
    switch (mode) {
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
      accessor: 'orchardId',
      title: 'Orchard',
      render: (block: Block) => typeof block.orchardId === 'object' ? block.orchardId.name : 'Unknown Orchard',
      sortable: true,
    },
    {
      accessor: 'plantings',
      title: 'Plantings',
      render: (block: Block) => (
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
      render: (block: Block) => (
        <Badge color={block.isActive ? palette.state.active : palette.state.inactive} variant="light">
          {block.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessor: 'actions',
      title: '',
      align: 'right',
      render: (block: Block) => (
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
      let aValue = (a as any)[accessor];
      let bValue = (b as any)[accessor];

      if (accessor === 'orchardId') {
        aValue = typeof a.orchardId === 'object' ? (a.orchardId as any).name : '';
        bValue = typeof b.orchardId === 'object' ? (b.orchardId as any).name : '';
      }

      aValue = aValue || '';
      bValue = bValue || '';

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
        title="Blocks"
        action={
          can(PERMISSIONS.BLOCK_CREATE) ? (
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
          mode={mode}
          block={selectedBlock}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          onEdit={() => setMode('edit')}
          isLoading={isCreating || isUpdating}
          onDirtyChange={setIsFormDirty}
          initialValues={createFormDraft}
          onValuesChange={setCreateFormDraft}
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
}
