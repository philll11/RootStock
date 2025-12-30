// frontend/libs/assets/orchards/feature-web/src/lib/orchard-form.tsx
import { useEffect } from 'react';
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
import { IconInfoCircle } from '@tabler/icons-react';
import { useGetClients } from '@rootstock/iam/clients/clients-data-access';
import { useGetUsers } from '@rootstock/iam/users/users-data-access';
import {
  Orchard,
  CreateOrchardDto,
  UpdateOrchardDto,
} from '@rootstock/assets/orchards/orchards-data-access';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { iconSizes } from '@rootstock/ui/theme';
import { FormLayout } from '@rootstock/ui/web';

export type OrchardFormMode = 'create' | 'edit' | 'view';

interface OrchardFormProps {
  mode: OrchardFormMode;
  orchard?: Orchard | null;
  initialValues?: Partial<CreateOrchardDto>;
  onSubmit: (values: CreateOrchardDto | UpdateOrchardDto) => void;
  isLoading: boolean;
  onCancel: () => void;
  onEdit?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onValuesChange?: (values: Partial<CreateOrchardDto>) => void;
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
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';
  const { data: clients = [], isLoading: isLoadingClients } = useGetClients();
  const { data: users = [], isLoading: isLoadingUsers } = useGetUsers();
  const { can } = usePermission();


  const form = useForm({
    initialValues: {
      name: '',
      clientId: null as string | null,
      userIds: [] as string[],
      isActive: true,
      __v: 0,
      ...initialValues,
    },
    validate: {
      name: (value) => (value.trim().length < 1 ? 'Name is required' : null),
      clientId: (value) => (!value ? 'Client is required' : null),
    },
  });

  useEffect(() => {
    if (isCreating && onValuesChange) {
      const { isActive, ...rest } = form.values;
      onValuesChange(rest as CreateOrchardDto);
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

  const handleSubmit = (values: typeof form.values) => {
    if (isCreating) {
      const { isActive, __v, ...createValues } = values;
      onSubmit(createValues as CreateOrchardDto);
    } else {
      const submissionData: UpdateOrchardDto = { ...values };
      // Only send isActive if it has actually changed
      if (orchard && orchard.isActive === values.isActive) {
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
      clientId: null,
      userIds: [],
    });
  };

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
            data={clients?.map((c) => ({ value: c._id, label: c.name })) || []}
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
          data={
            users?.map((u) => ({
              value: u._id,
              label: `${u.firstName} ${u.lastName}`,
            })) || []
          }
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
          disabled={isViewing}
          {...form.getInputProps('isActive', { type: 'checkbox' })}
          mt="md"
        />
      )}
    </FormLayout>
  );
}
