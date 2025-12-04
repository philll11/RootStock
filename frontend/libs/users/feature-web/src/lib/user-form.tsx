import { TextInput, Select, Button, Group, PasswordInput, Text, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { z } from 'zod';
import { UserType, CreateUserDto, UpdateUserDto, User } from '@rootstock/users/users-data-access';
import { useEffect, useState } from 'react';
import { notify } from '@rootstock/shared/util';
import { SearchableMultiSelect } from '@rootstock/ui/web';
import { searchClients, getClient } from '@rootstock/clients/clients-data-access';

const userSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  userType: z.nativeEnum(UserType),
  password: z.string().optional(),
  clientIds: z.array(z.string()).optional(),
});

export type UserFormMode = 'create' | 'edit' | 'view';

interface UserFormProps {
  mode: UserFormMode;
  user?: User | null;
  initialValues?: Partial<CreateUserDto>;
  onSubmit: (values: CreateUserDto | UpdateUserDto) => void;
  isLoading: boolean;
  onCancel: () => void;
  onEdit?: () => void;
  onValuesChange?: (values: Partial<CreateUserDto>) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function UserForm({ 
  mode, 
  user, 
  initialValues, 
  onSubmit, 
  isLoading, 
  onCancel, 
  onEdit,
  onValuesChange,
  onDirtyChange
}: UserFormProps) {
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';
  const [initialClientOptions, setInitialClientOptions] = useState<{ value: string; label: string }[]>([]);

  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      userType: UserType.Employee,
      password: '',
      clientIds: [] as string[],
      ...initialValues,
    },
    validate: {
      firstName: (value) => (value.trim().length < 1 ? 'First name is required' : null),
      lastName: (value) => (value.trim().length < 1 ? 'Last name is required' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      userType: (value) => (value ? null : 'User type is required'),
      password: (value, values) => {
        if (isCreating && (!value || value.length < 1)) {
          return 'Password is required for new users';
        }
        return null;
      },
    },
  });

  // Load initial client options if needed
  useEffect(() => {
    const loadClients = async () => {
      const idsToFetch = user?.clientIds || initialValues?.clientIds;
      if (idsToFetch && idsToFetch.length > 0) {
        try {
          const clients = await Promise.all(idsToFetch.map(id => getClient(id)));
          setInitialClientOptions(clients.map(c => ({ value: c._id, label: c.name })));
        } catch (e) {
          console.error('Failed to load initial clients', e);
        }
      }
    };
    loadClients();
  }, [user, initialValues]);

  // Sync form values to parent for persistence (only in create mode)
  useEffect(() => {
    if (isCreating && onValuesChange) {
      onValuesChange(form.values);
    }
  }, [form.values, isCreating, onValuesChange]);

  useEffect(() => {
    if (user && (isEditing || isViewing)) {
      form.initialize({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        password: '',
        clientIds: user.clientIds || [],
      });
    } else if (isCreating && initialValues) {
      // If we have draft values, set them
      form.setValues({
        firstName: initialValues.firstName || '',
        lastName: initialValues.lastName || '',
        email: initialValues.email || '',
        userType: initialValues.userType || UserType.Employee,
        password: initialValues.password || '',
        clientIds: initialValues.clientIds || [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mode]);

  // Track dirty state for edit mode
  useEffect(() => {
    if (isEditing && onDirtyChange) {
      onDirtyChange(form.isDirty());
    }
  }, [form.values, isEditing, onDirtyChange]);

  const handleSubmit = (values: typeof form.values) => {
    const submissionData: any = { ...values };
    if (isEditing) {
      delete submissionData.password; // Don't send empty password on edit
    }
    onSubmit(submissionData);
  };

  const handleValidationErrors = (errors: typeof form.errors) => {
    notify.validation();
  };

  const handleClear = () => {
    form.setValues({
      firstName: '',
      lastName: '',
      email: '',
      userType: UserType.Employee,
      password: '',
      clientIds: [],
    });
  };

  if (isViewing && user) {
    return (
      <Stack>
        <div>
          <Text size="sm" c="dimmed">First Name</Text>
          <Text>{user.firstName}</Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Last Name</Text>
          <Text>{user.lastName}</Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Email</Text>
          <Text>{user.email}</Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">User Type</Text>
          <Text tt="capitalize">{user.userType}</Text>
        </div>

        {user.clientIds && user.clientIds.length > 0 && (
          <div>
            <Text size="sm" c="dimmed">Clients</Text>
            <Text>
              {initialClientOptions
                .map((opt) => opt.label)
                .join(', ')}
            </Text>
          </div>
        )}
        
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={onCancel}>Close</Button>
          <Button onClick={onEdit}>Edit</Button>
        </Group>
      </Stack>
    );
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit, handleValidationErrors)}>
      <TextInput
        withAsterisk
        label="First Name"
        placeholder="John"
        mb="md"
        {...form.getInputProps('firstName')}
      />
      <TextInput
        withAsterisk
        label="Last Name"
        placeholder="Doe"
        mb="md"
        {...form.getInputProps('lastName')}
      />
      <TextInput
        withAsterisk
        label="Email"
        placeholder="john.doe@example.com"
        mb="md"
        {...form.getInputProps('email')}
      />

        <Select
          withAsterisk
          label="User Type"
          data={[
            { value: UserType.Employee, label: 'Employee' },
            { value: UserType.Contact, label: 'Contact' },
          ]}
          mb="md"
          disabled={isEditing}
          {...form.getInputProps('userType')}
        />

      <SearchableMultiSelect
        label="Clients"
        placeholder="Search for clients..."
        mb="md"
        fetchOptions={async (query) => {
          const clients = await searchClients(query);
          return clients.map(c => ({ value: c._id, label: c.name }));
        }}
        initialOptions={initialClientOptions}
        {...form.getInputProps('clientIds')}
      />
      
      {isCreating && (
        <PasswordInput
          withAsterisk
          label="Password"
          placeholder="Secure password"
          mb="xl"
          {...form.getInputProps('password')}
        />
      )}

      <Group justify="flex-end">
        {isCreating && (
          <Button variant="subtle" color="red" onClick={handleClear} mr="auto">
            Clear
          </Button>
        )}
        <Button variant="default" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isLoading}>
          {isEditing ? 'Update User' : 'Create User'}
        </Button>
      </Group>
    </form>
  );
}
