import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, useTheme, HelperText, Checkbox, List, SegmentedButtons } from 'react-native-paper';
import { useRoles, VisibilityScope } from '@rootstock/roles/roles-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { useMobileDiscardWarning, FormLayout, FormMode, confirmDiscard } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { spacing } from '@rootstock/ui/theme';

export const RoleFormScreen = ({ navigation, route }: any) => {
  const theme = useTheme();
  const { roleId } = route.params || {};
  const isEditing = !!roleId;
  
  const { getRole, createRole, updateRole, deleteRole, isCreating, isUpdating } = useRoles();
  const { can } = usePermission();
  const canEdit = can(isEditing ? PERMISSIONS.ROLE_EDIT : PERMISSIONS.ROLE_CREATE);
  
  const [isEditMode, setIsEditMode] = useState(!isEditing);
  const mode: FormMode = !roleId ? 'create' : (isEditMode ? 'edit' : 'view');
  const isView = mode === 'view';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibilityScope, setVisibilityScope] = useState<VisibilityScope>(VisibilityScope.Client);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [version, setVersion] = useState<number | undefined>(undefined);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{name?: string; description?: string}>({});

  const groupedPermissions = useMemo(() => {
    return Object.values(PERMISSIONS).reduce((acc, permission) => {
      const [resource] = permission.split(':');
      if (!acc[resource]) acc[resource] = [];
      acc[resource].push(permission);
      return acc;
    }, {} as Record<string, string[]>);
  }, []);

  useEffect(() => {
    if (isEditing) {
      setIsLoading(true);
      getRole(roleId)
        .then(role => {
          setName(role.name);
          setDescription(role.description || '');
          setVisibilityScope(role.visibilityScope);
          setSelectedPermissions(role.permissions || []);
          setVersion(role.__v);
          setIsLoading(false);
          setTimeout(() => setIsDirty(false), 100);
        })
        .catch((err: any) => {
          console.error(err);
          Alert.alert('Error', 'Failed to load role details');
          navigation.goBack();
        });
    }
  }, [roleId, isEditing]);

  const handleChange = (setter: (val: any) => void, value: any, field: string) => {
    setter(value);
    setIsDirty(true);
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  useMobileDiscardWarning(isEditMode && isDirty && !isSubmitting);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateRole({ 
          id: roleId, 
          data: { name, description, visibilityScope, permissions: selectedPermissions, __v: version as number } 
        });
        setIsEditMode(false);
      } else {
        await createRole({ name, description, visibilityScope, permissions: selectedPermissions });
        navigation.goBack();
      }
      setIsDirty(false);
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 409) {
        Alert.alert('Conflict', 'This role has been modified by another user. Please refresh and try again.');
      } else {
        Alert.alert('Error', 'Failed to save role');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Role',
      'Are you sure you want to delete this role? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRole(roleId);
              setIsDirty(false);
              navigation.goBack();
            } catch (error: any) {
              console.error(error);
              Alert.alert('Error', 'Failed to delete role');
            }
          }
        }
      ]
    );
  };

  const togglePermission = (permission: string) => {
    const newPermissions = selectedPermissions.includes(permission)
      ? selectedPermissions.filter(p => p !== permission)
      : [...selectedPermissions, permission];
    handleChange(setSelectedPermissions, newPermissions, 'permissions');
  };

  const toggleGroup = (resource: string) => {
    const groupPermissions = groupedPermissions[resource];
    const allSelected = groupPermissions.every(p => selectedPermissions.includes(p));
    
    let newPermissions = [...selectedPermissions];
    if (allSelected) {
      newPermissions = newPermissions.filter(p => !groupPermissions.includes(p));
    } else {
      const toAdd = groupPermissions.filter(p => !newPermissions.includes(p));
      newPermissions = [...newPermissions, ...toAdd];
    }
    handleChange(setSelectedPermissions, newPermissions, 'permissions');
  };

  return (
    <FormLayout
      mode={mode}
      title={isEditing ? (isEditMode ? 'Edit Role' : 'Role Details') : 'New Role'}
      onCancel={() => {
        if (isEditMode && isEditing) {
          const cancelEdit = () => {
            setIsEditMode(false);
            setIsLoading(true);
            getRole(roleId).then(role => {
              setName(role.name);
              setDescription(role.description || '');
              setVisibilityScope(role.visibilityScope);
              setSelectedPermissions(role.permissions || []);
              setVersion(role.__v);
              setIsLoading(false);
              setIsDirty(false);
            });
          };

          if (isDirty) {
            confirmDiscard(cancelEdit);
          } else {
            cancelEdit();
          }
        } else {
          navigation.goBack();
        }
      }}
      onSubmit={handleSubmit}
      onEdit={() => setIsEditMode(true)}
      canEdit={canEdit}
      isLoading={isLoading || isSubmitting}
      isDirty={isDirty}
    >
      <TextInput
        mode="outlined"
        label="Name"
        value={name}
        onChangeText={(val) => handleChange(setName, val, 'name')}
        error={!!errors.name}
        editable={!isView}
        style={styles.input}
      />
      {!isView && errors.name && <HelperText type="error">{errors.name}</HelperText>}

      <TextInput
        mode="outlined"
        label="Description"
        value={description}
        onChangeText={(val) => handleChange(setDescription, val, 'description')}
        multiline
        numberOfLines={3}
        editable={!isView}
        style={styles.input}
      />

      <Text variant="bodyMedium" style={styles.label}>Visibility Scope</Text>
      <SegmentedButtons
        value={visibilityScope}
        onValueChange={(val) => handleChange(setVisibilityScope, val as VisibilityScope, 'visibilityScope')}
        buttons={[
          { value: VisibilityScope.Client, label: 'Client', disabled: isView },
          { value: VisibilityScope.Subsidiary, label: 'Subsidiary', disabled: isView },
          { value: VisibilityScope.Global, label: 'Global', disabled: isView },
        ]}
        style={styles.input}
      />

      <Text variant="titleMedium" style={[styles.label, { marginTop: spacing.lg }]}>Permissions</Text>
      {Object.entries(groupedPermissions).map(([resource, permissions]) => {
        const allSelected = permissions.every(p => selectedPermissions.includes(p));
        const someSelected = permissions.some(p => selectedPermissions.includes(p));
        
        return (
          <List.Accordion
            key={resource}
            title={resource.charAt(0).toUpperCase() + resource.slice(1)}
            left={props => (
              <Checkbox
                status={allSelected ? 'checked' : (someSelected ? 'indeterminate' : 'unchecked')}
                onPress={() => !isView && toggleGroup(resource)}
                disabled={isView}
              />
            )}
          >
            {permissions.map(permission => (
              <List.Item
                key={permission}
                title={permission.split(':')[1]}
                left={props => (
                  <Checkbox
                    status={selectedPermissions.includes(permission) ? 'checked' : 'unchecked'}
                    onPress={() => !isView && togglePermission(permission)}
                    disabled={isView}
                  />
                )}
              />
            ))}
          </List.Accordion>
        );
      })}

      {isEditMode && isEditing && can(PERMISSIONS.ROLE_DELETE) && (
        <Button 
          mode="outlined" 
          onPress={handleDelete} 
          textColor={theme.colors.error} 
          style={{ marginTop: spacing.xl, borderColor: theme.colors.error }}
        >
          Delete Role
        </Button>
      )}
    </FormLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },
  input: { marginBottom: spacing.sm },
  label: { marginTop: spacing.sm, marginBottom: spacing.xs },
  sectionTitle: { marginTop: spacing.md, marginBottom: spacing.sm },
  button: { marginTop: spacing.lg },
  groupAction: { alignItems: 'flex-end', paddingRight: spacing.md }
});