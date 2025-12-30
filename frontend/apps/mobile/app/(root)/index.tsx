import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, Text, Card, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@rootstock/auth/auth-data-access';
import { useDrawer } from '@rootstock/ui/mobile';
import { spacing } from '@rootstock/ui/theme';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { toggleDrawer } = useDrawer();
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.Action icon="menu" onPress={toggleDrawer} />
        <Appbar.Content title="RootStock" />
        <Appbar.Action icon="account-circle" onPress={() => router.push('/profile')} />
      </Appbar.Header>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge">Welcome Back!</Text>
            <Text variant="bodyMedium" style={{ marginTop: spacing.sm }}>
              Logged in as {user?.name}
            </Text>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
});
