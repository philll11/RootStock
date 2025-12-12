import { TextInput, Button, Group, Switch, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import { Variety, CreateVarietyDto, UpdateVarietyDto } from '@rootstock/master-data/varieties/varieties-data-access';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export type VarietyFormMode = 'create' | 'edit' | 'view';

interface VarietyFormProps {
  mode: VarietyFormMode;
  initialValues?: Variety | null;
  onSubmit: (values: CreateVarietyDto | UpdateVarietyDto) => void;
  onCancel: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function VarietyForm({ mode, initialValues, onSubmit, onCancel, onEdit, isLoading, onDirtyChange }: VarietyFormProps) {
  const { can } = usePermission();
  const form = useForm({
    initialValues: {
      name: initialValues?.name || '',
      isActive: initialValues?.isActive ?? true,
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Name must be at least 2 characters' : null),
    },
  });

  useEffect(() => {
    if (initialValues) {
      form.setValues({
        name: initialValues.name,
        isActive: initialValues.isActive,
      });
      form.resetDirty();
    }
  }, [initialValues]);

  useEffect(() => {
    onDirtyChange?.(form.isDirty());
  }, [form.isDirty(), onDirtyChange]);

  const handleSubmit = (values: typeof form.values) => {
    if (mode === 'create') {
      const { isActive, ...createValues } = values;
      onSubmit(createValues);
    } else {
      onSubmit(values);
    }
  };

  if (mode === 'view' && initialValues) {
    return (
      <Stack>
        <div>
          <Text size="sm" c="dimmed">Record ID</Text>
          <Text>{initialValues.recordId}</Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Name</Text>
          <Text>{initialValues.name}</Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Status</Text>
          <Text>{initialValues.isActive ? 'Active' : 'Inactive'}</Text>
        </div>
        
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={onCancel}>Close</Button>
          {can(PERMISSIONS.VARIETY_EDIT) && (
            <Button onClick={onEdit}>Edit</Button>
          )}
        </Group>
      </Stack>
    );
  }

  const isReadOnly = mode === 'view';

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput
          label="Name"
          placeholder="Variety Name"
          required
          readOnly={isReadOnly}
          {...form.getInputProps('name')}
        />

        {mode !== 'create' && (
          <Switch
            label="Active"
            readOnly={isReadOnly}
            disabled={isReadOnly}
            {...form.getInputProps('isActive', { type: 'checkbox' })}
          />
        )}

        {!isReadOnly && (
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading}>
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </Group>
        )}
      </Stack>
    </form>
  );
}
