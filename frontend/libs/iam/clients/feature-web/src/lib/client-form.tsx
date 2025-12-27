// frontend/libs/clients/feature-web/src/lib/client-form.tsx
import { useEffect } from 'react';
import { TextInput, Switch } from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  CreateClientDto,
  UpdateClientDto,
  Client,
} from '@rootstock/clients/clients-data-access';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { FormLayout } from '@rootstock/ui/web';

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
  fullHeight?: boolean;
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
  onDirtyChange,
  fullHeight = true,
}: ClientFormProps) {
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';
  const { can } = usePermission();

  const form = useForm({
    initialValues: {
      name: '',
      isActive: true,
      ...initialValues,
    },
    validate: {
      name: (value) => (value.trim().length < 1 ? 'Name is required' : null),
    },
  });

  useEffect(() => {
    if (isCreating && onValuesChange) {
      const { isActive, ...rest } = form.values;
      onValuesChange(rest as any);
    }
  }, [form.values, isCreating, onValuesChange]);

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(form.isDirty());
    }
  }, [form.values, onDirtyChange]);

  useEffect(() => {
    if (client && (isEditing || isViewing)) {
      form.initialize({
        name: client.name,
        isActive: client.isActive,
      });
    } else if (isCreating && initialValues) {
      form.setValues({
        name: initialValues.name || ''
      });
    }
  }, [client, mode, isEditing, isViewing, isCreating]);

  const handleSubmit = (values: typeof form.values) => {
    if (isCreating) {
      const { isActive, ...createValues } = values;
      onSubmit(createValues);
    } else {
      onSubmit(values);
    }
  };

  const handleValidationErrors = () => {
    notify.validation();
  };

  const handleClear = () => {
    form.setValues({
      name: '',
    });
  };

  const isView = mode === 'view';

  return (
    <FormLayout
      mode={mode}
      isLoading={isLoading}
      onCancel={onCancel}
      onSubmit={form.onSubmit(handleSubmit, handleValidationErrors)}
      onEdit={onEdit}
      onClear={isCreating ? handleClear : undefined}
      canEdit={can(PERMISSIONS.CLIENT_EDIT)}
      submitLabel={isEditing ? 'Update Client' : 'Create Client'}
      isDirty={form.isDirty()}
      fullHeight={fullHeight}
    >
      <TextInput
        label="Name"
        placeholder="Client Name"
        withAsterisk={!isView}
        readOnly={isView}
        {...form.getInputProps('name')}
      />

      {mode !== 'create' && (
        <Switch
          label="Active"
          disabled={isView}
          checked={form.values.isActive}
          {...form.getInputProps('isActive', { type: 'checkbox' })}
        />
      )}
    </FormLayout>
  );
}
