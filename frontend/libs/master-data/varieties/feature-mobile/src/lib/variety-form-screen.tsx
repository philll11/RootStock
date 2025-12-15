// frontend/libs/master-data/varieties/feature-mobile/src/lib/variety-form-screen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Appbar, TextInput, Button, Switch, Text, useTheme, HelperText } from 'react-native-paper';
import { useVarieties } from '@rootstock/master-data/varieties/varieties-data-access';
import { useMobileDiscardWarning, DetailRow } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

export const VarietyFormScreen = ({ navigation, route }: any) => {
  const theme = useTheme();
  const { varietyId } = route.params || {};
  const isEditing = !!varietyId;

  const { varietiesQuery, createVarietyMutation, updateVarietyMutation, deleteVarietyMutation } = useVarieties();
  const { data: varieties } = varietiesQuery;
  
  const { can } = usePermission();
  const canEdit = can(isEditing ? PERMISSIONS.VARIETY_EDIT : PERMISSIONS.VARIETY_CREATE);

  const [isEditMode, setIsEditMode] = useState(!isEditing);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [recordId, setRecordId] = useState('');

  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<{name?: string}>({});

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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isEditing ? (isEditMode ? 'Edit Variety' : 'Variety Details') : 'New Variety'} />
        {!isEditMode && canEdit && (
          <Appbar.Action icon="pencil" onPress={() => setIsEditMode(true)} />
        )}
        {isEditMode && isEditing && (
          <Appbar.Action icon="close" onPress={() => setIsEditMode(false)} />
        )}
        {isEditMode && isEditing && can(PERMISSIONS.VARIETY_DELETE) && (
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
                label="Name"
                value={name}
                onChangeText={(text) => { setName(text); setIsDirty(true); }}
                mode="outlined"
                error={!!errors.name}
                style={styles.input}
              />
              {errors.name && <HelperText type="error">{errors.name}</HelperText>}

              {isEditing && (
                <View style={styles.switchContainer}>
                  <Text variant="bodyLarge">Active</Text>
                  <Switch 
                    value={isActive} 
                    onValueChange={(val) => { setIsActive(val); setIsDirty(true); }} 
                  />
                </View>
              )}

              <Button 
                mode="contained" 
                onPress={handleSave} 
                style={styles.button}
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Save
              </Button>
            </>
          ) : (
            <>
              <DetailRow label="Name" value={name} />
              <DetailRow label="Record ID" value={recordId} />
              <DetailRow label="Status" value={isActive ? 'Active' : 'Inactive'} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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