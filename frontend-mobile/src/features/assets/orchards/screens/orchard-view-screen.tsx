import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetOrchard, useDeleteOrchard } from '@/features/assets/orchards/data';
import { DetailRow, ResourceViewLayout } from '@/components';
import { AppTheme } from '@/theme';
import { spacing } from '@/theme';
import { usePermission } from '@/features/iam/auth/data';
import { PERMISSIONS, notify } from '@/utils';
import { useNetInfo } from '@react-native-community/netinfo';

export function OrchardViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutate: deleteOrchard, mutateAsync: deleteOrchardAsync } = useDeleteOrchard();
  const { data: orchard, isLoading, refetch, isRefetching } = useGetOrchard(id!);
  const { can } = usePermission();
  const theme = useTheme<AppTheme>();
  const { isConnected } = useNetInfo();

  const handleEdit = () => {
    router.push(`/assets/orchards/edit?id=${id}`);
  };

  const handleDelete = async () => {
    const isOnline = isConnected === true;
    try {
      if (isOnline) {
        await deleteOrchardAsync(id!);
      } else {
        deleteOrchard(id!);
        notify.success('Will sync when online', 'Deletion queued');
      }
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  const clientName = typeof orchard?.clientId === 'object' ? (orchard.clientId as any).name : 'Unknown Client';
  const userNames = orchard?.userIds?.map((u: any) => typeof u === 'object' ? u.name : 'Unknown User') || [];

  return (
    <ResourceViewLayout
      title={orchard?.name || 'Orchard Details'}
      isLoading={isLoading}
      error={!orchard}
      entityName="Orchard"
      onEdit={handleEdit}
      onDelete={handleDelete}
      canEdit={can(PERMISSIONS.ORCHARD_EDIT)}
      canDelete={can(PERMISSIONS.ORCHARD_DELETE)}
      onRefresh={refetch}
      isRefreshing={isRefetching}
    >
      <DetailRow label="Name" value={orchard?.name} />
      <DetailRow label="Client" value={clientName} />
      <DetailRow label="Status" value={orchard?.isActive ? 'Active' : 'Inactive'} />
      
      <Text variant="titleMedium" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
        Assigned Users
      </Text>
      <View style={styles.chipContainer}>
        {userNames.map((name: string, index: number) => (
          <Chip key={index} style={styles.chip}>{name}</Chip>
        ))}
        {userNames.length === 0 && <Text variant="bodyMedium">No users assigned</Text>}
      </View>
    </ResourceViewLayout>
  );
}

const styles = StyleSheet.create({
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
});

