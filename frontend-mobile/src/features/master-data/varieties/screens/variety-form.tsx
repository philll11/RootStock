import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText, List, Switch, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { varietySchema, VarietyFormData } from '@/features/master-data/varieties/data';
import { PERMISSIONS } from '@/utils';
import { spacing } from '@/theme';
import { useMobileDiscardWarning } from '@/components';
import { AppTheme } from '@/theme';
import { usePermission } from '@/features/iam/auth/data';

interface VarietyFormProps {
  defaultValues?: Partial<VarietyFormData>;
  onSubmit: (data: VarietyFormData) => void;
  isSubmitting?: boolean;
  isEditMode?: boolean;
}

export const VarietyForm = ({ defaultValues, onSubmit, isSubmitting, isEditMode }: VarietyFormProps) => {
  const theme = useTheme<AppTheme>();
  const { can } = usePermission();
  const [isSaving, setIsSaving] = React.useState(false);
  const { control, handleSubmit, formState: { errors, isDirty }, reset } = useForm<VarietyFormData>({
    resolver: zodResolver(varietySchema),
    defaultValues: {
      name: '',
      isActive: true,
      ...defaultValues,
    },
  });

  useMobileDiscardWarning(isDirty && !isSaving);

  const handleFormSubmit = async (data: VarietyFormData) => {
    setIsSaving(true);
    try {
      reset(data);
      await onSubmit(data);
    } catch (error) {
      setIsSaving(false);
    }
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

        {can(PERMISSIONS.VARIETY_MANAGE_INACTIVE) && isEditMode && (
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

        <Button
          mode="contained"
          onPress={handleSubmit(handleFormSubmit)}
          loading={isSubmitting}
          style={styles.button}
        >
          {isEditMode ? 'Save Changes' : 'Create Variety'}
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
  switchItem: {
    paddingHorizontal: 0,
  },
  button: {
    marginTop: spacing.lg,
  },
});

