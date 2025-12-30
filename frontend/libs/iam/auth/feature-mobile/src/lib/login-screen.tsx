import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useLogin } from '@rootstock/auth/auth-data-access';
import { spacing } from '@rootstock/ui/theme';

export const LoginScreen = ({ navigation }: any) => {
  const [username, setUsername] = useState('leo.phil.work@gmail.com');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const loginMutation = useLogin();
  const theme = useTheme();

  const handleLogin = () => {
    setValidationError(null);
    if (!username) {
      setValidationError('Email is required');
      return;
    }
    if (!password) {
      setValidationError('Password is required');
      return;
    }

    loginMutation.mutate(
      { username, password },
      {
        onSuccess: () => {
          // Navigation handled by App.tsx observing auth state
        },
        onError: (error) => {
          console.error('Mobile Login Failed', error);
        },
      }
    );
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
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotPasswordButton}
          compact
        >
          Forgot Password?
        </Button>

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loginMutation.isPending}
          style={styles.button}
          contentStyle={{ height: 48 }} // Ensure touch target size
        >
          Sign In
        </Button>

        {validationError && (
          <Text style={[styles.error, { color: theme.colors.error }]}>
            {validationError}
          </Text>
        )}

        {loginMutation.isError && !validationError && (
          <Text style={[styles.error, { color: theme.colors.error }]}>
            {(loginMutation.error as any)?.response?.status === 401
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
    backgroundColor: 'transparent',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.sm,
    borderRadius: 8,
  },
  error: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
