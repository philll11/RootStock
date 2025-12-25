// frontend/libs/roles/feature-web/src/lib/role-form.tsx
import {
  TextInput,
  Select,
  Button,
  Text,
  Checkbox,
  SimpleGrid,
  Fieldset,
  Switch,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  Role,
  CreateRoleDto,
  UpdateRoleDto,
  VisibilityScope,
  PERMISSIONS,
} from '@rootstock/roles/roles-data-access';
import { useEffect, useMemo } from 'react';
import {
  notify,
  PERMISSIONS as SHARED_PERMISSIONS,
} from '@rootstock/shared/util';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { palette } from '@rootstock/ui/theme';
import { FormLayout } from '@rootstock/ui/web';

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
  onDirtyChange,
}: RoleFormProps) {
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';
  const { can } = usePermission();

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
      visibilityScope: (value) =>
        value ? null : 'Visibility Scope is required',
    },
  });

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
        visibilityScope:
          initialValues.visibilityScope || VisibilityScope.Client,
        permissions: initialValues.permissions || [],
      });
    }
  }, [role, mode]);

  useEffect(() => {
    if (isEditing && onDirtyChange) {
      onDirtyChange(form.isDirty());
    }
  }, [form.values, isEditing, onDirtyChange]);

  const handleSubmit = (values: typeof form.values) => {
    const submissionData: any = { ...values };
    if (isEditing && role) {
      submissionData.__v = role.__v;
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
      name: '',
      description: '',
      visibilityScope: VisibilityScope.Client,
      permissions: [],
      isActive: true,
    });
  };

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

  const isView = mode === 'view';

  return (
    <FormLayout
      mode={mode}
      onSubmit={form.onSubmit(handleSubmit, handleValidationErrors)}
      isLoading={isLoading}
      onCancel={onCancel}
      onClear={isCreating ? handleClear : undefined}
      onEdit={onEdit}
      canEdit={can(SHARED_PERMISSIONS.ROLE_EDIT)}
      submitLabel={isEditing ? 'Update Role' : 'Create Role'}
    >
      <TextInput
        withAsterisk={!isView}
        label="Name"
        placeholder="Role Name"
        readOnly={isView}
        {...form.getInputProps('name')}
      />
      <TextInput
        label="Description"
        placeholder="Role Description"
        readOnly={isView}
        {...form.getInputProps('description')}
      />

      <Select
        withAsterisk={!isView}
        label="Visibility Scope"
        data={[
          { value: VisibilityScope.Global, label: 'Global' },
          { value: VisibilityScope.Subsidiary, label: 'Subsidiary' },
          { value: VisibilityScope.Client, label: 'Client' },
        ]}
        readOnly={isView}
        {...form.getInputProps('visibilityScope')}
      />

      {mode !== 'create' && (
        <Switch
          label="Active"
          disabled={isView}
          checked={form.values.isActive}
          {...form.getInputProps('isActive', { type: 'checkbox' })}
        />
      )}

      <Text fw={500} mb="xs">
        Permissions
      </Text>
      {Object.entries(groupedPermissions).map(([resource, perms]) => (
        <Fieldset key={resource} legend={resource}>
          <SimpleGrid cols={2}>
            {perms.map((perm) => (
              <Checkbox
                key={perm}
                label={perm.split(':')[1]} // Show only the action part
                value={perm}
                disabled={isView}
                checked={form.values.permissions.includes(perm)}
                onChange={(event) => {
                  const checked = event.currentTarget.checked;
                  const current = form.values.permissions;
                  if (checked) {
                    form.setFieldValue('permissions', [...current, perm]);
                  } else {
                    form.setFieldValue(
                      'permissions',
                      current.filter((p) => p !== perm)
                    );
                  }
                }}
              />
            ))}
          </SimpleGrid>
        </Fieldset>
      ))}
    </FormLayout>
  );
}
