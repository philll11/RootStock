import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableWithoutFeedback, ScrollView, Platform, Alert } from 'react-native';
import { Drawer, useTheme, Text, Avatar, Divider, List } from 'react-native-paper';
import { useDrawer, AppTheme, useNetworkStatus } from '@rootstock/ui/mobile';
import { layout, zIndex, transitions, spacing } from '@rootstock/ui/theme';
import { useLogout, useGetProfile, usePermission } from '@rootstock/iam/auth/auth-data-access';
import { useSyncOfflineData } from '@rootstock/system/sync/sync-data-access';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '@rootstock/shared/util';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { NAVIGATION_ITEMS } from '../config/navigation';

const DRAWER_WIDTH = layout.sidebarWidth;
const ANIMATION_DURATION = parseInt(transitions.duration.normal);

const CollapsibleSection = ({ children, expanded }: { children: React.ReactNode, expanded: boolean }) => {
  const [contentHeight, setContentHeight] = React.useState(0);
  const animatedHeight = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
     Animated.timing(animatedHeight, {
        toValue: expanded ? contentHeight : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
  }, [expanded, contentHeight]);

  return (
    <Animated.View style={{ height: animatedHeight, overflow: 'hidden' }}>
      <View 
        onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
        style={{ position: 'absolute', width: '100%', top: 0 }}
      >
        {children}
      </View>
    </Animated.View>
  );
};

