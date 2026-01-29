import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { TextInput, Button, Text, useTheme, Appbar } from 'react-native-paper';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { useAuthSession } from '@/src/core/auth/hooks/useAuthSession';

const spacing = {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const ResetPasswordScreen = () => {
    const router = useRouter();
    const { token } = useLocalSearchParams<{ token: string }>();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { resetPassword } = useAuthSession();
    const theme = useTheme();

    const handleReset = async () => {
        setError(null);
        if (!token) {
            setError('Invalid or missing reset token.');
            return;
        }
        if (!password) {
            setError('Password is required');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await resetPassword(token, password);
            Alert.alert(
                'Success',
                'Your password has been reset. Please login with your new password.',
                [{ text: 'Login', onPress: () => router.replace('/login' as Href) }]
            );
        } catch (err: any) {
            console.error('Reset Password Failed', err);
            setError('Failed to reset password. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Appbar.Header style={{ backgroundColor: 'transparent' }}>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title="Set New Password" />
            </Appbar.Header>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <Text variant="titleLarge" style={[styles.title, { color: theme.colors.primary }]}>
                        Create New Password
                    </Text>
                    <Text
                        style={[
                            styles.description,
                            { color: theme.colors.onSurfaceVariant },
                        ]}
                    >
                        Please enter your new password below.
                    </Text>

                    <TextInput
                        label="New Password"
                        value={password}
                        onChangeText={(text) => {
                            setPassword(text);
                            setError(null);
                        }}
                        mode="outlined"
                        secureTextEntry
                        style={styles.input}
                        error={!!error}
                    />

                    <TextInput
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={(text) => {
                            setConfirmPassword(text);
                            setError(null);
                        }}
                        mode="outlined"
                        secureTextEntry
                        style={styles.input}
                        error={!!error}
                    />

                    {error && (
                        <Text style={[styles.error, { color: theme.colors.error }]}>
                            {error}
                        </Text>
                    )}

                    <Button
                        mode="contained"
                        onPress={handleReset}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                        contentStyle={{ height: 48 }}
                    >
                        Reset Password
                    </Button>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: spacing.lg,
        paddingTop: spacing.xl,
    },
    title: {
        marginBottom: spacing.sm,
        fontWeight: 'bold',
    },
    description: {
        marginBottom: spacing.xl,
        lineHeight: 20,
    },
    input: {
        marginBottom: spacing.md,
    },
    button: {
        marginTop: spacing.sm,
    },
    error: {
        marginBottom: spacing.md,
        textAlign: 'center',
    },
});
