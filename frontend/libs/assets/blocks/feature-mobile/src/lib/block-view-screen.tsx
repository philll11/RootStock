import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, List, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetBlock, useDeleteBlock } from '@rootstock/assets/blocks/blocks-data-access';
import { DetailRow, ResourceViewLayout } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function BlockViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: deleteBlock } = useDeleteBlock();
  const { data: block, isLoading } = useGetBlock(id!);
  const { can } = usePermission();
  const theme = useTheme();

  const orchardName = typeof block?.orchardId === 'object' ? (block.orchardId as any).name : 'Unknown Orchard';

  return (
    <ResourceViewLayout
      title={block?.name || 'Block Details'}
      isLoading={isLoading}
      error={!block}
      entityName="Block"
      onEdit={() => router.push(`/assets/blocks/edit?id=${id}`)}
      onDelete={async () => {
        await deleteBlock(id!);
        router.back();
      }}
      canEdit={can(PERMISSIONS.BLOCK_EDIT)}
      canDelete={can(PERMISSIONS.BLOCK_DELETE)}
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
