import { TextInput, Select, Button, Group, Text, Stack, Checkbox, SimpleGrid, Fieldset, Switch } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Role, CreateRoleDto, UpdateRoleDto, VisibilityScope, PERMISSIONS } from '@rootstock/roles/roles-data-access';
import { useEffect, useMemo } from 'react';
import { notify } from '@rootstock/shared/util';

export type RoleFormMode = 'create' | 'edit' | 'view';

interface RoleFormProps {
  mode: RoleFormMode;
  role?: Role | null;
  initialValues?: Partial<CreateRoleDto>;
  onSubmit: (values: CreateRoleDto | UpdateRoleDto) => void;
  isLoading: boolean;
  onCancel: () => void;
  onEdit?: () => void;
  onValuesChange?: (values: Partial<CreateRoleDto>) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function RoleForm({
  mode,
  role,
  initialValues,
  onSubmit,
  isLoading,
  onCancel,
  onEdit,
  onValuesChange,
  onDirtyChange
}: RoleFormProps) {
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      visibilityScope: VisibilityScope.Client,
      permissions: [] as string[],
      isActive: true,
      ...initialValues,
    },
    validate: {
      name: (value) => (value.trim().length < 1 ? 'Name is required' : null),
      visibilityScope: (value) => (value ? null : 'Visibility Scope is required'),
    },
  });

  // Sync form values to parent for persistence (only in create mode)
  useEffect(() => {
    if (isCreating && onValuesChange) {
      onValuesChange(form.values);
    }
  }, [form.values, isCreating, onValuesChange]);

  useEffect(() => {
    if (role && (isEditing || isViewing)) {
      form.initialize({
        name: role.name,
        description: role.description || '',
        visibilityScope: role.visibilityScope,
        permissions: role.permissions,
        isActive: role.isActive,
      });
    } else if (isCreating && initialValues) {
      form.setValues({
        name: initialValues.name || '',
        description: initialValues.description || '',
        visibilityScope: initialValues.visibilityScope || VisibilityScope.Client,
        permissions: initialValues.permissions || [],
        isActive: initialValues.isActive ?? true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, mode]);

  // Track dirty state for edit mode
  useEffect(() => {
    if (isEditing && onDirtyChange) {
      onDirtyChange(form.isDirty());
    }
  }, [form.values, isEditing, onDirtyChange]);

  const handleSubmit = (values: typeof form.values) => {
    const submissionData: any = { ...values };
    if (isEditing && role) {
      submissionData.__v = role.__v; // Include version for OCC
    }
    onSubmit(submissionData);
  };

  const handleValidationErrors = () => {
    notify.validation();
  };

  const handleClear = () => {
    form.setValues({
      name: '',
      description: '',
      visibilityScope: VisibilityScope.Client,
      permissions: [],
      isActive: true,
    });
  };

  // Group permissions by resource
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, string[]> = {};
    Object.values(PERMISSIONS).forEach((perm) => {
      const [resource] = perm.split(':');
      if (!groups[resource]) {
        groups[resource] = [];
      }
      groups[resource].push(perm);
    });
    return groups;
  }, []);

  if (isViewing && role) {
    return (
      <Stack>
        <div>
          <Text size="sm" c="dimmed">Name</Text>
          <Text>{role.name}</Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Description</Text>
          <Text>{role.description || '-'}</Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Visibility Scope</Text>
          <Text>{role.visibilityScope}</Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Status</Text>
          <Text>{role.isActive ? 'Active' : 'Inactive'}</Text>
        </div>
        <div>
          <Text size="sm" c="dimmed">Permissions</Text>
          <SimpleGrid cols={2} spacing="xs">
             {role.permissions.map(p => <Text key={p} size="xs">{p}</Text>)}
          </SimpleGrid>
        </div>

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
        label="Name"
        placeholder="Role Name"
        mb="md"
        {...form.getInputProps('name')}
      />
      <TextInput
        label="Description"
        placeholder="Role Description"
        mb="md"
        {...form.getInputProps('description')}
      />

      <Select
        withAsterisk
        label="Visibility Scope"
        data={[
          { value: VisibilityScope.Global, label: 'Global' },
          { value: VisibilityScope.Subsidiary, label: 'Subsidiary' },
          { value: VisibilityScope.Client, label: 'Client' },
        ]}
        mb="md"
        {...form.getInputProps('visibilityScope')}
      />

      {isEditing && (
        <Switch
          label="Active"
          mb="md"
          {...form.getInputProps('isActive', { type: 'checkbox' })}
        />
      )}

      <Text fw={500} mb="xs">Permissions</Text>
      <Stack gap="md">
        {Object.entries(groupedPermissions).map(([resource, perms]) => (
          <Fieldset key={resource} legend={resource}>
            <SimpleGrid cols={2}>
              {perms.map((perm) => (
                <Checkbox
                  key={perm}
                  label={perm.split(':')[1]} // Show only action name
                  value={perm}
                  checked={form.values.permissions.includes(perm)}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    const current = form.values.permissions;
                    if (checked) {
                      form.setFieldValue('permissions', [...current, perm]);
                    } else {
                      form.setFieldValue('permissions', current.filter((p) => p !== perm));
                    }
                  }}
                />
              ))}
            </SimpleGrid>
          </Fieldset>
        ))}
      </Stack>

      <Group justify="flex-end" mt="xl">
        {isCreating && (
          <Button variant="subtle" color="error" onClick={handleClear} mr="auto">
            Clear
          </Button>
        )}
        <Button variant="default" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isLoading}>
          {isEditing ? 'Update Role' : 'Create Role'}
        </Button>
      </Group>
    </form>
  );
}
