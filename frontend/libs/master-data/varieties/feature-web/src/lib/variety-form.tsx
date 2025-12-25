import { TextInput, Switch } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import { Variety, CreateVarietyDto, UpdateVarietyDto } from '@rootstock/master-data/varieties/varieties-data-access';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { FormLayout } from '@rootstock/ui/web';

export type VarietyFormMode = 'create' | 'edit' | 'view';

interface VarietyFormProps {
  mode: VarietyFormMode;
  initialValues?: Variety | null;
  onSubmit: (values: CreateVarietyDto | UpdateVarietyDto) => void;
  onCancel: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  draftValues?: Partial<CreateVarietyDto>;
  onValuesChange?: (values: Partial<CreateVarietyDto>) => void;
}

export function VarietyForm({ 
  mode, 
  initialValues, 
  onSubmit, 
  onCancel, 
  onEdit, 
  isLoading, 
  onDirtyChange,
  draftValues,
  onValuesChange
}: VarietyFormProps) {
  const { can } = usePermission();
  const form = useForm({
    initialValues: {
      name: initialValues?.name || '',
      isActive: initialValues?.isActive ?? true,
      ...draftValues,
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Name must be at least 2 characters' : null),
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
      });
      form.resetDirty();
    } else if (mode === 'create') {
      form.setValues({
        name: draftValues?.name || '',
        isActive: true,
      });
    }
  }, [initialValues, mode]);

  useEffect(() => {
    if (mode === 'edit') {
      onDirtyChange?.(form.isDirty());
    }
  }, [form.isDirty(), onDirtyChange, mode]);

  const handleSubmit = (values: typeof form.values) => {
    if (mode === 'create') {
      const { isActive, ...createValues } = values;
      onSubmit(createValues);
    } else {
      onSubmit(values);
    }
  };

  const handleClear = () => {
    form.setValues({
      name: '',
      isActive: true,
    });
  };

  return (
    <FormLayout
      mode={mode}
      isDirty={form.isDirty()}
      isLoading={isLoading}
      onCancel={onCancel}
      onSubmit={form.onSubmit(handleSubmit)}
      onEdit={onEdit}
      onClear={mode === 'create' ? handleClear : undefined}
      canEdit={can(PERMISSIONS.VARIETY_EDIT)}
    >
      <TextInput
        label="Name"
        placeholder="Variety Name"
        required={mode !== 'view'}
        readOnly={mode === 'view'}
        {...form.getInputProps('name')}
      />

      {mode !== 'create' && (
        <Switch
          label="Active"
          readOnly={mode === 'view'}
          disabled={mode === 'view'}
          {...form.getInputProps('isActive', { type: 'checkbox' })}
          mt="md"
        />
      )}
    </FormLayout>
  );
}