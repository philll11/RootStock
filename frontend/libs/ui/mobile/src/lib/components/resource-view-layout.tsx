import React from 'react';
import { View, ScrollView, Alert, StyleSheet } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { Stack } from 'expo-router';
import { spacing } from '@rootstock/ui/theme';
import { LoadingScreen } from './loading-screen';
import { ErrorScreen } from './error-screen';

interface ResourceViewLayoutProps {
  title: string;
  isLoading: boolean;
  error?: any;
  entityName: string;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  canEdit?: boolean;
  canDelete?: boolean;
  children: React.ReactNode;
}

export function ResourceViewLayout({
  title,
  isLoading,
  error,
  entityName,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  children,
}: ResourceViewLayoutProps) {
  const theme = useTheme();

  const handleDelete = () => {
    if (!onDelete) return;
    
    Alert.alert(
      `Delete ${entityName}`,
      `Are you sure you want to delete this ${entityName.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={`${entityName} not found`} />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            canEdit && onEdit ? (
              <Button onPress={onEdit}>Edit</Button>
            ) : null
          ),
          title: title
        }}
      />
      <ScrollView 
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
      >
        {children}

        {canDelete && onDelete && (
          <Button 
            mode="outlined" 
            textColor={theme.colors.error} 
            style={{ marginTop: spacing.xl, borderColor: theme.colors.error }}
            onPress={handleDelete}
          >
            Delete {entityName}
          </Button>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
  },
});
