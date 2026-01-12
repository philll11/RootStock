// frontend/libs/assets/orchards/feature-web/src/lib/orchard-form.tsx
import { useEffect, useMemo } from 'react';
import {
  TextInput,
  Switch,
  Select,
  MultiSelect,
  Text,
  Alert,
  Box,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { zodResolver } from '@rootstock/ui/web';
import { IconInfoCircle } from '@tabler/icons-react';
import { useGetClients } from '@rootstock/iam/clients/clients-data-access';
import { useGetUsers } from '@rootstock/iam/users/users-data-access';
import {
  Orchard,
  OrchardFormData,
  orchardSchema,
} from '@rootstock/assets/orchards/orchards-data-access';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { iconSizes } from '@rootstock/ui/theme';
import { FormLayout } from '@rootstock/ui/web';

// ### Interfaces & Types ###
export type OrchardFormMode = 'create' | 'edit' | 'view';

interface OrchardFormProps {
  mode: OrchardFormMode;
  orchard?: Orchard | null;
  initialValues?: Partial<OrchardFormData>;
  onSubmit: (values: OrchardFormData) => void;
  isLoading: boolean;
  onCancel: () => void;
  onEdit?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onValuesChange?: (values: Partial<OrchardFormData>) => void;
  fullHeight?: boolean;
}

export function OrchardForm({
  mode,
  orchard,
  initialValues,
  onSubmit,
  isLoading,
  onCancel,
  onEdit,
  onValuesChange,
  onDirtyChange,
  fullHeight = true,
}: OrchardFormProps) {

  // ### Form Modes, Permissions & State ###
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';

  const { can } = usePermission()

  // ### Form Definition ###
  const form = useForm<OrchardFormData>({
    initialValues: {
      name: '',
      clientId: null as string | null,
      userIds: [] as string[],
      isActive: true,
      __v: 0,
      ...initialValues,
    },
    validate: zodResolver(orchardSchema),
  });
  ;

  // ### Data Fetching & Options ###
  const { data: clients = [], isLoading: isLoadingClients } = useGetClients();
  const { data: users = [], isLoading: isLoadingUsers } = useGetUsers();

  const clientOptions = useMemo(() => {
    return (clients || []).map((c) => ({ value: c._id, label: c.name }));
  }, [clients]);

  const userOptions = useMemo(() => {
    return (users || []).map((u) => ({
      value: u._id,
      label: `${u.firstName} ${u.lastName}`,
    }));
  }, [users]);


  // ### Side Effects ###
  useEffect(() => {
    if (isCreating && onValuesChange) {
      const { isActive, ...rest } = form.values;
      onValuesChange(rest as OrchardFormData);
    }
  }, [form.values, isCreating, onValuesChange]);

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(form.isDirty());
    }
  }, [form.values, onDirtyChange]);

  useEffect(() => {
    if (orchard && (isEditing || isViewing)) {
      form.initialize({
        name: orchard.name,
        clientId: typeof orchard.clientId === 'object' ? orchard.clientId._id : orchard.clientId,
        userIds: orchard.userIds?.map((u) => (typeof u === 'object' ? u._id : u)) || [],
        isActive: orchard.isActive,
        __v: orchard.__v,
      });
    } else if (isCreating && initialValues) {
      form.setValues({
        name: initialValues.name || '',
        clientId: initialValues.clientId || null,
        userIds: initialValues.userIds || []
      });
    }
  }, [orchard, mode, isEditing, isViewing, isCreating]);

  // ### Event Handlers ###
  const handleSubmit = (values: typeof form.values) => {
    const submissionData: any = { ...values };
    if (isEditing) {
      submissionData.__v = orchard!.__v;
    }
    if (isCreating) {
      delete submissionData.isActive;
      delete submissionData.__v;
    }
    onSubmit(submissionData as OrchardFormData);
  };

  const handleValidationErrors = () => {
    notify.validation();
  };

  const handleClear = () => {
    form.setValues({
      name: '',
      clientId: null,
      userIds: [],
    });
  };

  // ### Render ###
  return (
    <FormLayout
      mode={mode}
      isLoading={isLoading || isLoadingClients || isLoadingUsers}
      onCancel={onCancel}
      onSubmit={form.onSubmit(handleSubmit, handleValidationErrors)}
      onEdit={onEdit}
      onClear={isCreating ? handleClear : undefined}
      canEdit={can(PERMISSIONS.ORCHARD_EDIT)}
      submitLabel={isEditing ? 'Update Orchard' : 'Create Orchard'}
      isDirty={form.isDirty()}
      fullHeight={fullHeight}
    >
      <Group grow align="flex-start">
        <TextInput
          label="Orchard Name"
          placeholder="Enter orchard name"
          withAsterisk={!isViewing}
          readOnly={isViewing}
          {...form.getInputProps('name')}
        />

        <Box>
          <Select
            label="Client"
            placeholder="Select client"
            data={clientOptions}
            withAsterisk={!isViewing}
            disabled={isEditing}
            readOnly={isViewing}
            {...form.getInputProps('clientId')}
          />
          {isEditing && (
            <Text size="xs" c="dimmed" mt={4}>
              Client cannot be changed after creation.
            </Text>
          )}
        </Box>
      </Group>

      <Box mt="md">
        <MultiSelect
          label="Assign Users"
          placeholder="Select users"
          data={userOptions}
          searchable
          readOnly={isViewing}
          {...form.getInputProps('userIds')}
        />

        {!isViewing && (
          <Alert
            icon={<IconInfoCircle size={iconSizes.md} />}
            title="Smart Assignment"
            color="blue"
            variant="light"
            mt="sm"
          >
            Assigning users to this orchard will automatically grant them access
            to the parent Client.
          </Alert>
        )}
      </Box>

      {!isCreating && can(PERMISSIONS.ORCHARD_MANAGE_INACTIVE) && (
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
