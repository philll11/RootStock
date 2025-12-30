// frontend/libs/clients/feature-web/src/lib/client-form.tsx
import { useEffect } from 'react';
import { TextInput, Switch } from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  CreateClientDto,
  UpdateClientDto,
  Client,
} from '@rootstock/iam/clients/clients-data-access';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
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
      __v: 0,
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
        __v: client.__v,
      });
    } else if (isCreating && initialValues) {
      form.setValues({
        name: initialValues.name || ''
      });
    }
  }, [client, mode, isEditing, isViewing, isCreating]);

  const handleSubmit = (values: typeof form.values) => {
    if (isCreating) {
      const { isActive, __v, ...createValues } = values;
      onSubmit(createValues);
    } else {
      const submissionData: any = { ...values };
      // Only send isActive if it has actually changed
      if (client && client.isActive === values.isActive) {
        delete submissionData.isActive;
      }
      onSubmit(submissionData);
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

      {mode !== 'create' && can(PERMISSIONS.CLIENT_MANAGE_INACTIVE) && (
        <Switch
          label="Active"
          disabled={isView}
          checked={form.values.isActive}
          {...form.getInputProps('isActive', { type: 'checkbox' })}
            mt={26} // Align with input
        />
      )}
    </FormLayout>
  );
}
