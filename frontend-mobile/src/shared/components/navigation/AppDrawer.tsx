import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Drawer, Text, Avatar, useTheme, Divider, List, IconButton } from 'react-native-paper';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { useDrawer } from '@/src/core/contexts/DrawerContext';
import { MENU_ITEMS, MenuItem } from '@/src/core/navigation/menu-config';
import { useSafeLogout } from '@/src/features/auth/hooks/useSafeLogout';

// Temporary Mock for Auth Context - replace with actual later
const useAuth = () => ({
    user: {
        name: 'John Doe',
        role: 'Farm Manager',
        email: 'john.doe@rootstock.com',
    },
    logout: () => console.log('Mock Logout'),
});

const DrawerContent = () => {
    const router = useRouter();
    const pathname = usePathname();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { closeDrawer } = useDrawer();
    const { user } = useAuth();
    const { handleLogout } = useSafeLogout();

    // State for expanded accordions
    const [expandedId, setExpandedId] = React.useState<string | null>(null);

    const handlePress = (route: string) => {
        if (route) {
            router.push(route as any);
            closeDrawer();
        }
    };

    const handleAccordionPress = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    }

    const renderMenuItem = (item: MenuItem) => {
        const isActive = pathname === item.route;

        if (item.children && item.children.length > 0) {
            return (
                <List.Accordion
                    key={item.id}
                    title={item.label}
                    left={props => <List.Icon {...props} icon={item.icon} />}
                    expanded={expandedId === item.id}
                    onPress={() => handleAccordionPress(item.id)}
                    style={{ backgroundColor: theme.colors.surface }}
                >
                    {item.children.map(child => {
                        const isChildActive = pathname === child.route;
                        return (
                            <Drawer.Item
                                key={child.id}
                                label={child.label}
                                icon={child.icon}
                                active={isChildActive}
                                onPress={() => handlePress(child.route)}
                                style={[
                                    styles.nestedItem,
                                    isChildActive ? { backgroundColor: theme.colors.secondaryContainer } : {}
                                ]}
                            />
                        );
                    })}
                </List.Accordion>
            )
        }

        return (
            <Drawer.Item
                key={item.id}
                label={item.label}
                icon={item.icon}
                active={isActive}
                onPress={() => handlePress(item.route)}
                style={isActive ? { backgroundColor: theme.colors.secondaryContainer } : {}}
            />
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.surface }]}>

            {/* Header Section */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Avatar.Text size={50} label={user.name.charAt(0)} />
                    <View style={styles.userDetails}>
                        <Text variant="titleMedium">{user.name}</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>{user.role}</Text>
                    </View>
                </View>
                <IconButton icon="close" onPress={closeDrawer} />
            </View>

            <Divider />

            {/* Scrollable Menu Items */}
            <View style={styles.content}>
                <Drawer.Section showDivider={false}>
                    {MENU_ITEMS.map(renderMenuItem)}
                </Drawer.Section>
            </View>

            <Divider />

            {/* Footer Section */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <Drawer.Item
                    label="Logout"
                    icon="logout"
                    onPress={handleLogout}
                />
                <View style={styles.versionContainer}>
                    <Text variant="labelSmall" style={{ color: theme.colors.outline }}>v1.0.0 (Build 100)</Text>
                </View>
            </View>
        </View>
    );
};

const AppDrawerOverlay = () => {
    const { isOpen, closeDrawer } = useDrawer();

    return (
        <View
            style={[styles.overlayContainer, !isOpen && styles.hiddenOverlay]}
            pointerEvents={isOpen ? "auto" : "none"}
        >
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <Animated.View
                        style={styles.backdrop}
                        entering={FadeIn}
                        exiting={FadeOut}
                    >
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={closeDrawer}
                        />
                    </Animated.View>

                    {/* Drawer Content - Width 80% */}
                    <Animated.View
                        style={styles.drawerWrapper}
                        entering={SlideInLeft}
                        exiting={SlideOutLeft}
                    >
                        <DrawerContent />
                    </Animated.View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
        elevation: 10, // Android
        flexDirection: 'row',
    },
    hiddenOverlay: {
        zIndex: -1,
        elevation: 0,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    drawerWrapper: {
        width: '80%',
        maxWidth: 320,
        height: '100%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    userDetails: {
        flexDirection: 'column',
    },
    content: {
        flex: 1,
        paddingTop: 10
    },
    footer: {
        paddingTop: 10,
    },
    versionContainer: {
        paddingLeft: 28,
        paddingTop: 8,
        alignItems: 'center',
    },
    nestedItem: {
        paddingLeft: 32,
    }
});

export default AppDrawerOverlay;
