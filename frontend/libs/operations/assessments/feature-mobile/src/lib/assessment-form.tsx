import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  HelperText,
  useTheme,
  IconButton,
  DataTable,
} from 'react-native-paper';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMobileDiscardWarning, DataEntryWizard, AppTheme } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';
import { DatePickerInput } from 'react-native-paper-dates';
import {
  AssessmentFormData,
  assessmentSchema,
  AssessmentStatus,
} from '@rootstock/operations/assessments/assessments-data-access';

interface AssessmentFormProps {
  defaultValues?: Partial<AssessmentFormData>;
  onSubmit: (data: AssessmentFormData) => Promise<void>;
  isSubmitting?: boolean;
  mode: 'create' | 'edit' | 'view';
  onCancel: () => void;
  blockId?: string;
}

export function AssessmentForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  mode,
  onCancel,
  blockId,
}: AssessmentFormProps) {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const isView = mode === 'view';
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardData, setWizardData] = useState({ totalFruit: '', damagedFruit: '' });
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema) as any,
    defaultValues: {
      blockId: blockId || '',
      status: AssessmentStatus.PENDING,
      date: new Date(),
      samples: [],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'samples',
  });

  useMobileDiscardWarning(isDirty && !isSubmitting);

  const handleFormSubmit = async (data: AssessmentFormData) => {
    // Re-index samples to ensure sequential row numbers
    const indexedSamples = data.samples.map((sample, index) => ({
      ...sample,
      rowNumber: index + 1,
    }));

    await onSubmit({
      ...data,
      samples: indexedSamples,
    });
  };

  const handleWizardSave = async () => {
    append({
      rowNumber: fields.length + 1,
      totalFruit: parseInt(wizardData.totalFruit) || 0,
      damagedFruit: parseInt(wizardData.damagedFruit) || 0,
    });
    setWizardData({ totalFruit: '', damagedFruit: '' });
  };

  const handleWizardFinish = async () => {
    const hasData = wizardData.totalFruit !== '' || wizardData.damagedFruit !== '';

    if (hasData) {
      Alert.alert(
        'Unsaved Changes',
        'You have entered data for a sample. Do you want to save it before finishing?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setWizardData({ totalFruit: '', damagedFruit: '' });
              setIsWizardOpen(false);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Save',
            onPress: async () => {
              await handleWizardSave();
              setIsWizardOpen(false);
            },
          },
        ]
      );
    } else {
      setIsWizardOpen(false);
    }
  };

  return (
    <View style={styles.container}>
      <DataEntryWizard
        visible={isWizardOpen}
        title="Record Sample"
        itemNumber={fields.length + 1}
        onSaveAndNext={handleWizardSave}
        onSaveAndFinish={handleWizardFinish}
        onCancel={() => setIsWizardOpen(false)}
      >
        <TextInput
          label="Total Fruit"
          value={wizardData.totalFruit}
          onChangeText={(val) => setWizardData((prev) => ({ ...prev, totalFruit: val }))}
          keyboardType="number-pad"
          mode="outlined"
          style={{ marginBottom: spacing.md }}
        />
        <TextInput
          label="Damaged Fruit"
          value={wizardData.damagedFruit}
          onChangeText={(val) => setWizardData((prev) => ({ ...prev, damagedFruit: val }))}
          keyboardType="number-pad"
          mode="outlined"
          error={(parseInt(wizardData.damagedFruit) || 0) > (parseInt(wizardData.totalFruit) || 0)}
        />
        {(parseInt(wizardData.damagedFruit) || 0) > (parseInt(wizardData.totalFruit) || 0) && (
          <HelperText type="error" visible>
            Damaged fruit cannot exceed total fruit.
          </HelperText>
        )}
      </DataEntryWizard>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        >
          <View style={styles.section}>
            <Controller
              control={control}
              name="date"
              render={({ field: { value, onChange } }) => (
                <DatePickerInput
                  locale="en"
                  label="Assessment Date"
                  value={value}
                  onChange={onChange}
                  inputMode="start"
                  mode="outlined"
                  disabled={isView}
                  style={styles.input}
                />
              )}
            />
            {errors.date && (
              <HelperText type="error" visible={!!errors.date}>
                {errors.date.message}
              </HelperText>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium">Samples</Text>
              {!isView && (
                <Button
                  mode="contained-tonal"
                  onPress={() => setIsWizardOpen(true)}
                  icon="plus"
                >
                  Record Samples
                </Button>
              )}
            </View>

            {fields.length > 0 ? (
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title numeric>Row</DataTable.Title>
                  <DataTable.Title numeric>Total</DataTable.Title>
                  <DataTable.Title numeric>Damaged</DataTable.Title>
                  {!isView && <DataTable.Title style={{ flex: 0.5 }}> </DataTable.Title>}
                </DataTable.Header>

                {fields.map((field, index) => (
                  <DataTable.Row key={field.id}>
                    <DataTable.Cell numeric>
                      <Text variant="bodyMedium" style={{ textAlign: 'center', width: '100%' }}>
                        {index + 1}
                      </Text>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Controller
                        control={control}
                        name={`samples.${index}.totalFruit`}
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            value={String(value)}
                            onChangeText={onChange}
                            keyboardType="numeric"
                            dense
                            mode="flat"
                            disabled={isView}
                            style={styles.cellInput}
                            onFocus={() => {
                              if (index >= fields.length - 1) {
                                setTimeout(() => {
                                  scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 200);
                              }
                            }}
                          />
                        )}
                      />
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Controller
                        control={control}
                        name={`samples.${index}.damagedFruit`}
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            value={String(value)}
                            onChangeText={onChange}
                            keyboardType="numeric"
                            dense
                            mode="flat"
                            disabled={isView}
                            style={styles.cellInput}
                            onFocus={() => {
                              if (index >= fields.length - 1) {
                                setTimeout(() => {
                                  scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 200);
                              }
                            }}
                          />
                        )}
                      />
                    </DataTable.Cell>
                    {!isView && (
                      <DataTable.Cell style={{ flex: 0.5 }}>
                        <IconButton
                          icon="delete"
                          size={20}
                          onPress={() => remove(index)}
                          iconColor={theme.colors.error}
                        />
                      </DataTable.Cell>
                    )}
                  </DataTable.Row>
                ))}
              </DataTable>
            ) : (
              <Text style={styles.emptyText}>No samples added yet.</Text>
            )}
          </View>
        </ScrollView>

        {!isView && (
          <View style={[styles.footer, { backgroundColor: theme.colors.surface, paddingBottom: spacing.md + insets.bottom }]}>
            <Button mode="outlined" onPress={onCancel} style={styles.button}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(handleFormSubmit)}
              loading={isSubmitting}
              disabled={isSubmitting || !isDirty}
              style={styles.button}
            >
              Save
            </Button>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 80,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  input: {
    marginBottom: spacing.xs,
  },
  cellInput: {
    height: 40,
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginVertical: spacing.md,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  button: {
    minWidth: 100,
  },
});
