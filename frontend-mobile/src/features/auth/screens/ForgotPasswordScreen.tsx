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
import { useRouter } from 'expo-router';
import { useAuthSession } from '@/src/core/auth/hooks/useAuthSession';

const spacing = {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const ForgotPasswordScreen = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { forgotPassword } = useAuthSession();
    const theme = useTheme();

    const handleReset = async () => {
        setError(null);
        if (!email) {
            setError('Email is required');
            return;
        }
        // Simple email regex
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setError('Invalid email format');
            return;
        }

        setLoading(true);
        try {
            await forgotPassword(email);
            Alert.alert(
                'Email Sent',
                'If an account exists with this email, you will receive password reset instructions.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (err: any) {
            console.error('Forgot Password Failed', err);
            // Don't reveal if email exists or not for security, but commonly users want to know if it failed technically.
            setError('Failed to process request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Appbar.Header style={{ backgroundColor: 'transparent' }}>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title="Forgot Password" />
            </Appbar.Header>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <Text variant="titleLarge" style={[styles.title, { color: theme.colors.primary }]}>
                        Reset Password
                    </Text>
                    <Text
                        style={[
                            styles.description,
                            { color: theme.colors.onSurfaceVariant },
                        ]}
                    >
                        Enter your email address and we'll send you a link to reset your
                        password.
                    </Text>

                    <TextInput
                        label="Email"
                        value={email}
                        onChangeText={(text) => {
                            setEmail(text);
                            setError(null);
                        }}
                        mode="outlined"
                        style={styles.input}
                        autoCapitalize="none"
                        keyboardType="email-address"
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
                        Send Reset Link
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
