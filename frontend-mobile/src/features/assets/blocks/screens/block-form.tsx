import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  TextInput,
  Button,
  Switch,
  Text,
  HelperText,
  useTheme,
  List,
  Modal,
  Portal,
  Searchbar,
  IconButton,
} from 'react-native-paper';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGetOrchards } from '@/features/assets/orchards/data';
import { useGetVarieties } from '@/features/master-data/varieties/data';
import {
  blockSchema,
  BlockFormData,
} from '@/features/assets/blocks/data';
import { useMobileDiscardWarning } from '@/hooks';
import { AppTheme } from '@/theme';
import { usePermission } from '@/features/iam/auth/data';
import { PERMISSIONS } from '@/utils';

import { useRouter, useFocusEffect } from 'expo-router';
import { v4 as uuid } from 'uuid';
import { useQueryClient } from '@tanstack/react-query';
import { VARIETIES_KEYS, Variety } from '@/features/master-data/varieties/data';

interface BlockFormProps {
  defaultValues?: Partial<BlockFormData>;
  onSubmit: (data: BlockFormData) => Promise<void>;
  isSubmitting?: boolean;
  mode: 'create' | 'edit' | 'view';
  onCancel: () => void;
  onOrchardChange?: (orchardId: string) => void;
  scopeId?: string; // Scope for inline creation of dependencies (Varieties)
}

