import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, useTheme, Text } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useBlocks } from '@rootstock/assets/blocks/data-access';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { ListLayout, AppTheme } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';

export const BlocksListScreen = () => {
  const theme = useTheme() as AppTheme;
  const router = useRouter();
  const { orchardId } = useLocalSearchParams<{ orchardId: string }>();
  const { blocks, isLoading } = useBlocks(orchardId);
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
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={`${item.recordId} • ${item.plantings.length} plantings`}
            left={(props) => <List.Icon {...props} icon="grid" />}
            right={(props) => (
              <View style={styles.statusContainer}>
                {!item.isActive && (
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
            style={styles.listItem}
          />
        )}
      />
    </ListLayout>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingBottom: 80 },
  listItem: { paddingHorizontal: spacing.sm },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
});
