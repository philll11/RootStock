import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Appbar, TextInput, Button, Text, useTheme, HelperText, Checkbox, List, SegmentedButtons } from 'react-native-paper';
import { useRoles, VisibilityScope } from '@rootstock/roles/roles-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { useMobileDiscardWarning, DetailRow } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { spacing } from '@rootstock/ui/theme';

export const RoleFormScreen = ({ navigation, route }: any) => {
  const theme = useTheme();
  const { roleId } = route.params || {};
  const isEditing = !!roleId;
  
  const { getRole, createRole, updateRole, deleteRole, isCreating, isUpdating } = useRoles();
  const { can } = usePermission();
  const canEdit = can(isEditing ? PERMISSIONS.ROLE_EDIT : PERMISSIONS.ROLE_CREATE);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibilityScope, setVisibilityScope] = useState<VisibilityScope>(VisibilityScope.Client);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [version, setVersion] = useState<number | undefined>(undefined);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{name?: string; description?: string}>({});

  const [isEditMode, setIsEditMode] = useState(!isEditing);

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

  const handleSave = async () => {
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

  const isSaving = isCreating || isUpdating;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isEditing ? (isEditMode ? 'Edit Role' : 'Role Details') : 'New Role'} />
        {!isEditMode && canEdit && (
          <Appbar.Action icon="pencil" onPress={() => setIsEditMode(true)} />
        )}
        {isEditMode && isEditing && (
          <Appbar.Action icon="close" onPress={() => setIsEditMode(false)} />
        )}
        {isEditMode && isEditing && can(PERMISSIONS.ROLE_DELETE) && (
          <Appbar.Action icon="delete" onPress={handleDelete} color={theme.colors.error} />
        )}
      </Appbar.Header>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {isEditMode ? (
            <>
              <TextInput
                mode="outlined"
                label="Name"
                value={name}
                onChangeText={(val) => handleChange(setName, val, 'name')}
                error={!!errors.name}
                style={styles.input}
              />
              {errors.name && <HelperText type="error">{errors.name}</HelperText>}

              <TextInput
                mode="outlined"
                label="Description"
                value={description}
                onChangeText={(val) => handleChange(setDescription, val, 'description')}
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              <Text variant="bodyMedium" style={styles.label}>Visibility Scope</Text>
              <SegmentedButtons
                value={visibilityScope}
                onValueChange={(val) => handleChange(setVisibilityScope, val as VisibilityScope, 'visibilityScope')}
                buttons={[
                  { value: VisibilityScope.Global, label: 'Global' },
                  { value: VisibilityScope.Subsidiary, label: 'Subsidiary' },
                  { value: VisibilityScope.Client, label: 'Client' },
                ]}
                style={styles.input}
              />
            </>
          ) : (
            <>
              <DetailRow label="Name" value={name} />
              <DetailRow label="Description" value={description} />
              <DetailRow label="Visibility Scope" value={visibilityScope} />
            </>
          )}

          <Text variant="titleMedium" style={styles.sectionTitle}>Permissions</Text>
          
          {Object.entries(groupedPermissions).map(([resource, permissions]) => {
            return (
              <List.Accordion
                key={resource}
                title={resource}
                left={props => <List.Icon {...props} icon="folder-lock" />}
                description={`${permissions.filter(p => selectedPermissions.includes(p)).length} / ${permissions.length} selected`}
              >
                {isEditMode && (
                  <View style={styles.groupAction}>
                     <Button mode="text" onPress={() => toggleGroup(resource)}>
                        Select / Deselect All
                     </Button>
                  </View>
                )}
                {permissions.map(permission => (
                  <List.Item
                    key={permission}
                    title={permission.split(':')[1]}
                    left={() => (
                      <Checkbox
                        status={selectedPermissions.includes(permission) ? 'checked' : 'unchecked'}
                        onPress={isEditMode ? () => togglePermission(permission) : undefined}
                        disabled={!isEditMode}
                      />
                    )}
                    onPress={isEditMode ? () => togglePermission(permission) : undefined}
                  />
                ))}
              </List.Accordion>
            );
          })}

          {isEditMode && (
            <Button
              mode="contained"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving || isLoading}
              style={styles.button}
            >
              Save
            </Button>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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