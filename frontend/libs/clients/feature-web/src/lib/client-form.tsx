import { TextInput, Button, Group, Checkbox, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { z } from 'zod';
import { CreateClientDto, UpdateClientDto, Client } from '@rootstock/clients/clients-data-access';
import { useEffect } from 'react';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/auth/auth-data-access';

export type ClientFormMode = 'create' | 'edit' | 'view';

interface ClientFormProps {
  mode: ClientFormMode;
  client?: Client | null;
  initialValues?: Partial<CreateClientDto>;
  onSubmit: (values: CreateClientDto | UpdateClientDto) => void;
  isLoading: boolean;
  onCancel: () => void;
  onEdit?: () => void;
  onValuesChange?: (values: Partial<CreateClientDto>) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ClientForm({ 
  mode, 
  client, 
  initialValues,
  onSubmit, 
  isLoading, 
  onCancel, 
  onEdit,
  onValuesChange,
  onDirtyChange
}: ClientFormProps) {
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';
  const { can } = usePermission();

  const form = useForm({
    initialValues: {
      name: '',
      isActive: true,
      // subsidiaryId: '', // TODO: Implement subsidiary selection
      ...initialValues,
    },
    validate: {
      name: (value) => (value.trim().length < 1 ? 'Name is required' : null),
    },
  });

  // Sync form values to parent for persistence (only in create mode)
  useEffect(() => {
    if (isCreating && onValuesChange) {
      const { isActive, ...rest } = form.values;
      onValuesChange(rest);
    }
  }, [form.values, isCreating, onValuesChange]);

  // Track dirty state for edit mode
  useEffect(() => {
    if (isEditing && onDirtyChange) {
      onDirtyChange(form.isDirty());
    }
  }, [form.values, isEditing, onDirtyChange]);

  useEffect(() => {
    if (client && (isEditing || isViewing)) {
      form.initialize({
        name: client.name,
        isActive: client.isActive,
      });
    } else if (isCreating && initialValues) {
      form.setValues({
        name: initialValues.name || '',
        isActive: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, mode]);

  const handleSubmit = (values: typeof form.values) => {
    if (isCreating) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { isActive, ...createValues } = values;
      onSubmit(createValues);
    } else {
      onSubmit(values);
    }
  };

  const handleValidationErrors = () => {
    notify.validation();
  };

  if (isViewing && client) {
    return (
      <Stack>
        <div>
          <Text size="sm" c="dimmed">Record ID</Text>
          <Text>{client.recordId}</Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Name</Text>
          <Text>{client.name}</Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Status</Text>
          <Text>{client.isActive ? 'Active' : 'Inactive'}</Text>
        </div>
        
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={onCancel}>Close</Button>
          {can(PERMISSIONS.CLIENT_EDIT) && (
            <Button onClick={onEdit}>Edit</Button>
          )}
        </Group>
      </Stack>
    );
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit, handleValidationErrors)}>
      <TextInput
        withAsterisk
        label="Name"
        placeholder="Client Name"
        mb="md"
        {...form.getInputProps('name')}
      />

      {isEditing && (
        <Checkbox
          label="Active"
          mb="md"
          {...form.getInputProps('isActive', { type: 'checkbox' })}
        />
      )}

      <Group justify="flex-end" mt="xl">
        <Button variant="default" onClick={onCancel}>Cancel</Button>
        {can(isEditing ? PERMISSIONS.CLIENT_EDIT : PERMISSIONS.CLIENT_CREATE) && (
          <Button type="submit" loading={isLoading}>
            {isEditing ? 'Update Client' : 'Create Client'}
          </Button>
        )}
      </Group>
    </form>
  );
}
