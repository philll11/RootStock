import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, useTheme, Text } from 'react-native-paper';
import { useBlocks } from '@rootstock/blocks/blocks-data-access';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { ListLayout, AppTheme } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';

export const BlocksListScreen = ({ navigation, route }: any) => {
  const theme = useTheme() as AppTheme;
  const { orchardId } = route.params || {};
  const { blocks, isLoading } = useBlocks(orchardId);
  const { can } = usePermission();
  const canCreate = can(PERMISSIONS.BLOCK_CREATE);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredBlocks = blocks?.filter(b => 
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
      onAdd={canCreate ? () => navigation.navigate('BlockForm', { orchardId }) : undefined}
      onBack={() => navigation.goBack()}
    >
      <FlatList
        data={filteredBlocks}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={`${item.recordId} • ${item.plantings.length} plantings`}
            left={props => <List.Icon {...props} icon="grid" />}
            right={props => (
              <View style={styles.statusContainer}>
                {!item.isActive && <Text style={{ color: theme.colors.error, marginRight: spacing.sm }}>Inactive</Text>}
                <List.Icon {...props} icon="chevron-right" />
              </View>
            )}
            onPress={() => navigation.navigate('BlockForm', { orchardId, blockId: item._id })}
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
