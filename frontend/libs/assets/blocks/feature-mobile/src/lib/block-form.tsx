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
import { z } from 'zod';
import { useOrchards } from '@rootstock/orchards/orchards-data-access';
import { useVarieties } from '@rootstock/master-data/varieties/varieties-data-access';
import { useMobileDiscardWarning } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

const plantingSchema = z.object({
  varietyId: z.string().min(1, 'Variety is required'),
  treeCount: z.coerce.number().min(1, 'Tree count must be at least 1'),
});

const blockSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  orchardId: z.string().min(1, 'Orchard is required'),
  plantings: z.array(plantingSchema).optional(),
  isActive: z.boolean().optional(),
});

type BlockFormData = z.infer<typeof blockSchema>;

interface BlockFormProps {
  defaultValues?: Partial<BlockFormData>;
  onSubmit: (data: BlockFormData) => Promise<void>;
  isSubmitting?: boolean;
  mode: 'create' | 'edit' | 'view';
  onCancel: () => void;
}

export function BlockForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  mode,
  onCancel,
}: BlockFormProps) {
  const theme = useTheme();
  const { can } = usePermission();
  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const { orchards } = useOrchards();
  const { varieties } = useVarieties();

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
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

  const [orchardModalVisible, setOrchardModalVisible] = React.useState(false);
  const [varietyModalVisible, setVarietyModalVisible] = React.useState(false);
  const [activePlantingIndex, setActivePlantingIndex] = React.useState<
    number | null
  >(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const selectedOrchardId = watch('orchardId');
  const selectedOrchard = orchards.find((o) => o._id === selectedOrchardId);

  const filteredOrchards = orchards.filter((o) =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVarieties = varieties.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canToggleActive = isEdit && can(PERMISSIONS.BLOCK_EDIT);

  return (
    <View style={styles.container}>
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
            onPress={handleSubmit(onSubmit)}
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
