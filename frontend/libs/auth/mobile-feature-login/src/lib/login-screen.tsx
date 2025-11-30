import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, Title, useTheme } from 'react-native-paper';
import { useLogin } from '@rootstock/auth/data-access';

export const LoginScreen = () => {
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
          console.log('Mobile Login Success');
        },
        onError: (error) => {
          console.error('Mobile Login Failed', error);
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title style={styles.title}>Welcome to RootStock</Title>
      
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
        mode="contained" 
        onPress={handleLogin} 
        loading={loginMutation.isPending}
        style={styles.button}
      >
        Sign In
      </Button>

      {validationError && (
        <Text style={styles.error}>{validationError}</Text>
      )}

      {loginMutation.isError && !validationError && (
        <Text style={styles.error}>
          {loginMutation.error?.message || 'Login failed. Please try again.'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 24,
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
    marginTop: 15,
  },
});
