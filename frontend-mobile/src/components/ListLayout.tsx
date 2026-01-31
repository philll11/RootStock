import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Appbar, FAB, Searchbar, ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDrawer } from '@/components';
import { spacing } from '@/theme';
import { AppTheme } from '@/theme/mobile-theme';
import { SyncIndicator } from './SyncIndicator';

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
  onRefresh?: () => void;
  isRefreshing?: boolean;
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
  onBack,
  onRefresh,
  isRefreshing = false,
}: ListLayoutProps) => {
  const theme = useTheme<AppTheme>();
  const { toggleDrawer } = useDrawer();
  const insets = useSafeAreaInsets();

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
            refreshControl={onRefresh ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} /> : undefined}
          >
            <ActivityIndicator animating={true} size="large" />
          </ScrollView>
        ) : isEmpty ? (
          <ScrollView 
            contentContainerStyle={styles.centerContainer}
            refreshControl={onRefresh ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} /> : undefined}
          >
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {emptyText}
            </Text>
          </ScrollView>
        ) : (
          children
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
