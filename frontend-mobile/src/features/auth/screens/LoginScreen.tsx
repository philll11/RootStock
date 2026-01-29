import React, { useState } from 'react';
import {
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useRouter, Href } from 'expo-router';
import { useAuthSession } from '@/src/core/auth/hooks/useAuthSession';
// Assuming we have a standard spacing/theme or just direct native styles for now if not ported
// import { spacing } from '@rootstock/ui/theme'; 
// Use local constatns if spacing is not available yet.

const spacing = {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const LoginScreen = () => {
    const router = useRouter();
    const [username, setUsername] = useState('leo.phil.work@gmail.com');
    const [password, setPassword] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const { login, isLoading, error } = useAuthSession();
    const theme = useTheme();

    const handleLogin = async () => {
        setValidationError(null);
        if (!username) {
            setValidationError('Email is required');
            return;
        }
        if (!password) {
            setValidationError('Password is required');
            return;
        }

        try {
            await login({ username, password });
            // Navigation is usually handled by `app/_layout.tsx` reacting to isAuthenticated change
            // But we can also replace route if needed. 
            // Ideally _layout redirects.
        } catch (err: any) {
            console.error('Mobile Login Failed', err);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView
                contentContainerStyle={[
                    styles.container,
                    { backgroundColor: theme.colors.background },
                ]}
                keyboardShouldPersistTaps="handled"
            >
                <Text
                    variant="titleLarge"
                    style={[styles.title, { color: theme.colors.primary }]}
                >
                    RootStock
                </Text>
                <Text
                    style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
                >
                    Field Management
                </Text>

                <TextInput
                    label="Email"
                    value={username}
                    onChangeText={(text) => {
                        setUsername(text);
                        setValidationError(null);
                    }}
                    mode="outlined"
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    error={!!validationError && !username}
                />

                <TextInput
                    label="Password"
                    value={password}
                    onChangeText={(text) => {
                        setPassword(text);
                        setValidationError(null);
                    }}
                    mode="outlined"
                    secureTextEntry
                    style={styles.input}
                    error={!!validationError && !password}
                />

                <Button
                    mode="text"
                    onPress={() => router.push('/forgot-password' as Href)}
                    style={styles.forgotPasswordButton}
                    compact
                >
                    Forgot Password?
                </Button>

                <Button
                    mode="contained"
                    onPress={handleLogin}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.button}
                    contentStyle={{ height: 48 }}
                >
                    Sign In
                </Button>

                {validationError && (
                    <Text style={[styles.error, { color: theme.colors.error }]}>
                        {validationError}
                    </Text>
                )}

                {error && !validationError && (
                    <Text style={[styles.error, { color: theme.colors.error }]}>
                        {(error as any)?.response?.status === 401
                            ? 'Invalid username or password'
                            : 'Login failed. Please try again.'}
                    </Text>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    title: {
        textAlign: 'center',
        fontSize: 32,
        fontWeight: 'bold',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: spacing.xl,
        fontSize: 16,
    },
    input: {
        marginBottom: spacing.md,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginBottom: spacing.md,
    },
    button: {
        marginTop: spacing.sm,
    },
    error: {
        marginTop: spacing.md,
        textAlign: 'center',
    },
});
