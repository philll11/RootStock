import { TextInput, Switch } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zodResolver } from '@rootstock/ui/web';
import { useEffect } from 'react';
import { Variety, VarietyFormData, varietySchema } from '@rootstock/master-data/varieties/varieties-data-access';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { FormLayout } from '@rootstock/ui/web';

// ### Interfaces & Types ###
export type VarietyFormMode = 'create' | 'edit' | 'view';

interface VarietyFormProps {
  mode: VarietyFormMode;
  variety?: Variety | null;
  onSubmit: (values: VarietyFormData) => void;
  onCancel: () => void;
  onEdit?: () => void;
  isLoading?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  initialValues?: Partial<VarietyFormData>;
  onValuesChange?: (values: Partial<VarietyFormData>) => void;
  fullHeight?: boolean;
}

export function VarietyForm({
  mode,
  variety,
  onSubmit,
  onCancel,
  onEdit,
  isLoading,
  onDirtyChange,
  initialValues,
  onValuesChange,
  fullHeight = true,
}: VarietyFormProps) {

  // ### Form Modes, Permissions & State ###
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';

  const { can } = usePermission();

  // ### Form Definition ###
  const form = useForm<VarietyFormData & { __v: number }>({
    initialValues: {
      name: '',
      isActive: true,
      __v: 0,
      ...initialValues,
    },
    validate: zodResolver(varietySchema),
  });

  // ### Side Effects ###
  useEffect(() => {
    if (isCreating && onValuesChange) {
      const { isActive, ...rest } = form.values;
      onValuesChange(rest as VarietyFormData);
    }
  }, [form.values, isCreating, onValuesChange]);

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(form.isDirty());
    }
  }, [form.values, onDirtyChange]);

  useEffect(() => {
    if (variety && (isEditing || isViewing)) {
      form.initialize({
        name: variety.name,
        isActive: variety.isActive,
        __v: variety.__v,
      });
    } else if (isCreating && initialValues) {
      form.setValues({
        name: initialValues?.name || '',
        isActive: true,
      });
    }
  }, [variety, mode]);

  // ### Event Handlers ###
  const handleSubmit = (values: typeof form.values) => {
    const submissionData: any = { ...values };
    if (isEditing) {
      submissionData.__v = variety!.__v;
    }
    if (isCreating) {
      delete submissionData.isActive;
      delete submissionData.__v;
    }
    onSubmit(submissionData as VarietyFormData);
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
      isDirty={form.isDirty()}
      isLoading={isLoading}
      onCancel={onCancel}
      onSubmit={form.onSubmit(handleSubmit, handleValidationErrors)}
      onEdit={onEdit}
      onClear={isCreating ? handleClear : undefined}
      canEdit={can(PERMISSIONS.VARIETY_EDIT)}
      fullHeight={fullHeight}
    >
      <TextInput
        label="Name"
        placeholder="Variety Name"
        required={!isViewing}
        readOnly={isViewing}
        {...form.getInputProps('name')}
      />

      {!isCreating && can(PERMISSIONS.VARIETY_MANAGE_INACTIVE) && (
        <Switch
          label="Active"
          readOnly={isViewing}
          style={{ pointerEvents: isViewing ? 'none' : 'auto' }}
          {...form.getInputProps('isActive', { type: 'checkbox' })}
          mt="md"
        />
      )}
    </FormLayout>
  );
}