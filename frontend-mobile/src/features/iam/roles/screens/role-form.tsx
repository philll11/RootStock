import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText, SegmentedButtons, Text, List, Checkbox, useTheme, Switch } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoleFormData, roleSchema } from '@/features/iam/roles/data';
import { PERMISSIONS, VisibilityScope } from '@/utils';
import { spacing, AppTheme } from '@/theme';
import { useMobileDiscardWarning } from '@/hooks';
import { usePermission } from '@/features/iam/auth/data';

interface RoleFormProps {
  defaultValues?: Partial<RoleFormData>;
  onSubmit: (data: RoleFormData) => void;
  isSubmitting?: boolean;
  isEditMode?: boolean;
}

export const RoleForm = ({ defaultValues, onSubmit, isSubmitting, isEditMode }: RoleFormProps) => {
  const theme = useTheme<AppTheme>();
  const { can } = usePermission();
  const [isSaving, setIsSaving] = React.useState(false);
  const { control, handleSubmit, formState: { errors, isDirty }, watch, setValue } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      visibilityScope: VisibilityScope.CLIENT,
      permissions: [],
      isActive: true,
      ...defaultValues,
    },
  });

  useMobileDiscardWarning(isDirty && !isSaving);

  const handleFormSubmit = async (data: RoleFormData) => {
    setIsSaving(true);
    try {
      await onSubmit(data);
    } catch (error) {
      setIsSaving(false);
    }
  };

  const selectedPermissions = watch('permissions') || [];

  const togglePermission = (permission: string) => {
    const current = new Set(selectedPermissions);
    if (current.has(permission)) {
      current.delete(permission);
    } else {
      current.add(permission);
    }
    setValue('permissions', Array.from(current), { shouldDirty: true });
  };

  const groupedPermissions = React.useMemo(() => {
    return Object.values(PERMISSIONS).reduce((acc, permission) => {
      const [resource] = permission.split(':');
      if (!acc[resource]) acc[resource] = [];
      acc[resource].push(permission);
      return acc;
    }, {} as Record<string, string[]>);
  }, []);

  const toggleGroup = (resource: string) => {
    const groupPermissions = groupedPermissions[resource];
    const current = new Set(selectedPermissions);
    const allSelected = groupPermissions.every((p) => current.has(p));

    if (allSelected) {
      groupPermissions.forEach(p => current.delete(p));
    } else {
      groupPermissions.forEach(p => current.add(p));
    }
    setValue('permissions', Array.from(current), { shouldDirty: true });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <View>
              <TextInput
                label="Name"
                mode="outlined"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={!!errors.name}
              />
              <HelperText type="error" visible={!!errors.name}>
                {errors.name?.message}
              </HelperText>
            </View>
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <View>
              <TextInput
                label="Description"
                mode="outlined"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                multiline
              />
            </View>
          )}
        />

        {can(PERMISSIONS.ROLE_MANAGE_INACTIVE) && isEditMode && (
          <Controller
            control={control}
            name="isActive"
            render={({ field: { value, onChange } }) => (
              <List.Item
                title="Active"
                right={() => <Switch value={value} onValueChange={onChange} />}
                style={styles.switchItem}
              />
            )}
          />
        )}

        <Text variant="titleMedium" style={styles.sectionTitle}>Visibility Scope</Text>
        <Controller
          control={control}
          name="visibilityScope"
          render={({ field: { onChange, value } }) => (
            <SegmentedButtons
              value={value}
              onValueChange={onChange}
              buttons={[
                { value: VisibilityScope.GLOBAL, label: 'Global' },
                { value: VisibilityScope.SUBSIDIARY, label: 'Subsidiary' },
                { value: VisibilityScope.CLIENT, label: 'Client' },
              ]}
            />
          )}
        />

        <Text variant="titleMedium" style={styles.sectionTitle}>Permissions</Text>
        {Object.entries(groupedPermissions).map(([resource, permissions]) => {
          const allSelected = permissions.every((p) => selectedPermissions.includes(p));
          const someSelected = permissions.some((p) => selectedPermissions.includes(p));

          return (
            <List.Accordion
              key={resource}
              title={resource}
              id={resource}
              left={() => (
                <Checkbox
                  status={allSelected ? 'checked' : someSelected ? 'indeterminate' : 'unchecked'}
                  onPress={() => toggleGroup(resource)}
                />
              )}
            >
              {permissions.map((permission) => (
                <Checkbox.Item
                  key={permission}
                  label={permission}
                  status={selectedPermissions.includes(permission) ? 'checked' : 'unchecked'}
                  onPress={() => togglePermission(permission)}
                />
              ))}
            </List.Accordion>
          );
        })}

        <Button
          mode="contained"
          onPress={handleSubmit(handleFormSubmit)}
          loading={isSubmitting}
          style={styles.button}
        >
          {isEditMode ? 'Save Changes' : 'Create Role'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  switchItem: {
    paddingHorizontal: 0,
  },
  button: {
    marginTop: spacing.lg,
  },
});

