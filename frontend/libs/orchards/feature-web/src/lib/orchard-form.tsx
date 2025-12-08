import { useEffect } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, Button, Group, Stack, LoadingOverlay, Checkbox, Select, MultiSelect, Text, Alert, Box } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useClients } from '@rootstock/clients/clients-data-access';
import { useUsers } from '@rootstock/users/users-data-access';
import { Orchard, CreateOrchardDto, UpdateOrchardDto } from '@rootstock/orchards/orchards-data-access';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/auth/auth-data-access';

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
  // Fetch data for dropdowns
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
  // Sync form values to parent for persistence (only in create mode)
  useEffect(() => {
    if (isCreating && onValuesChange) {
      onValuesChange(form.values);
    }
  }, [form.values, isCreating, onValuesChange]);

  // Track dirty state
  useEffect(() => {
    if (isEditing && onDirtyChange) {
      onDirtyChange(form.isDirty());
    }
  }, [form.values, isEditing, onDirtyChange]);

  // Populate form when editing/viewing
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

  if (isViewing && orchard) {
    return (
      <Stack>
        <div>
          <Text size="sm" c="dimmed">Record ID</Text>
          <Text>{orchard.recordId}</Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Name</Text>
          <Text>{orchard.name}</Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Client</Text>
          <Text>{typeof orchard.clientId === 'object' ? orchard.clientId.name : 'Unknown'}</Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Assigned Users</Text>
          <Text>
            {orchard.userIds?.map(u => typeof u === 'object' ? u.name : '').filter(Boolean).join(', ') || 'None'}
          </Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Status</Text>
          <Text>{orchard.isActive ? 'Active' : 'Inactive'}</Text>
        </div>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel}>Close</Button>
          {can(PERMISSIONS.ORCHARD_EDIT) && (
            <Button onClick={onEdit}>Edit</Button>
          )}
        </Group>
      </Stack>
    );
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit, handleValidationErrors)}>
      <Box pos="relative">
        <LoadingOverlay visible={isLoading || isLoadingClients || isLoadingUsers} />
        
        <TextInput
          label="Orchard Name"
          placeholder="Enter orchard name"
          withAsterisk
          mb="md"
          {...form.getInputProps('name')}
        />

        <Select
          label="Client"
          placeholder="Select client"
          data={clients?.map(c => ({ value: c._id, label: c.name })) || []}
          withAsterisk
          disabled={isEditing} // Immutable Client Rule
          mb={isEditing ? 0 : 'md'}
          {...form.getInputProps('clientId')}
        />
        {isEditing && (
          <Text size="xs" c="dimmed" mt={4} mb="md">
            Client cannot be changed after creation.
          </Text>
        )}

        <MultiSelect
          label="Assign Users"
          placeholder="Select users"
          data={users?.map(u => ({ value: u._id, label: `${u.firstName} ${u.lastName}` })) || []}
          searchable
          mb="md"
          {...form.getInputProps('userIds')}
        />
        <Alert icon={<IconInfoCircle size={16} />} title="Smart Assignment" color="blue" variant="light" mb="md">
          Assigning users to this orchard will automatically grant them access to the parent Client.
        </Alert>

        {isEditing && (
          <Checkbox
            label="Active"
            mb="md"
            {...form.getInputProps('isActive', { type: 'checkbox' })}
          />
        )}

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={onCancel}>Cancel</Button>
          <Button type="submit" loading={isLoading}>
            {isCreating ? 'Create Orchard' : 'Save Changes'}
          </Button>
        </Group>
      </Box>
    </form>
  );
}