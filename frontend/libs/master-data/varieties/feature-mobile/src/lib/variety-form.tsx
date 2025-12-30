import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText, List, Switch, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';
import { useMobileDiscardWarning } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';

export interface VarietyFormData {
  name: string;
  isActive: boolean;
}

interface VarietyFormProps {
  defaultValues?: Partial<VarietyFormData>;
  onSubmit: (data: VarietyFormData) => void;
  isSubmitting?: boolean;
  isEditMode?: boolean;
}

export const VarietyForm = ({ defaultValues, onSubmit, isSubmitting, isEditMode }: VarietyFormProps) => {
  const theme = useTheme();
  const { can } = usePermission();
  const [isSaving, setIsSaving] = React.useState(false);
  const { control, handleSubmit, formState: { errors, isDirty } } = useForm<VarietyFormData>({
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
          rules={{ required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } }}
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
