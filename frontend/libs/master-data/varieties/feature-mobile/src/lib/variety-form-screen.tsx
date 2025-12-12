import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Appbar, TextInput, Button, Switch, Text, useTheme, HelperText } from 'react-native-paper';
import { useVarieties } from '@rootstock/master-data/varieties/varieties-data-access';
import { useMobileDiscardWarning, DetailRow } from '@rootstock/ui/mobile';

export const VarietyFormScreen = ({ navigation, route }: any) => {
  const theme = useTheme();
  const { varietyId } = route.params || {};
  const isEditing = !!varietyId;

  const { varietiesQuery, createVarietyMutation, updateVarietyMutation, deleteVarietyMutation } = useVarieties();
  const { data: varieties } = varietiesQuery;
  
  const canEdit = true; // TODO: Implement permissions

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
      }
    }
  }, [isEditing, varietyId, varieties]);

  useMobileDiscardWarning(isDirty);

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

  const handleCancel = () => {
    if (isEditing) {
      // Reset form
      const variety = varieties?.find(v => v._id === varietyId);
      if (variety) {
        setName(variety.name);
        setIsActive(variety.isActive);
      }
      setIsEditMode(false);
      setIsDirty(false);
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isEditing ? (isEditMode ? 'Edit Variety' : 'Variety Details') : 'Create Variety'} />
        {isEditing && !isEditMode && canEdit && (
          <Appbar.Action icon="pencil" onPress={() => setIsEditMode(true)} />
        )}
        {isEditing && isEditMode && (
          <Appbar.Action icon="delete" onPress={handleDelete} />
        )}
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {isEditMode ? (
          <View style={styles.form}>
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
                <Text>Active</Text>
                <Switch 
                  value={isActive} 
                  onValueChange={(val) => { setIsActive(val); setIsDirty(true); }} 
                />
              </View>
            )}

            <View style={styles.actions}>
              <Button mode="outlined" onPress={handleCancel} style={styles.button}>
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleSave} 
                style={styles.button}
                loading={createVarietyMutation.isPending || updateVarietyMutation.isPending}
              >
                Save
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.details}>
            <DetailRow label="Name" value={name} />
            <DetailRow label="ID" value={recordId} />
            <DetailRow label="Status" value={isActive ? 'Active' : 'Inactive'} />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  form: { gap: 16 },
  details: { gap: 16 },
  input: { backgroundColor: 'transparent' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  button: { minWidth: 100 },
});
