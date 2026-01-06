// frontend/libs/clients/feature-web/src/lib/client-form.tsx
import { useEffect } from 'react';
import { TextInput, Switch } from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  Client,
  ClientFormData,
} from '@rootstock/iam/clients/clients-data-access';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { FormLayout } from '@rootstock/ui/web';

// ### Interfaces & Types ###
export type ClientFormMode = 'create' | 'edit' | 'view';

interface ClientFormProps {
  mode: ClientFormMode;
  client?: Client | null;
  initialValues?: Partial<ClientFormData>;
  onSubmit: (values: ClientFormData) => void;
  isLoading: boolean;
  onCancel: () => void;
  onEdit?: () => void;
  onValuesChange?: (values: Partial<ClientFormData>) => void;
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

  // ### Form Modes, Permissions & State ###
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';

  const { can } = usePermission();

  // ### Form Definition ###
  const form = useForm<ClientFormData>({
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

  // ### Side Effects ###
  useEffect(() => {
    if (isCreating && onValuesChange) {
      const { isActive, ...rest } = form.values;
      onValuesChange(rest as ClientFormData);
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

  // ### Event Handlers ###
  const handleSubmit = (values: typeof form.values) => {
    const submissionData: any = { ...values };
    if (isEditing) {
      // Only send isActive if it has actually changed
      if (client && client.isActive === values.isActive) {
        delete submissionData.isActive;
      }
      submissionData.__v = client!.__v;
    }
    if (isCreating) {
      delete submissionData.isActive;
      delete submissionData.__v;
    }
    onSubmit(submissionData as ClientFormData);
  };

  const handleValidationErrors = () => {
    notify.validation();
  };

  const handleClear = () => {
    form.setValues({
      name: '',
    });
  };

  // ### Render ###
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
        withAsterisk={!isViewing}
        readOnly={isViewing}
        {...form.getInputProps('name')}
      />

      {mode !== 'create' && can(PERMISSIONS.CLIENT_MANAGE_INACTIVE) && (
        <Switch
          label="Active"
          readOnly={isViewing}
          style={{ pointerEvents: isViewing ? 'none' : 'auto' }}
          {...form.getInputProps('isActive', { type: 'checkbox' })}
          mt={26} // Align with input
        />
      )}
    </FormLayout>
  );
}
