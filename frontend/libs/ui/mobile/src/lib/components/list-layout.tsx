import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, FAB, Searchbar, ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useDrawer } from '../drawer-context';
import { spacing } from '@rootstock/ui/theme';

interface ListLayoutProps {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
  isLoading?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  isEmpty?: boolean;
  onBack?: () => void;
}

export const ListLayout = ({
  title,
  children,
  onAdd,
  isLoading,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search',
  emptyText = 'No items found',
  isEmpty,
  onBack
}: ListLayoutProps) => {
  const theme = useTheme();
  const { toggleDrawer } = useDrawer();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        {onBack ? (
          <Appbar.BackAction onPress={onBack} />
        ) : (
          <Appbar.Action icon="menu" onPress={toggleDrawer} />
        )}
        <Appbar.Content title={title} />
      </Appbar.Header>

      <View style={styles.content}>
        {onSearchChange && (
          <Searchbar
            placeholder={searchPlaceholder}
            onChangeText={onSearchChange}
            value={searchQuery || ''}
            style={styles.searchBar}
          />
        )}

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator animating={true} size="large" />
          </View>
        ) : isEmpty ? (
          <View style={styles.centerContainer}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {emptyText}
            </Text>
          </View>
        ) : (
          children
        )}
      </View>

      {onAdd && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={onAdd}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  searchBar: { margin: spacing.md },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
  },
});
