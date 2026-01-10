import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, useTheme, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useGetVarieties } from '@rootstock/master-data/varieties/varieties-data-access';
import { ListLayout, AppTheme } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

export const VarietiesListScreen = () => {
  const router = useRouter();
  const theme = useTheme<AppTheme>();
  const { data: varieties, isLoading } = useGetVarieties();
  const { can } = usePermission();
  const canCreate = can(PERMISSIONS.VARIETY_CREATE);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredVarieties = varieties?.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <ListLayout
      title="Varieties"
      isLoading={isLoading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search varieties"
      emptyText="No varieties found"
      isEmpty={!isLoading && filteredVarieties.length === 0}
      onAdd={canCreate ? () => router.push('/master-data/varieties/create') : undefined}
    >
      <FlatList
        data={filteredVarieties}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isOptimistic = (item as any).recordId === 'TEMP';
          return (
            <List.Item
              title={item.name}
              titleStyle={isOptimistic ? { opacity: 0.5 } : undefined}
              description={isOptimistic ? 'Syncing...' : item.recordId}
              descriptionStyle={isOptimistic ? { fontStyle: 'italic' } : undefined}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={isOptimistic ? 'cloud-upload' : 'sprout'}
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
              onPress={() => router.push(`/master-data/varieties/${item._id}`)}
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
