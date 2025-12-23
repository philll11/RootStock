import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, Switch, Text, useTheme, HelperText, IconButton, Modal, Portal, List } from 'react-native-paper';
import { useBlocks } from '@rootstock/blocks/blocks-data-access';
import { useVarieties } from '@rootstock/master-data/varieties/varieties-data-access';
import { useMobileDiscardWarning, FormLayout, FormMode, confirmDiscard } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

export const BlockFormScreen = ({ navigation, route }: any) => {
  const theme = useTheme();
  const { orchardId, blockId } = route.params || {};
  const isEditing = !!blockId;

  const { blocksQuery, createBlockMutation, updateBlockMutation } = useBlocks(orchardId);
  const { data: blocks } = blocksQuery;
  const { varietiesQuery } = useVarieties();
  const { data: varieties } = varietiesQuery;
  
  const { can } = usePermission();
  const canEdit = can(isEditing ? PERMISSIONS.BLOCK_EDIT : PERMISSIONS.BLOCK_CREATE);

  const [isEditMode, setIsEditMode] = useState(!isEditing);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [recordId, setRecordId] = useState('');
  const [plantings, setPlantings] = useState<{varietyId: string, treeCount: string}[]>([{ varietyId: '', treeCount: '0' }]);

  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<{name?: string, plantings?: string}>({});
  
  // Variety Selection Modal State
  const [varietyModalVisible, setVarietyModalVisible] = useState(false);
  const [currentPlantingIndex, setCurrentPlantingIndex] = useState<number | null>(null);

  const mode: FormMode = isEditing ? (isEditMode ? 'edit' : 'view') : 'create';
  const isView = mode === 'view';

  useEffect(() => {
    if (isEditing && blocks) {
      const block = blocks.find(b => b._id === blockId);
      if (block) {
        setName(block.name);
        setIsActive(block.isActive);
        setRecordId(block.recordId);
        setPlantings(block.plantings.map(p => ({ varietyId: p.varietyId, treeCount: p.treeCount.toString() })));
        setTimeout(() => setIsDirty(false), 100);
      }
    }
  }, [isEditing, blockId, blocks]);

  const isSubmitting = createBlockMutation.isPending || updateBlockMutation.isPending;
  useMobileDiscardWarning(isEditMode && isDirty && !isSubmitting);

  const validate = () => {
    const newErrors: {name?: string, plantings?: string} = {};
    if (!name) newErrors.name = 'Name is required';
    else if (name.length < 2) newErrors.name = 'Name must be at least 2 characters';
    
    const invalidPlanting = plantings.some(p => !p.varietyId || parseInt(p.treeCount) < 0);
    if (invalidPlanting) newErrors.plantings = 'All plantings must have a variety and positive tree count';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload = {
      name,
      plantings: plantings.map(p => ({ varietyId: p.varietyId, treeCount: parseInt(p.treeCount) || 0 })),
      ...(isEditing ? { isActive } : {})
    };

    if (isEditing) {
      // Check for replanting warning
      const block = blocks?.find(b => b._id === blockId);
      const hasChanged = plantings.some((p, i) => {
        const initial = block?.plantings[i];
        return initial && p.varietyId !== initial.varietyId;
      });

      if (hasChanged) {
        Alert.alert(
          'Replanting Warning',
          'Changing variety will not update historical assessments. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Update', 
              onPress: () => {
                updateBlockMutation.mutate({ id: blockId, data: payload }, {
                  onSuccess: () => {
                    setIsDirty(false);
                    setIsEditMode(false);
                  }
                });
              }
            }
          ]
        );
        return;
      }

      updateBlockMutation.mutate({ id: blockId, data: payload }, {
        onSuccess: () => {
          setIsDirty(false);
          setIsEditMode(false);
        }
      });
    } else {
      createBlockMutation.mutate(payload, {
        onSuccess: () => {
          setIsDirty(false);
          navigation.goBack();
        }
      });
    }
  };

  const handleAddPlanting = () => {
    setPlantings([...plantings, { varietyId: '', treeCount: '0' }]);
    setIsDirty(true);
  };

  const handleRemovePlanting = (index: number) => {
    const newPlantings = [...plantings];
    newPlantings.splice(index, 1);
    setPlantings(newPlantings);
    setIsDirty(true);
  };

  const handleUpdatePlanting = (index: number, field: 'varietyId' | 'treeCount', value: string) => {
    const newPlantings = [...plantings];
    newPlantings[index] = { ...newPlantings[index], [field]: value };
    setPlantings(newPlantings);
    setIsDirty(true);
  };

  const openVarietyModal = (index: number) => {
    setCurrentPlantingIndex(index);
    setVarietyModalVisible(true);
  };

  const selectVariety = (varietyId: string) => {
    if (currentPlantingIndex !== null) {
      handleUpdatePlanting(currentPlantingIndex, 'varietyId', varietyId);
    }
    setVarietyModalVisible(false);
    setCurrentPlantingIndex(null);
  };

  const getVarietyName = (id: string) => {
    return varieties?.find(v => v._id === id)?.name || 'Select Variety';
  };

  return (
    <FormLayout
      mode={mode}
      title={isEditing ? (isEditMode ? 'Edit Block' : 'Block Details') : 'Create Block'}
      onCancel={() => {
        if (isEditMode && isEditing) {
          const cancelEdit = () => {
            setIsEditMode(false);
            // Reset form
            if (blocks) {
              const block = blocks.find(b => b._id === blockId);
              if (block) {
                setName(block.name);
                setIsActive(block.isActive);
                setPlantings(block.plantings.map(p => ({ varietyId: p.varietyId, treeCount: p.treeCount.toString() })));
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
      onSubmit={handleSubmit}
      onEdit={() => setIsEditMode(true)}
      canEdit={canEdit}
      isLoading={isSubmitting}
      isDirty={isDirty}
    >
      {isEditing && (
        <TextInput
          label="ID"
          value={recordId}
          mode="outlined"
          editable={false}
          style={styles.input}
        />
      )}

      <TextInput
        label="Name"
        value={name}
        onChangeText={(text) => { setName(text); setIsDirty(true); }}
        mode="outlined"
        style={styles.input}
        error={!!errors.name}
        editable={!isView}
      />
      {!isView && errors.name && <HelperText type="error">{errors.name}</HelperText>}

      <Text variant="titleMedium" style={styles.sectionTitle}>Plantings</Text>
      {plantings.map((planting, index) => (
        <View key={index} style={styles.plantingRow}>
          <TouchableOpacity 
            style={[styles.varietySelector, isView && styles.disabledInput]} 
            onPress={() => !isView && openVarietyModal(index)}
            disabled={isView}
          >
            <Text>{getVarietyName(planting.varietyId)}</Text>
          </TouchableOpacity>
          
          <TextInput
            label="Count"
            value={planting.treeCount}
            onChangeText={(text) => handleUpdatePlanting(index, 'treeCount', text)}
            mode="outlined"
            keyboardType="numeric"
            style={styles.countInput}
            editable={!isView}
          />
          
          {!isView && plantings.length > 1 && (
            <IconButton icon="delete" onPress={() => handleRemovePlanting(index)} />
          )}
        </View>
      ))}
      
      {!isView && (
        <Button mode="outlined" onPress={handleAddPlanting} style={styles.addButton}>
          Add Planting
        </Button>
      )}
      {!isView && errors.plantings && <HelperText type="error">{errors.plantings}</HelperText>}

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

      <Portal>
        <Modal visible={varietyModalVisible} onDismiss={() => setVarietyModalVisible(false)} contentContainerStyle={styles.modalContent}>
          <Text variant="titleLarge" style={{ marginBottom: spacing.md }}>Select Variety</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {varieties?.map(v => (
              <List.Item
                key={v._id}
                title={v.name}
                onPress={() => selectVariety(v._id)}
              />
            ))}
          </ScrollView>
          <Button onPress={() => setVarietyModalVisible(false)} style={{ marginTop: spacing.md }}>Cancel</Button>
        </Modal>
      </Portal>
    </FormLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  input: { marginBottom: spacing.sm },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: spacing.md },
  submitButton: { marginTop: spacing.xl },
  sectionTitle: { marginTop: spacing.md, marginBottom: spacing.sm },
  plantingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  varietySelector: { flex: 1, padding: 15, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, marginRight: spacing.sm },
  disabledInput: { backgroundColor: '#f0f0f0', borderColor: '#e0e0e0' },
  countInput: { width: 80 },
  addButton: { marginTop: spacing.sm },
  modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8 },
});
