import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Appbar, FAB, Searchbar, ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDrawer } from '../drawer-context';
import { spacing } from '@rootstock/ui/theme';
import { AppTheme } from '../mobile-theme';
import { SyncIndicator } from './sync-indicator';
import { useSafeRefetch } from '@rootstock/shared/util';

interface ResourceListLayoutProps {
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
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const ResourceListLayout = ({
  title,
  children,
  onAdd,
  isLoading,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search',
  emptyText = 'No items found',
  isEmpty,
  onBack,
  onRefresh,
  isRefreshing = false,
}: ResourceListLayoutProps) => {
  const theme = useTheme<AppTheme>();
  const { toggleDrawer } = useDrawer();
  const insets = useSafeAreaInsets();

  // Wrap the provided onRefresh with Safe Synchronization Logic (Push -> Wait -> Pull)
  const { safeRefetch, isRefetching: isSafeRefetching } = useSafeRefetch(async () => {
    if (onRefresh) await onRefresh();
  });

  const handleRefresh = onRefresh ? safeRefetch : undefined;
  const isSafeRefreshing = isRefreshing || isSafeRefetching;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        {onBack ? (
          <Appbar.BackAction onPress={onBack} />
        ) : (
          <Appbar.Action icon="menu" onPress={toggleDrawer} />
        )}
        <Appbar.Content title={title} />
        <SyncIndicator />
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
          <ScrollView 
            contentContainerStyle={styles.centerContainer}
            refreshControl={handleRefresh ? <RefreshControl refreshing={isSafeRefreshing} onRefresh={handleRefresh} /> : undefined}
          >
            <ActivityIndicator animating={true} size="large" />
          </ScrollView>
        ) : isEmpty ? (
          <ScrollView 
            contentContainerStyle={styles.centerContainer}
            refreshControl={handleRefresh ? <RefreshControl refreshing={isSafeRefreshing} onRefresh={handleRefresh} /> : undefined}
          >
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {emptyText}
            </Text>
          </ScrollView>
        ) : (
          // Inject Safe Refresh into direct children (e.g. FlatList) to enforce transactional safety
          React.Children.map(children, (child) => {
            if (React.isValidElement(child) && (child.props as any).onRefresh) {
              return React.cloneElement(child, {
                onRefresh: handleRefresh,
                refreshing: isSafeRefreshing,
              } as any);
            }
            return child;
          })
        )}
      </View>

      {onAdd && (
        <FAB
          icon="plus"
          style={[
            styles.fab, 
            { 
              backgroundColor: theme.colors.primary,
              bottom: spacing.md + insets.bottom 
            }
          ]}
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
    // bottom is handled inline
  },
});
