import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, useTheme, Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetBlocks } from '@rootstock/assets/blocks/blocks-data-access';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { ListLayout, AppTheme } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';

export const BlocksListScreen = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { orchardId } = useLocalSearchParams<{ orchardId: string }>();
  const { data: blocks, isLoading } = useGetBlocks(orchardId);
  const { can } = usePermission();
  const canCreate = can(PERMISSIONS.BLOCK_CREATE);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredBlocks =
    blocks?.filter((b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <ListLayout
      title="Blocks"
      isLoading={isLoading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search blocks"
      emptyText="No blocks found"
      isEmpty={!isLoading && filteredBlocks.length === 0}
      onAdd={
        canCreate
          ? () =>
              router.push(
                orchardId
                  ? `/assets/blocks/create?orchardId=${orchardId}`
                  : '/assets/blocks/create'
              )
          : undefined
      }
      onBack={orchardId ? () => router.back() : undefined}
    >
      <FlatList
        data={filteredBlocks}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isOptimistic = (item as any).recordId === 'TEMP';
          return (
            <List.Item
              title={item.name}
              titleStyle={isOptimistic ? { opacity: 0.5 } : undefined}
              description={
                isOptimistic
                  ? 'Syncing...'
                  : `${item.recordId} • ${item.plantings.length} plantings`
              }
              descriptionStyle={isOptimistic ? { fontStyle: 'italic' } : undefined}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={isOptimistic ? 'cloud-upload' : 'grid'}
                  color={isOptimistic ? theme.colors.outline : undefined}
                />
              )}
              right={(props) => (
                <View style={styles.statusContainer}>
                  {!item.isActive && !isOptimistic && (
                    <Text
                      style={{
                        color: theme.colors.error,
                        marginRight: spacing.sm,
                      }}
                    >
                      Inactive
                    </Text>
                  )}
                  <List.Icon {...props} icon="chevron-right" />
                </View>
              )}
              onPress={() => router.push(`/assets/blocks/${item._id}`)}
              style={[styles.listItem, isOptimistic && { opacity: 0.7 }]}
            />
          );
        }}
      />
    </ListLayout>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingBottom: 80 },
  listItem: { paddingHorizontal: spacing.sm },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
});
