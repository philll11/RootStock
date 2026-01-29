import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import { useRouter, Href } from 'expo-router';

export default function Dashboard() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Surface style={styles.card} elevation={2}>
                <Text variant="headlineMedium" style={styles.title}>Dashboard</Text>
                <Text variant="bodyLarge">Welcome to RootStock Mobile v2</Text>

                <View style={styles.spacing} />

                <Text variant="bodyMedium">
                    The navigation drawer is now available in the top-left corner.
                </Text>

                <Button
                    mode="contained"
                    onPress={() => router.push('/(root)/orchards' as Href)}
                    style={{ marginTop: 20 }}
                >
                    Go to Orchards
                </Button>
            </Surface>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    card: {
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: 'white',
    },
    title: {
        marginBottom: 10,
        fontWeight: 'bold',
    },
    spacing: {
        height: 20,
    }
});
