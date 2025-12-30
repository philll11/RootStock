// frontend/libs/roles/feature-web/src/lib/role-form.tsx
import { useEffect, useMemo } from 'react';
import {
  TextInput,
  Select,
  Button,
  Text,
  Checkbox,
  SimpleGrid,
  Fieldset,
  Switch,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  Role,
  CreateRoleDto,
  UpdateRoleDto,
  VisibilityScope,
  PERMISSIONS,
} from '@rootstock/iam/roles/roles-data-access';
import { notify, PERMISSIONS as SHARED_PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
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
  fullHeight?: boolean;
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
  fullHeight = true,
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
      __v: 0,
      ...initialValues,
    },
    validate: {
      name: (value) => (value.trim().length < 1 ? 'Name is required' : null),
      visibilityScope: (value) => value ? null : 'Visibility Scope is required',
    },
  });

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
    if (role && (isEditing || isViewing)) {
      form.initialize({
        name: role.name,
        description: role.description || '',
        visibilityScope: role.visibilityScope,
        permissions: role.permissions,
        isActive: role.isActive,
        __v: role.__v,
      });
    } else if (isCreating && initialValues) {
      form.setValues({
        name: initialValues.name || '',
        description: initialValues.description || '',
        visibilityScope: initialValues.visibilityScope || VisibilityScope.Client,
        permissions: initialValues.permissions || [],
      });
    }
  }, [role, mode, isEditing, isViewing, isCreating]);

  const handleSubmit = (values: typeof form.values) => {
    const submissionData: any = { ...values };
    if (isCreating) {
      delete submissionData.isActive;
      delete submissionData.__v;
    } else {
      // Only send isActive if it has actually changed
      if (role && role.isActive === values.isActive) {
        delete submissionData.isActive;
      }
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
      isActive: true
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
      isLoading={isLoading}
      onCancel={onCancel}
      onSubmit={form.onSubmit(handleSubmit, handleValidationErrors)}
      onEdit={onEdit}
      onClear={isCreating ? handleClear : undefined}
      canEdit={can(SHARED_PERMISSIONS.ROLE_EDIT)}
      submitLabel={isEditing ? 'Update Role' : 'Create Role'}
      isDirty={form.isDirty()}
      fullHeight={fullHeight}
    >
      <Group grow>
        <TextInput
          label="Name"
          placeholder="Role Name"
          withAsterisk={!isView}
          readOnly={isView}
          {...form.getInputProps('name')}
        />
        <TextInput
          label="Description"
          placeholder="Role Description"
          readOnly={isView}
          {...form.getInputProps('description')}
        />
      </Group>

      <Group grow>
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
        {mode !== 'create' && can(SHARED_PERMISSIONS.ROLE_MANAGE_INACTIVE) && (
          <Switch
            label="Active"
            disabled={isView}
            checked={form.values.isActive}
            {...form.getInputProps('isActive', { type: 'checkbox' })}
            mt={26} // Align with input
          />
        )}
      </Group>

      <Text fw={500} mb="xs">
        Permissions
      </Text>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {Object.entries(groupedPermissions).map(([resource, perms]) => (
          <Fieldset key={resource} legend={resource} style={{ height: '100%' }}>
            <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
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
      </SimpleGrid>
    </FormLayout>
  );
}