export const AppDrawer = () => {
  const { isOpen, closeDrawer } = useDrawer();
  const { mutate: logout } = useLogout();
  const { data: user } = useGetProfile();
  const { hasPermission } = usePermission();
  const { syncAll, isSyncing } = useSyncOfflineData();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({});

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };
  
  // Animation value: 0 = closed, 1 = open
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: parseInt(transitions.duration.fast),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: parseInt(transitions.duration.fast),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, fadeAnim]);

  const handleNavigate = (screen: string) => {
    // Map legacy screen names to routes if necessary, or assume screen is a route
    // For now, we assume NAVIGATION_ITEMS will be updated to use routes
    // But if they are still screen names like 'Dashboard', we need a map.
    // Let's assume we will update NAVIGATION_ITEMS or map here.
    
    let route = screen;
    if (screen === 'Dashboard') route = '/';
    else if (screen === 'Profile') route = '/profile';
    else if (screen === 'Settings') route = '/settings';
    else if (!screen.startsWith('/')) route = `/${screen.toLowerCase()}`;

    router.push(route as any);
    closeDrawer();
  };

  const handleSync = async () => {
    if (!isOnline) {
      notify.info('You are offline. Cannot sync data.', 'Offline');
      return;
    }
    await syncAll();
  };

  const handleLogout = () => {
    // Phase 2: The Airlock (Logout Protection)
    const pendingMutations = queryClient.getMutationCache().getAll().filter(
      (m) => m.state.status === 'pending'
    );

    if (pendingMutations.length > 0) {
      Alert.alert(
        'Unsaved Changes',
        `You have ${pendingMutations.length} items waiting to sync. Logging out will PERMANENTLY DELETE them.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Logout & Delete', 
            style: 'destructive',
            onPress: () => {
              closeDrawer();
              logout();
            }
          }
        ]
      );
      return;
    }

    closeDrawer();
    logout();
  };

  // Interpolate slide animation to translation
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  return (
    <View 
      style={[styles.container, !isOpen ? styles.containerClosed : null]} 
      pointerEvents={isOpen ? 'auto' : 'none'}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={closeDrawer}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* Drawer Content */}
      <Animated.View 
        style={[
          styles.drawer, 
          { 
            backgroundColor: theme.colors.surface,
            transform: [{ translateX }] 
          }
        ]}
      >
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <View style={styles.header}>
            <Avatar.Text 
              size={48} 
              label={user?.firstName?.substring(0, 2).toUpperCase() || 'US'} 
              style={{ backgroundColor: theme.colors.primary }}
            />
            <View style={styles.userInfo}>
              <Text variant="titleMedium">{user?.firstName} {user?.lastName}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {user?.email}
              </Text>
            </View>
          </View>
          
          <Divider />

          <ScrollView style={styles.section} contentContainerStyle={{ paddingBottom: 16 }}>
            <Drawer.Section showDivider={false}>
            {NAVIGATION_ITEMS.map((item, index) => {
              const renderDrawerItem = (navItem: any, idx: number) => {
                // Check permission for the item itself
                if (navItem.permission && !hasPermission(navItem.permission)) {
                  return null;
                }

                // Check requiredScope
                if (navItem.requiredScope) {
                  const userRole = user?.roleId;
                  // Ensure role is populated and matches scope
                  if (!userRole || typeof userRole !== 'object' || (userRole as any).visibilityScope !== navItem.requiredScope) {
                    return null;
                  }
                }

                // If it has children, check if user has permission for at least one child
                if (navItem.children && navItem.children.length > 0) {
                  const visibleChildren = navItem.children.filter((child: any) => {
                    // Check permission
                    if (child.permission && !hasPermission(child.permission)) return false;
                    
                    // Check requiredScope
                    if (child.requiredScope) {
                      const userRole = user?.roleId;
                      if (!userRole || typeof userRole !== 'object' || (userRole as any).visibilityScope !== child.requiredScope) {
                        return false;
                      }
                    }
                    return true;
                  });
                  
                  if (visibleChildren.length === 0) {
                    return null;
                  }
                  
                  // Use visibleChildren for rendering
                  navItem = { ...navItem, children: visibleChildren };
                }

                const hasChildren = navItem.children && navItem.children.length > 0;

                if (hasChildren) {
                  // Check if any child is active
                  const isChildActive = navItem.children.some((child: any) => {
                    let route = child.screen;
                    if (route === 'Dashboard') route = '/';
                    else if (!route.startsWith('/')) route = `/${route.toLowerCase()}`;
                    return pathname === route || (route !== '/' && pathname.startsWith(route));
                  });

                  return (
                    <View key={idx}>
                      <List.Item
                        title={navItem.label}
                        left={props => <List.Icon {...props} icon={navItem.icon} color={isChildActive ? theme.colors.primary : props.color} />}
                        right={props => <List.Icon {...props} icon={expandedItems[navItem.label] ? "chevron-up" : "chevron-down"} color={isChildActive ? theme.colors.primary : props.color} />}
                        onPress={() => toggleExpand(navItem.label)}
                        titleStyle={{ color: isChildActive ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: isChildActive ? 'bold' : 'normal' }}
                        style={{ paddingVertical: spacing.sm }}
                      />
                      <CollapsibleSection expanded={!!expandedItems[navItem.label]}>
                        <View style={{ paddingLeft: spacing.md, marginTop: 4 }}>
                          {navItem.children.map((child: any, childIdx: number) => renderDrawerItem(child, childIdx))}
                        </View>
                      </CollapsibleSection>
                    </View>
                  );
                }

                // Determine if active based on pathname
                // Simple check: if pathname starts with the route derived from screen
                let route = navItem.screen;
                if (route === 'Dashboard') route = '/';
                else if (!route.startsWith('/')) route = `/${route.toLowerCase()}`;
                
                const isActive = pathname === route || (route !== '/' && pathname.startsWith(route));

                return (
                  <Drawer.Item
                    key={idx}
                    label={navItem.label}
                    icon={navItem.icon}
                    active={isActive}
                    onPress={() => handleNavigate(navItem.screen)}
                    style={{ marginBottom: spacing.xs, paddingVertical: spacing.xs }}
                  />
                );
              };

              return renderDrawerItem(item, index);
            })}
            </Drawer.Section>
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
            <Divider />
            <Drawer.Item
              label={isSyncing ? 'Syncing...' : 'Sync Data'}
              icon={isSyncing ? 'loading' : 'sync'}
              onPress={handleSync}
              disabled={isSyncing}
            />
            <Drawer.Item
              label="Logout"
              icon="logout"
              onPress={handleLogout}
            />
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: zIndex.drawer,
    elevation: zIndex.drawer,
  },
  containerClosed: {
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  section: {
    flex: 1,
    marginTop: spacing.sm,
  },
  footer: {
    marginBottom: 0,
    paddingBottom: spacing.sm,
    elevation: 4,
    zIndex: 1,
  },
});
