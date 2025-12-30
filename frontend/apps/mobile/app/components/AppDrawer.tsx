import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableWithoutFeedback } from 'react-native';
import { Drawer, useTheme, Text, Avatar, Divider, List } from 'react-native-paper';
import { useDrawer } from '@rootstock/ui/mobile';
import { useAuth, usePermission } from '@rootstock/auth/auth-data-access';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { NAVIGATION_ITEMS } from '../config/navigation';

const DRAWER_WIDTH = 280;

export const AppDrawer = () => {
  const { isOpen, closeDrawer } = useDrawer();
  const { logout, user } = useAuth();
  const { hasPermission } = usePermission();
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  
  // Animation value: 0 = closed, 1 = open
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
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

  const handleLogout = () => {
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

          <Drawer.Section showDivider={false} style={styles.section}>
            {NAVIGATION_ITEMS.map((item, index) => {
              const renderDrawerItem = (navItem: any, idx: number) => {
                // Check permission for the item itself
                if (navItem.permission && !hasPermission(navItem.permission)) {
                  return null;
                }

                // If it has children, check if user has permission for at least one child
                if (navItem.children && navItem.children.length > 0) {
                  const visibleChildren = navItem.children.filter((child: any) => 
                    !child.permission || hasPermission(child.permission)
                  );
                  
                  if (visibleChildren.length === 0) {
                    return null;
                  }
                  
                  // Use visibleChildren for rendering
                  navItem = { ...navItem, children: visibleChildren };
                }

                const hasChildren = navItem.children && navItem.children.length > 0;

                if (hasChildren) {
                  return (
                    <List.Accordion
                      key={idx}
                      title={navItem.label}
                      left={props => <List.Icon {...props} icon={navItem.icon} />}
                      expanded={true}
                      style={{ paddingVertical: 0, backgroundColor: 'transparent' }}
                      titleStyle={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {navItem.children.map((child: any, childIdx: number) => renderDrawerItem(child, childIdx))}
                    </List.Accordion>
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
                  />
                );
              };

              return renderDrawerItem(item, index);
            })}
          </Drawer.Section>

          <View style={styles.footer}>
            <Divider />
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
    zIndex: 1000,
    elevation: 1000,
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
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  section: {
    flex: 1,
    marginTop: 8,
  },
  footer: {
    marginBottom: 8,
  },
});
