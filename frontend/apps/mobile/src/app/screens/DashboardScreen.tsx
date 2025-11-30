import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, Text, Button, Card, useTheme } from 'react-native-paper';
import { useAuth } from '@rootstock/auth/data-access';
import { useDrawer } from '@rootstock/ui/mobile';

export const DashboardScreen = ({ navigation }: any) => {
  const { logout } = useAuth();
  const { toggleDrawer } = useDrawer();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.Action icon="menu" onPress={toggleDrawer} />
        <Appbar.Content title="RootStock" />
        <Appbar.Action icon="account-circle" onPress={() => navigation.navigate('Profile')} />
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
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
});
