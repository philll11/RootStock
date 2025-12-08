import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, Title, useTheme, Appbar } from 'react-native-paper';
import { AuthService } from '@rootstock/auth/auth-data-access';

export const ForgotPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  const handleReset = async () => {
    setError(null);
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!/^\S+@\S+$/.test(email)) {
      setError('Invalid email format');
      return;
    }

    setLoading(true);
    try {
      await AuthService.forgotPassword(email);
      Alert.alert(
        'Email Sent',
        'If an account exists with this email, you will receive password reset instructions.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      console.error('Forgot Password Failed', err);
      // For security reasons, we might not want to show specific errors, 
      // but for now let's show a generic one or the error message if it's safe.
      setError('Failed to process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Forgot Password" />
      </Appbar.Header>

      <View style={styles.content}>
        <Title style={styles.title}>Reset Password</Title>
        <Text style={styles.description}>
          Enter your email address and we'll send you a link to reset your password.
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
          <Text style={styles.error}>{error}</Text>
        )}

        <Button 
          mode="contained" 
          onPress={handleReset} 
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Send Reset Link
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 24,
  },
  description: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 15,
  },
});
