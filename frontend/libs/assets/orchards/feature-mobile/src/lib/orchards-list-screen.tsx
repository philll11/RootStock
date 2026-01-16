import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, useTheme, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useGetOrchards, Orchard } from '@rootstock/assets/orchards/orchards-data-access';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { ResourceListLayout, AppTheme } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';

export function OrchardsListScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { data: orchards = [], isLoading, refetch, isRefetching } = useGetOrchards();
  const { can } = usePermission();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrchards = orchards.filter((orchard) => {
    const clientName =
      typeof orchard.clientId === 'object' ? orchard.clientId.name : '';
    return (
      orchard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handlePress = (orchard: Orchard) => {
    router.push(`/assets/orchards/${orchard._id}`);
  };

  return (
    <ResourceListLayout
      title="Orchards"
      isLoading={isLoading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search orchards"
      emptyText="No orchards found"
      isEmpty={!isLoading && filteredOrchards.length === 0}
      onAdd={
        can(PERMISSIONS.ORCHARD_CREATE)
          ? () => router.push('/assets/orchards/create')
          : undefined
      }
      onRefresh={refetch}
      isRefreshing={isRefetching}
    >
      <FlatList
        data={filteredOrchards}
        keyExtractor={(item) => item._id}
        refreshing={isRefetching}
        onRefresh={refetch}
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
                      : typeof item.clientId === 'object'
                      ? item.clientId.name
                      : 'Unknown Client'
                  }
                  descriptionStyle={isOptimistic ? { fontStyle: 'italic' } : undefined}
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon={isOptimistic ? 'cloud-upload' : 'tree'}
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
                  onPress={() => handlePress(item)}
                  style={[styles.listItem, isOptimistic && { opacity: 0.7 }]}
                />
              );
            }}
          />
        </ResourceListLayout>
      );
    }

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 80,
  },
  listItem: {
    paddingHorizontal: spacing.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
