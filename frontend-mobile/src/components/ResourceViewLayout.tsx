import React from 'react';
import { View, ScrollView, Alert, StyleSheet, RefreshControl } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme';
import { LoadingScreen } from './LoadingScreen';
import { ErrorScreen } from './ErrorScreen';
import { SyncIndicator } from './SyncIndicator';
import { AppTheme } from '@/theme/mobile-theme';

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
  onRefresh?: () => void;
  isRefreshing?: boolean;
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
  onRefresh,
  isRefreshing = false,
}: ResourceViewLayoutProps) {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();

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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <SyncIndicator />
              {canEdit && onEdit ? (
                <Button onPress={onEdit}>Edit</Button>
              ) : null}
            </View>
          ),
          title: title
        }}
      />
      <ScrollView 
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.md + insets.bottom }]}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          ) : undefined
        }
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
