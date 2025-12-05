import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { Drawer, useTheme, Text, Avatar, Divider } from 'react-native-paper';
import { useDrawer } from '@rootstock/ui/mobile';
import { useAuth } from '@rootstock/auth/auth-data-access';
import { SafeAreaView } from 'react-native-safe-area-context';

const DRAWER_WIDTH = 280;

interface AppDrawerProps {
  navigationRef: any;
  currentRoute?: string;
}

export const AppDrawer = ({ navigationRef, currentRoute }: AppDrawerProps) => {
  const { isOpen, closeDrawer } = useDrawer();
  const { logout, user } = useAuth();
  const theme = useTheme();
  
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
    if (navigationRef?.isReady()) {
      navigationRef.navigate(screen);
    }
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

  // If drawer is closed and animation finished, don't render to allow clicks through
  // But we need to keep it mounted for animation. 
  // We'll use pointerEvents on the container.

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
            <Drawer.Item
              label="Dashboard"
              icon="view-dashboard"
              active={currentRoute === 'Dashboard'}
              onPress={() => handleNavigate('Dashboard')}
            />
            <Drawer.Item
              label="Clients"
              icon="domain"
              active={currentRoute === 'ClientsList'}
              onPress={() => handleNavigate('ClientsList')}
            />
            <Drawer.Item
              label="Users"
              icon="account-group"
              active={currentRoute === 'UsersList'}
              onPress={() => handleNavigate('UsersList')}
            />
            <Drawer.Item
              label="Roles"
              icon="shield-account"
              active={currentRoute === 'RolesList'}
              onPress={() => handleNavigate('RolesList')}
            />
            <Drawer.Item
              label="Settings"
              icon="cog"
              active={currentRoute === 'Settings'}
              onPress={() => handleNavigate('Settings')}
            />
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
    // When closed, we want to make sure it doesn't block touches, 
    // but we handle that with pointerEvents='none' on the root View.
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