export function BlockForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  mode,
  onCancel,
  onOrchardChange,
  scopeId,
}: BlockFormProps) {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const pendingVarietyCreation = React.useRef<{ id: string; index: number } | null>(
    null
  );
  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const { data: orchards = [] } = useGetOrchards();
  const { data: varieties = [] } = useGetVarieties();

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<BlockFormData>({
    resolver: zodResolver(blockSchema) as any,
    defaultValues: {
      name: '',
      orchardId: '',
      plantings: [],
      isActive: true,
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'plantings',
  });

  useMobileDiscardWarning(isDirty && !isSubmitting);

  // Focus Effect to detect return from Variety Creation
  useFocusEffect(
    React.useCallback(() => {
      const pendingBy = pendingVarietyCreation.current;
      if (pendingBy) {
        const { id, index } = pendingBy;
        
        // Check if the variety exists in cache (it should, created locally or online)
        const allVarieties = queryClient.getQueryData<Variety[]>(VARIETIES_KEYS.lists());
        const exists = allVarieties?.find(v => v._id === id);
        
        // Ideally we select it even if "pending" (optimistic), but ensuring cache presence is safer.
        // If offline creation worked, it IS in the cache.
        if (exists || true) { // We trust our forced ID
           setValue(`plantings.${index}.varietyId`, id, { shouldDirty: true });
           
           // Clear active selection states
           setActivePlantingIndex(null);
           setVarietyModalVisible(false);
        }
        
        // Reset pending state
        pendingVarietyCreation.current = null;
      }
    }, [queryClient, setValue])
  );

  const [orchardModalVisible, setOrchardModalVisible] = React.useState(false);
  const [varietyModalVisible, setVarietyModalVisible] = React.useState(false);
  const [activePlantingIndex, setActivePlantingIndex] = React.useState<
    number | null
  >(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const selectedOrchardId = watch('orchardId');
  
  React.useEffect(() => {
    if (onOrchardChange && selectedOrchardId) {
      onOrchardChange(selectedOrchardId);
    }
  }, [selectedOrchardId, onOrchardChange]);

  const selectedOrchard = orchards.find((o) => o._id === selectedOrchardId);

  const filteredOrchards = orchards.filter((o) =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVarieties = varieties.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canToggleActive = isEdit && can(PERMISSIONS.BLOCK_EDIT);

  const onFormSubmit = async (data: BlockFormData) => {
    // FIX: reset() must be called BEFORE onSubmit creates the navigation event (router.back).
    // If called after, the navigation guard checks isDirty (true) before reset happens.
    // Resetting with 'data' preserves the values but clears the dirty flag.
    reset(data);
    await onSubmit(data); 
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput
                label="Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                mode="outlined"
                disabled={isView}
                error={!!errors.name}
              />
              {errors.name && (
                <HelperText type="error" visible={!!errors.name}>
                  {errors.name.message}
                </HelperText>
              )}
            </View>
          )}
        />

        <View style={styles.inputContainer}>
          <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
            Orchard
          </Text>
          {isView ? (
            <Text variant="bodyLarge">{selectedOrchard?.name || 'None'}</Text>
          ) : (
            <>
              <Button
                mode="outlined"
                onPress={() => {
                  setSearchQuery('');
                  setOrchardModalVisible(true);
                }}
                style={styles.selectorButton}
                disabled={isEdit}
              >
                {selectedOrchard?.name || 'Select Orchard'}
              </Button>
              {errors.orchardId && (
                <HelperText type="error" visible={!!errors.orchardId}>
                  {errors.orchardId.message}
                </HelperText>
              )}
            </>
          )}
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium">Plantings</Text>
            {!isView && (
              <IconButton
                icon="plus"
                onPress={() => append({ varietyId: '', treeCount: 0 })}
              />
            )}
          </View>

          {fields.map((field, index) => {
            const plantingVarietyId = watch(`plantings.${index}.varietyId`);
            const plantingVariety = varieties.find(
              (v) => v._id === plantingVarietyId
            );

            return (
              <View key={field.id} style={styles.plantingItem}>
                <View style={styles.plantingRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    {isView ? (
                      <Text variant="bodyLarge">
                        {plantingVariety?.name || 'Unknown Variety'}
                      </Text>
                    ) : (
                      <Button
                        mode="outlined"
                        onPress={() => {
                          setSearchQuery('');
                          setActivePlantingIndex(index);
                          setVarietyModalVisible(true);
                        }}
                        compact
                      >
                        {plantingVariety?.name || 'Select Variety'}
                      </Button>
                    )}
                    {errors.plantings?.[index]?.varietyId && (
                      <HelperText type="error" visible>
                        {errors.plantings?.[index]?.varietyId?.message}
                      </HelperText>
                    )}
                  </View>

                  <View style={{ width: 100 }}>
                    <Controller
                      control={control}
                      name={`plantings.${index}.treeCount`}
                      render={({ field: { onChange, value } }) => (
                        <TextInput
                          label="Count"
                          value={String(value)}
                          onChangeText={onChange}
                          keyboardType="numeric"
                          mode="outlined"
                          disabled={isView}
                          dense
                        />
                      )}
                    />
                  </View>

                  {!isView && (
                    <IconButton
                      icon="delete"
                      onPress={() => remove(index)}
                      size={20}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {canToggleActive && (
          <Controller
            control={control}
            name="isActive"
            render={({ field: { value, onChange } }) => (
              <View style={styles.switchContainer}>
                <Text variant="bodyLarge">Active</Text>
                <Switch value={value} onValueChange={onChange} />
              </View>
            )}
          />
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={onCancel}
          style={styles.button}
          disabled={isSubmitting}
        >
          {isView ? 'Back' : 'Cancel'}
        </Button>
        {!isView && (
          <Button
            mode="contained"
            onPress={handleSubmit(onFormSubmit)}
            style={styles.button}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Save
          </Button>
        )}
      </View>

      <Portal>
        <Modal
          visible={orchardModalVisible}
          onDismiss={() => setOrchardModalVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Searchbar
            placeholder="Search Orchards"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          <ScrollView>
            {filteredOrchards.map((orchard) => (
              <List.Item
                key={orchard._id}
                title={orchard.name}
                onPress={() => {
                  setValue('orchardId', orchard._id, { shouldDirty: true });
                  setOrchardModalVisible(false);
                }}
                right={(props) =>
                  selectedOrchardId === orchard._id ? (
                    <List.Icon {...props} icon="check" />
                  ) : null
                }
              />
            ))}
          </ScrollView>
        </Modal>

        <Modal
          visible={varietyModalVisible}
          onDismiss={() => {
            setVarietyModalVisible(false);
            setActivePlantingIndex(null);
          }}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Searchbar
            placeholder="Search Varieties"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          <ScrollView>
            {!isView && (
              <Button
                mode="text"
                icon="plus"
                onPress={() => {
                  if (activePlantingIndex !== null) {
                    const newVarietyId = uuid();
                    pendingVarietyCreation.current = { id: newVarietyId, index: activePlantingIndex };

                    setVarietyModalVisible(false);
                    // Pass scopeId to ensure the new Variety is created in the same queue
                    // Pass forcedId so we know what to select on return
                    router.push({
                      pathname: '/master-data/varieties/create',
                      params: { 
                         scopeId: scopeId,
                         forcedId: newVarietyId,
                      },
                    });
                   }
                }}
                style={{ marginBottom: 8 }}
              >
                Create New Variety
              </Button>
            )}
            {filteredVarieties.map((variety) => (
              <List.Item
                key={variety._id}
                title={variety.name}
                onPress={() => {
                  if (activePlantingIndex !== null) {
                    setValue(
                      `plantings.${activePlantingIndex}.varietyId`,
                      variety._id,
                      { shouldDirty: true }
                    );
                  }
                  setVarietyModalVisible(false);
                  setActivePlantingIndex(null);
                }}
              />
            ))}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actions: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  selectorButton: {
    marginTop: 4,
  },
  modalContent: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  searchBar: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  plantingItem: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  plantingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});


