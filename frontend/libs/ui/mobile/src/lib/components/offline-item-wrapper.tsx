import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../mobile-theme';
import { iconSizes, spacing } from '@rootstock/ui/theme';
import { useMutationState } from '@tanstack/react-query';

export type SyncStatus = 'synced' | 'pending-create' | 'pending-update' | 'pending-delete';

interface OfflineItemWrapperProps {
  status?: SyncStatus;
  children: React.ReactElement;
}

export const OfflineItemWrapper = ({ status = 'synced', children }: OfflineItemWrapperProps) => {
  const theme = useTheme<AppTheme>();

  if (status === 'synced') {
    return children;
  }

  return (
    <View 
      style={[
        styles.container, 
        { opacity: 0.7 }
      ]}
      pointerEvents="auto"
    >
      {children}
    </View>
  );
};

export const OfflineStatusIcon = ({ status }: { status: SyncStatus }) => {
  const theme = useTheme<AppTheme>();
  if (status === 'synced') return null;
  
  let iconName: any = 'cloud-upload';
  let color = theme.colors.tertiary;

  return (
    <MaterialCommunityIcons 
      name={iconName}
      size={20} 
      color={color} 
      style={{ marginRight: spacing.xs }}
    />
  );
};

// Helper to get descriptive text for the offline status
export const getOfflineStatusText = (status: SyncStatus) => {
  switch (status) {
    case 'pending-create': return 'Created (Sync Pending)';
    case 'pending-update': return 'Edited (Sync Pending)';
    case 'pending-delete': return 'Deleted (Sync Pending)';
    default: return 'Waiting for sync...';
  }
};

// Helper to determine status from standard entity fields and mutation state
export const useEntitySyncStatus = (item: { recordId?: string; _id?: string }): SyncStatus => {
  const pendingMutations = useMutationState({
    filters: { status: 'pending' },
    select: (mutation) => ({
       variables: mutation.state.variables as any,
       meta: mutation.meta
    }),
  });

  if (item.recordId === 'TEMP') return 'pending-create';

  // Check mutation queue
  for (const { variables } of pendingMutations) {
    if (!variables) continue;
    
    // Check ID match
    const targetId = variables.id || variables._id || (typeof variables === 'string' ? variables : null);
    if (targetId === item._id) {
       if (typeof variables === 'string') return 'pending-delete';
       return 'pending-update';
    }
  }

  return 'synced';
};

const styles = StyleSheet.create({
  container: {
  },
  strikethrough: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent black line
    zIndex: 10,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});
