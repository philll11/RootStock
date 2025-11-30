import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, Text, Button, Card } from 'react-native-paper';
import { useAuth } from '@rootstock/auth/data-access';

export const DashboardScreen = () => {
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="RootStock" />
        <Appbar.Action icon="logout" onPress={logout} />
      </Appbar.Header>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge">Welcome Back!</Text>
            <Text variant="bodyMedium">You are successfully logged in.</Text>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
});
