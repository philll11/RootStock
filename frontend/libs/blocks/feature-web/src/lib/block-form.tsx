import { TextInput, Button, Group, Switch, Stack, Text, Select, ActionIcon, NumberInput, Alert, Box } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect, useState } from 'react';
import { Block, CreateBlockDto, UpdateBlockDto } from '@rootstock/blocks/blocks-data-access';
import { useVarieties } from '@rootstock/master-data/varieties/varieties-data-access';
import { IconTrash, IconPlus, IconAlertTriangle } from '@tabler/icons-react';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { FormLayout } from '@rootstock/ui/web';

export type BlockFormMode = 'create' | 'edit' | 'view';

interface BlockFormProps {
  mode: BlockFormMode;
  initialValues?: Block | null;
  onSubmit: (values: CreateBlockDto | UpdateBlockDto) => void;
  onCancel: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  draftValues?: Partial<CreateBlockDto>;
  onValuesChange?: (values: Partial<CreateBlockDto>) => void;
}

export function BlockForm({ 
  mode, 
  initialValues, 
  onSubmit, 
  onCancel, 
  onEdit, 
  isLoading, 
  onDirtyChange,
  draftValues,
  onValuesChange
}: BlockFormProps) {
  const { varietiesQuery } = useVarieties();
  const { data: varieties } = varietiesQuery;
  const { can } = usePermission();
  const [showReplantingWarning, setShowReplantingWarning] = useState(false);

  const form = useForm({
    initialValues: {
      name: initialValues?.name || '',
      isActive: initialValues?.isActive ?? true,
      plantings: initialValues?.plantings?.map(p => ({
        varietyId: p.varietyId,
        treeCount: p.treeCount
      })) || [{ varietyId: '', treeCount: 0 }],
      ...draftValues,
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Name must be at least 2 characters' : null),
      plantings: {
        varietyId: (value) => (!value ? 'Variety is required' : null),
        treeCount: (value) => (value < 0 ? 'Tree count must be positive' : null),
      },
    },
  });

  useEffect(() => {
    if (mode === 'create' && onValuesChange) {
      onValuesChange(form.values);
    }
  }, [form.values, mode, onValuesChange]);

  useEffect(() => {
    if (initialValues) {
      form.setValues({
        name: initialValues.name,
        isActive: initialValues.isActive,
        plantings: initialValues.plantings?.map(p => ({
          varietyId: p.varietyId,
          treeCount: p.treeCount
        })) || [],
      });
      form.resetDirty();
    } else if (mode === 'create' && draftValues) {
      form.setValues({
        name: draftValues.name || '',
        plantings: draftValues.plantings || [{ varietyId: '', treeCount: 0 }],
      });
    }
  }, [initialValues, mode, draftValues]);

  useEffect(() => {
    onDirtyChange?.(form.isDirty());
    
    // Check for replanting warning
    if (mode === 'edit' && initialValues) {
      const hasVarietyChanged = form.values.plantings.some((p, index) => {
        const initialP = initialValues.plantings[index];
        return initialP && p.varietyId !== initialP.varietyId;
      });
      setShowReplantingWarning(hasVarietyChanged);
    }
  }, [form.values, mode, initialValues, onDirtyChange]);

  const handleSubmit = (values: typeof form.values) => {
    if (mode === 'create') {
      const { isActive, ...createValues } = values;
      onSubmit(createValues);
    } else {
      onSubmit(values);
    }
  };

  const varietyOptions = varieties?.map(v => ({ value: v._id, label: v.name })) || [];

  const isView = mode === 'view';

  return (
    <FormLayout
      mode={mode}
      isDirty={form.isDirty()}
      isLoading={isLoading}
      onCancel={onCancel}
      onSubmit={form.onSubmit(handleSubmit)}
      onEdit={onEdit}
      canEdit={can(PERMISSIONS.BLOCK_EDIT)}
    >
      <TextInput
        label="Name"
        placeholder="Block Name"
        required={!isView}
        readOnly={isView}
        {...form.getInputProps('name')}
      />

      <Box mt="md">
        <Group justify="space-between" mb="xs">
          <Text fw={500} size="sm">Plantings</Text>
          {!isView && (
            <Button 
              variant="subtle" 
              size="xs" 
              leftSection={<IconPlus size={14} />}
              onClick={() => form.insertListItem('plantings', { varietyId: '', treeCount: 0 })}
            >
              Add Planting
            </Button>
          )}
        </Group>

        {showReplantingWarning && (
          <Alert icon={<IconAlertTriangle size={16} />} title="Replanting Warning" color="yellow" mb="sm">
            Changing variety will not update historical assessments.
          </Alert>
        )}

        <Stack gap="sm">
          {form.values.plantings.map((item, index) => (
            <Group key={index} align="flex-start">
              <Select
                placeholder="Select Variety"
                data={varietyOptions}
                readOnly={isView}
                style={{ flex: 1 }}
                {...form.getInputProps(`plantings.${index}.varietyId`)}
              />
              <NumberInput
                placeholder="Count"
                min={0}
                readOnly={isView}
                style={{ width: 100 }}
                {...form.getInputProps(`plantings.${index}.treeCount`)}
              />
              {!isView && form.values.plantings.length > 1 && (
                <ActionIcon 
                  color="red" 
                  variant="subtle" 
                  onClick={() => form.removeListItem('plantings', index)}
                  mt={4}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              )}
            </Group>
          ))}
        </Stack>
      </Box>

      {mode !== 'create' && (
        <Switch
          label="Active"
          readOnly={isView}
          disabled={isView} // Switch needs disabled to prevent interaction usually, but readOnly might work in newer Mantine. Keeping disabled for Switch is usually acceptable as it's a toggle.
          {...form.getInputProps('isActive', { type: 'checkbox' })}
          mt="md"
        />
      )}
    </FormLayout>
  );
}
