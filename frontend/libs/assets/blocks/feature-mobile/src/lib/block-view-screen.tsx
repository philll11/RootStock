import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, List, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetBlock, useDeleteBlock } from '@rootstock/assets/blocks/blocks-data-access';
import { DetailRow, ResourceViewLayout, AppTheme } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS, notify } from '@rootstock/shared/util';
import { useNetInfo } from '@react-native-community/netinfo';

export function BlockViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutate: deleteBlock, mutateAsync: deleteBlockAsync } = useDeleteBlock();
  const { data: block, isLoading, refetch, isRefetching } = useGetBlock(id!);
  const { can } = usePermission();
  const theme = useTheme<AppTheme>();
  const { isConnected } = useNetInfo();

  const handleEdit = () => {
    router.push(`/assets/blocks/edit?id=${id}`);
  };

  const handleDelete = async () => {
    const isOnline = isConnected === true;
    try {
      if (isOnline) {
        await deleteBlockAsync(id!);
      } else {
        deleteBlock(id!);
        notify.success('Will sync when online', 'Deletion queued');
      }
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  const orchardName = typeof block?.orchardId === 'object' ? (block.orchardId as any).name : 'Unknown Orchard';

  return (
    <ResourceViewLayout
      title={block?.name || 'Block Details'}
      isLoading={isLoading}
      error={!block}
      entityName="Block"
      onEdit={handleEdit}
      onDelete={handleDelete}
      canEdit={can(PERMISSIONS.BLOCK_EDIT)}
      canDelete={can(PERMISSIONS.BLOCK_DELETE)}
      onRefresh={refetch}
      isRefreshing={isRefetching}
    >
      <DetailRow label="Name" value={block?.name} />
      <DetailRow label="Orchard" value={orchardName} />
      <DetailRow label="Status" value={block?.isActive ? 'Active' : 'Inactive'} />
      
      <Text variant="titleMedium" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
        Plantings
      </Text>
      <View style={styles.plantingsContainer}>
        {block?.plantings?.map((planting: any, index: number) => {
          const varietyName = typeof planting.varietyId === 'object' ? planting.varietyId.name : 'Unknown Variety';
          return (
            <List.Item
              key={index}
              title={varietyName}
              description={`${planting.treeCount} trees`}
              left={props => <List.Icon {...props} icon="tree" />}
              style={styles.plantingItem}
            />
          );
        })}
        {(!block?.plantings || block.plantings.length === 0) && (
          <Text variant="bodyMedium">No plantings recorded</Text>
        )}
      </View>
    </ResourceViewLayout>
  );
}

const styles = StyleSheet.create({
  plantingsContainer: {
    marginTop: spacing.xs,
  },
  plantingItem: {
    paddingLeft: 0,
    paddingRight: 0,
  },
});
