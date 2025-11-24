import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, Title } from 'react-native-paper';
import { useLogin } from '@rootstock/core';

export const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  const handleLogin = () => {
    loginMutation.mutate(
      { username, password },
      {
        onSuccess: () => {
          console.log('Mobile Login Success');
          // TODO: Navigate to Home
        },
        onError: (error) => {
          console.error('Mobile Login Failed', error);
        },
      }
    );
  };

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Welcome to RootStock</Title>
      
      <TextInput
        label="Username"
        value={username}
        onChangeText={setUsername}
        mode="outlined"
        style={styles.input}
        autoCapitalize="none"
      />
      
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        secureTextEntry
        style={styles.input}
      />

      <Button 
        mode="contained" 
        onPress={handleLogin} 
        loading={loginMutation.isPending}
        style={styles.button}
      >
        Sign In
      </Button>

      {loginMutation.isError && (
        <Text style={styles.error}>Login failed. Please try again.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
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
