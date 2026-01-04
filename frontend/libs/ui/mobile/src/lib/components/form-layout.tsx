import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Appbar, useTheme, ActivityIndicator } from 'react-native-paper';
import { spacing } from '@rootstock/ui/theme';
import { AppTheme } from '../mobile-theme';
import { SyncIndicator } from './sync-indicator';

export type FormMode = 'create' | 'edit' | 'view';

interface FormLayoutProps {
  children: React.ReactNode;
  mode: FormMode;
  title: string;
  onCancel: () => void;
  onSubmit?: () => void;
  onEdit?: () => void;
  onClear?: () => void;
  canEdit?: boolean;
  isLoading?: boolean;
  isDirty?: boolean;
  submitLabel?: string;
}

export function FormLayout({
  children,
  mode,
  title,
  onCancel,
  onSubmit,
  onEdit,
  onClear,
  canEdit = true,
  isLoading = false,
  isDirty = false,
  submitLabel,
}: FormLayoutProps) {
  const theme = useTheme<AppTheme>();
  const isView = mode === 'view';
  const isCreate = mode === 'create';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={onCancel} />
        <Appbar.Content title={title} />
        <SyncIndicator />
        {isView ? (
          canEdit && onEdit && <Appbar.Action icon="pencil" onPress={onEdit} />
        ) : (
          <>
            {onClear && <Appbar.Action icon="delete" onPress={onClear} disabled={isLoading} />}
            <Appbar.Action 
              icon="check" 
              onPress={onSubmit} 
              disabled={isLoading || (!isCreate && !isDirty)} 
            />
          </>
        )}
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {isLoading ? (
           <View style={styles.loadingContainer}>
             <ActivityIndicator animating={true} size="large" />
           </View>
        ) : (
          <ScrollView 
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 100, // Extra padding for bottom
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
