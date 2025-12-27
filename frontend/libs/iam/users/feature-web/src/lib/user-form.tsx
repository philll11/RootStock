// frontend/libs/users/feature-web/src/lib/user-form.tsx
import {
  TextInput,
  Select,
  Button,
  PasswordInput,
  Text,
  Checkbox,
  Group,
  Switch,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  UserType,
  CreateUserDto,
  UpdateUserDto,
  User,
} from '@rootstock/users/users-data-access';
import { useRoles } from '@rootstock/roles/roles-data-access';
import { useEffect, useState } from 'react';
import { notify, PERMISSIONS } from '@rootstock/shared/util';
import { SearchableMultiSelect, FormLayout } from '@rootstock/ui/web';
import {
  searchClients,
  getClient,
} from '@rootstock/clients/clients-data-access';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { palette } from '@rootstock/ui/theme';

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
  fullHeight?: boolean;
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
  onDirtyChange,
  fullHeight = true,
}: UserFormProps) {
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';
  const [initialClientOptions, setInitialClientOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const { roles } = useRoles();
  const { can } = usePermission();

  const form = useForm({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      userType: UserType.Employee,
      roleId: null,
      password: '',
      isActive: true,
      clientIds: [] as string[],
      ...initialValues,
    },
    validate: {
      firstName: (value) =>
        value.trim().length < 1 ? 'First name is required' : null,
      lastName: (value) =>
        value.trim().length < 1 ? 'Last name is required' : null,
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

  useEffect(() => {
    const loadClients = async () => {
      const idsToFetch = user?.clientIds || initialValues?.clientIds;
      // Avoid reloading if we already have options for these IDs
      // This prevents the infinite loop/freeze when typing in other fields
      // because initialValues changes on every keystroke.
      const currentIds = initialClientOptions.map(o => o.value).sort().join(',');
      const newIds = (idsToFetch || []).sort().join(',');

      if (idsToFetch && idsToFetch.length > 0 && currentIds !== newIds) {
        try {
          const clients = await Promise.all(
            idsToFetch.map((id) => getClient(id))
          );
          setInitialClientOptions(
            clients.map((c) => ({ value: c._id, label: c.name }))
          );
        } catch (e) {
          console.error('Failed to load initial clients', e);
        }
      }
    };
    loadClients();
  }, [user?.clientIds, initialValues?.clientIds]);

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
    if (user && (isEditing || isViewing)) {
      form.initialize({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        roleId: (typeof user.roleId === 'object' ? user.roleId._id : user.roleId) || null,
        password: '',
        isActive: user.isActive,
        clientIds: user.clientIds || [],
      });
    } else if (isCreating && initialValues) {
      form.setValues({
        firstName: initialValues.firstName || '',
        lastName: initialValues.lastName || '',
        email: initialValues.email || '',
        userType: initialValues.userType || UserType.Employee,
        roleId: initialValues.roleId || null,
        password: initialValues.password || '',
        clientIds: initialValues.clientIds || [],
      });
    }
  }, [user, mode]);

  const handleSubmit = (values: typeof form.values) => {
    const submissionData: any = { ...values };
    if (isEditing) {
      delete submissionData.password;
    }
    if (isCreating) {
      delete submissionData.isActive;
    }
    onSubmit(submissionData);
  };

  const handleValidationErrors = () => {
    notify.validation();
  };

  const handleClear = () => {
    form.setValues({
      firstName: '',
      lastName: '',
      email: '',
      userType: UserType.Employee,
      roleId: null,
      password: '',
      clientIds: [],
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
      canEdit={can(PERMISSIONS.USER_EDIT)}
      submitLabel={isEditing ? 'Update User' : 'Create User'}
      isDirty={form.isDirty()}
      fullHeight={fullHeight}
    >
      <Group grow>
        <TextInput
          withAsterisk={!isView}
          label="First Name"
          placeholder="First Name"
          readOnly={isView}
          {...form.getInputProps('firstName')}
        />
        <TextInput
          withAsterisk={!isView}
          label="Last Name"
          placeholder="Last Name"
          readOnly={isView}
          {...form.getInputProps('lastName')}
        />
      </Group>

      <Group grow>
        <TextInput
          withAsterisk={!isView}
          label="Email"
          placeholder="Email"
          readOnly={isView}
          {...form.getInputProps('email')}
        />
        <Select
          withAsterisk={!isView}
          label="User Type"
          placeholder="Select User Type"
          data={[
            { value: UserType.Employee, label: 'Employee' },
            { value: UserType.Contact, label: 'Contact' },
          ]}
          readOnly={isView}
          {...form.getInputProps('userType')}
        />
      </Group>

      <Group grow>
        <Select
          withAsterisk={!isView}
          label="Role"
          placeholder="Select Role"
          data={(roles || []).map((r) => ({ value: r._id, label: r.name }))}
          readOnly={isView}
          {...form.getInputProps('roleId')}
        />
        {!isView ? (
          <PasswordInput
            withAsterisk={isCreating}
            label={isCreating ? 'Password' : 'New Password'}
            placeholder={isCreating ? 'Password' : 'Leave blank to keep current'}
            {...form.getInputProps('password')}
          />
        ) : (
          <div /> // Empty div to maintain grid structure in view mode if needed, or just let Role take 50%
        )}
      </Group>

      {isView ? (
        user?.clientIds &&
        user.clientIds.length > 0 && (
          <div>
            <Text size="sm" fw={500} mb={3}>
              Clients
            </Text>
            <Text>
              {initialClientOptions.map((opt) => opt.label).join(', ')}
            </Text>
          </div>
        )
      ) : (
        <SearchableMultiSelect
          label="Clients"
          placeholder="Search clients..."
          initialOptions={initialClientOptions}
          fetchOptions={async (query) => {
            const clients = await searchClients(query);
            return clients.map((c) => ({ value: c._id, label: c.name }));
          }}
          value={form.values.clientIds}
          onChange={(value) => form.setFieldValue('clientIds', value)}
        />
      )}

      {mode !== 'create' && (
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
