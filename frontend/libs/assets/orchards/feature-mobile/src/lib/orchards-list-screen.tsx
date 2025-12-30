import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, useTheme, Text } from 'react-native-paper';
import { useOrchards, Orchard } from '@rootstock/orchards/orchards-data-access';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { ListLayout, AppTheme } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';

export function OrchardsListScreen({ navigation }: any) {
  const theme = useTheme() as AppTheme;
  const { orchards, isLoading } = useOrchards();
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
    navigation.navigate('OrchardForm', { orchardId: orchard._id });
  };

  return (
    <ListLayout
      title="Orchards"
      isLoading={isLoading}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search orchards"
      emptyText="No orchards found"
      isEmpty={!isLoading && filteredOrchards.length === 0}
      onAdd={
        can(PERMISSIONS.ORCHARD_CREATE)
          ? () => navigation.navigate('OrchardForm')
          : undefined
      }
    >
      <FlatList
        data={filteredOrchards}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={
              typeof item.clientId === 'object'
                ? item.clientId.name
                : 'Unknown Client'
            }
            left={(props) => <List.Icon {...props} icon="tree" />}
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
            onPress={() => handlePress(item)}
            style={styles.listItem}
          />
        )}
      />
    </ListLayout>
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
