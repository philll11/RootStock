import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Switch, Text, useTheme, HelperText } from 'react-native-paper';
import { useVarieties } from '@rootstock/master-data/varieties/varieties-data-access';
import { useMobileDiscardWarning, FormLayout, FormMode, confirmDiscard } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

export const VarietyFormScreen = ({ navigation, route }: any) => {
  const theme = useTheme();
  const { varietyId } = route.params || {};
  const isEditing = !!varietyId;

  const { varieties, isLoading: isVarietiesLoading, createVarietyMutation, updateVarietyMutation, deleteVarietyMutation } = useVarieties();
  
  const { can } = usePermission();
  const canEdit = can(isEditing ? PERMISSIONS.VARIETY_EDIT : PERMISSIONS.VARIETY_CREATE);

  const [isEditMode, setIsEditMode] = useState(!isEditing);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [recordId, setRecordId] = useState('');

  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<{name?: string}>({});

  const mode: FormMode = isEditing ? (isEditMode ? 'edit' : 'view') : 'create';
  const isView = mode === 'view';

  useEffect(() => {
    if (isEditing && varieties) {
      const variety = varieties.find(v => v._id === varietyId);
      if (variety) {
        setName(variety.name);
        setIsActive(variety.isActive);
        setRecordId(variety.recordId);
        setTimeout(() => setIsDirty(false), 100);
      }
    }
  }, [isEditing, varietyId, varieties]);

  const isSubmitting = createVarietyMutation.isPending || updateVarietyMutation.isPending;
  useMobileDiscardWarning(isEditMode && isDirty && !isSubmitting);

  const validate = () => {
    const newErrors: {name?: string} = {};
    if (!name) newErrors.name = 'Name is required';
    else if (name.length < 2) newErrors.name = 'Name must be at least 2 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    if (isEditing) {
      updateVarietyMutation.mutate({ id: varietyId, data: { name, isActive } }, {
        onSuccess: () => {
          setIsDirty(false);
          setIsEditMode(false);
        }
      });
    } else {
      createVarietyMutation.mutate({ name }, {
        onSuccess: () => {
          setIsDirty(false);
          navigation.goBack();
        }
      });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Variety',
      'Are you sure you want to delete this variety?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            deleteVarietyMutation.mutate(varietyId, {
              onSuccess: () => navigation.goBack()
            });
          }
        }
      ]
    );
  };

  const handleClear = () => {
    setName('');
    setIsActive(true);
    setIsDirty(false);
    setErrors({});
  };

  return (
    <FormLayout
      mode={mode}
      title={isEditing ? (isEditMode ? 'Edit Variety' : 'Variety Details') : 'New Variety'}
      onCancel={() => {
        if (isEditMode && isEditing) {
          const cancelEdit = () => {
            setIsEditMode(false);
            // Reset form
            if (varieties) {
              const variety = varieties.find(v => v._id === varietyId);
              if (variety) {
                setName(variety.name);
                setIsActive(variety.isActive);
                setIsDirty(false);
              }
            }
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
      onSubmit={handleSave}
      onEdit={() => setIsEditMode(true)}
      onClear={!isEditing ? handleClear : undefined}
      canEdit={canEdit}
      isLoading={isSubmitting}
      isDirty={isDirty}
    >
      <TextInput
        label="Name"
        value={name}
        onChangeText={(text) => { setName(text); setIsDirty(true); }}
        mode="outlined"
        error={!!errors.name}
        editable={!isView}
        style={styles.input}
      />
      {!isView && errors.name && <HelperText type="error">{errors.name}</HelperText>}

      {isView && (
        <TextInput
          label="Record ID"
          value={recordId}
          mode="outlined"
          editable={false}
          style={styles.input}
        />
      )}

      {isEditing && (
        <View style={styles.switchContainer}>
          <Text variant="bodyLarge">Active</Text>
          <Switch 
            value={isActive} 
            onValueChange={(val) => { setIsActive(val); setIsDirty(true); }} 
            disabled={isView}
          />
        </View>
      )}

      {isEditMode && isEditing && can(PERMISSIONS.VARIETY_DELETE) && (
        <Button 
          mode="outlined" 
          onPress={handleDelete} 
          textColor={theme.colors.error} 
          style={{ marginTop: spacing.xl, borderColor: theme.colors.error }}
        >
          Delete Variety
        </Button>
      )}
    </FormLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  input: { marginBottom: spacing.xs },
  switchContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginVertical: spacing.md,
    paddingHorizontal: spacing.xs 
  },
  button: { marginTop: spacing.lg },
});