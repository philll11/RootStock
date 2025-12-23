import { useEffect } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, Checkbox, Select, MultiSelect, Text, Alert, Box } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useClients } from '@rootstock/clients/clients-data-access';
import { useUsers } from '@rootstock/users/users-data-access';
import { Orchard, CreateOrchardDto, UpdateOrchardDto } from '@rootstock/orchards/orchards-data-access';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { iconSizes } from '@rootstock/ui/theme';
import { FormLayout } from '@rootstock/ui/web';

interface OrchardFormProps {
  orchard?: Orchard | null;
  mode: 'create' | 'edit' | 'view';
  onSubmit: (values: CreateOrchardDto | UpdateOrchardDto) => void;
  onCancel: () => void;
  onEdit?: () => void;
  isLoading: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  initialValues?: Partial<CreateOrchardDto>;
  onValuesChange?: (values: Partial<CreateOrchardDto>) => void;
}

export function OrchardForm({ 
  orchard, 
  mode, 
  onSubmit, 
  onCancel, 
  onEdit, 
  isLoading, 
  onDirtyChange,
  initialValues,
  onValuesChange
}: OrchardFormProps) {
  const { clients, isLoading: isLoadingClients } = useClients();
  const { users, isLoading: isLoadingUsers } = useUsers();
  const { can } = usePermission();

  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';

  const form = useForm({
    initialValues: {
      name: '',
      clientId: '',
      userIds: [] as string[],
      isActive: true,
      ...initialValues,
    },
    validate: {
      name: (value) => (value.trim().length < 1 ? 'Name is required' : null),
      clientId: (value) => (value.trim().length < 1 ? 'Client is required' : null),
    },
  });

  useEffect(() => {
    if (isCreating && onValuesChange) {
      onValuesChange(form.values);
    }
  }, [form.values, isCreating, onValuesChange]);

  useEffect(() => {
    if (isEditing && onDirtyChange) {
      onDirtyChange(form.isDirty());
    }
  }, [form.values, isEditing, onDirtyChange]);

  useEffect(() => {
    if (orchard && (isEditing || isViewing)) {
      form.initialize({
        name: orchard.name,
        clientId: typeof orchard.clientId === 'object' ? orchard.clientId._id : orchard.clientId,
        userIds: orchard.userIds?.map(u => typeof u === 'object' ? u._id : u) || [],
        isActive: orchard.isActive,
      });
    } else if (isCreating && initialValues) {
      form.setValues({
        name: initialValues.name || '',
        clientId: initialValues.clientId || '',
        userIds: initialValues.userIds || []
      });
    }
  }, [orchard, mode, isEditing, isViewing, isCreating]);

  const handleSubmit = (values: typeof form.values) => {
    if (isCreating) {
      const dto: CreateOrchardDto = {
        name: values.name,
        clientId: values.clientId,
        userIds: values.userIds,
      };
      onSubmit(dto);
    } else if (isEditing) {
      const dto: UpdateOrchardDto = {
        name: values.name,
        userIds: values.userIds,
        isActive: values.isActive,
      };
      onSubmit(dto);
    }
  };

  const handleValidationErrors = () => {
    notify.validation();
  };

  return (
    <FormLayout
      mode={mode}
      isDirty={form.isDirty()}
      isLoading={isLoading || isLoadingClients || isLoadingUsers}
      onCancel={onCancel}
      onSubmit={form.onSubmit(handleSubmit, handleValidationErrors)}
      onEdit={onEdit}
      canEdit={can(PERMISSIONS.ORCHARD_EDIT)}
    >
      <TextInput
        label="Orchard Name"
        placeholder="Enter orchard name"
        withAsterisk={!isViewing}
        readOnly={isViewing}
        {...form.getInputProps('name')}
      />

      <Box mt="md">
        <Select
          label="Client"
          placeholder="Select client"
          data={clients?.map(c => ({ value: c._id, label: c.name })) || []}
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

      <Box mt="md">
        <MultiSelect
          label="Assign Users"
          placeholder="Select users"
          data={users?.map(u => ({ value: u._id, label: `${u.firstName} ${u.lastName}` })) || []}
          searchable
          readOnly={isViewing}
          {...form.getInputProps('userIds')}
        />
        
        {!isViewing && (
          <Alert icon={<IconInfoCircle size={iconSizes.md} />} title="Smart Assignment" color="blue" variant="light" mt="sm">
            Assigning users to this orchard will automatically grant them access to the parent Client.
          </Alert>
        )}
      </Box>

      {!isCreating && (
        <Checkbox
          label="Active"
          mt="md"
          readOnly={isViewing}
          disabled={isViewing}
          {...form.getInputProps('isActive', { type: 'checkbox' })}
        />
      )}
    </FormLayout>
  );
}