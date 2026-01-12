// frontend/libs/roles/feature-web/src/lib/role-form.tsx
import { useEffect, useMemo } from 'react';
import {
  TextInput,
  Select,
  Text,
  Checkbox,
  SimpleGrid,
  Fieldset,
  Switch,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { zodResolver } from '@rootstock/ui/web';
import {
  Role,
  RoleFormData,
  roleSchema,
  VisibilityScope,
  PERMISSIONS,
} from '@rootstock/iam/roles/roles-data-access';
import { notify, PERMISSIONS as SHARED_PERMISSIONS } from '@rootstock/shared/util';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { FormLayout } from '@rootstock/ui/web';

// ### Interfaces & Types ###
export type RoleFormMode = 'create' | 'edit' | 'view';

interface RoleFormProps {
  mode: RoleFormMode;
  role?: Role | null;
  initialValues?: Partial<RoleFormData>;
  onSubmit: (values: RoleFormData) => void;
  isLoading: boolean;
  onCancel: () => void;
  onEdit?: () => void;
  onValuesChange?: (values: Partial<RoleFormData>) => void;
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

  // ### Form Modes, Permissions & State ###
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  const isViewing = mode === 'view';

  const { can } = usePermission();

  // ### Form Definition ###
  const form = useForm<RoleFormData>({
    initialValues: {
      name: '',
      description: '',
      visibilityScope: VisibilityScope.Client,
      permissions: [] as string[],
      isActive: true,
      __v: 0,
      ...initialValues,
    },
    validate: zodResolver(roleSchema),
  });

  // ### Data Fetching & Options ###
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

  // ### Side Effects ###
  useEffect(() => {
    if (isCreating && onValuesChange) {
      const { isActive, ...rest } = form.values;
      onValuesChange(rest as RoleFormData);
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

  // ### Event Handlers ###
  const handleSubmit = (values: typeof form.values) => {
    const submissionData: any = { ...values };
    if (isEditing) {
      submissionData.__v = role!.__v;
    }
    if (isCreating) {
      delete submissionData.isActive;
      delete submissionData.__v;
    }
    onSubmit(submissionData as RoleFormData);
  };

  const handleValidationErrors = () => {
    notify.validation();
  };

  const handleClear = () => {
    form.setValues({
      name: '',
      description: '',
      visibilityScope: VisibilityScope.Client,
      permissions: []
    });
  };

  // ### Render ###
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
          withAsterisk={!isViewing}
          readOnly={isViewing}
          {...form.getInputProps('name')}
        />
        <TextInput
          label="Description"
          placeholder="Role Description"
          readOnly={isViewing}
          {...form.getInputProps('description')}
        />
      </Group>

      <Group grow>
        <Select
          withAsterisk={!isViewing}
          label="Visibility Scope"
          data={[
            { value: VisibilityScope.Global, label: 'Global' },
            { value: VisibilityScope.Subsidiary, label: 'Subsidiary' },
            { value: VisibilityScope.Client, label: 'Client' },
          ]}
          readOnly={isViewing}
          {...form.getInputProps('visibilityScope')}
        />
        {!isCreating && can(SHARED_PERMISSIONS.ROLE_MANAGE_INACTIVE) && (
          <Switch
            label="Active"
            readOnly={isViewing}
            style={{ pointerEvents: isViewing ? 'none' : 'auto' }}
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
                  disabled={isViewing}
                  checked={form.values.permissions?.includes(perm)}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    const current = form.values.permissions || [];
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
