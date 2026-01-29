import React from 'react';
import { Stack } from 'expo-router';
import { Appbar } from 'react-native-paper';
import { useDrawer } from '@/src/core/contexts/DrawerContext';

export default function AppLayout() {
    const { openDrawer } = useDrawer();

    return (
        <Stack
            screenOptions={{
                header: ({ options, route, navigation, back }) => (
                    <Appbar.Header elevated>
                        {back ? (
                            <Appbar.BackAction onPress={navigation.goBack} />
                        ) : (
                            <Appbar.Action icon="menu" onPress={openDrawer} />
                        )}
                        <Appbar.Content title={options.title || route.name} />
                    </Appbar.Header>
                ),
            }}
        >
            <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
            <Stack.Screen name="orchards" options={{ title: 'Orchards' }} />
        </Stack>
    );
}
