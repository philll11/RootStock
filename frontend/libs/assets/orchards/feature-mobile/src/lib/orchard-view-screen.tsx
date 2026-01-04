import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetOrchard, useDeleteOrchard } from '@rootstock/assets/orchards/orchards-data-access';
import { DetailRow, ResourceViewLayout, AppTheme } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function OrchardViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: deleteOrchard } = useDeleteOrchard();
  const { data: orchard, isLoading } = useGetOrchard(id!);
  const { can } = usePermission();
  const theme = useTheme<AppTheme>();

  const handleEdit = () => {
    router.push(`/assets/orchards/edit?id=${id}`);
  };

  const handleDelete = async () => {
    await deleteOrchard(id!);
    router.back();
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
