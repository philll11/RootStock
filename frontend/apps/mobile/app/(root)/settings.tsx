import React from 'react';
import { View, StyleSheet } from 'react-native';
import { List, RadioButton, Appbar, useTheme } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { useGetProfile } from '@rootstock/iam/auth/auth-data-access';
import { useUpdateUser } from '@rootstock/iam/users/users-data-access';
import { useDrawer } from '@rootstock/ui/mobile';
import { AppTheme } from '@rootstock/ui/mobile';

export default function SettingsScreen() {
  const { data: user } = useGetProfile();
  const { mutateAsync: updateUser } = useUpdateUser();
  const { toggleDrawer } = useDrawer();
  const paperTheme = useTheme<AppTheme>();
  const queryClient = useQueryClient();
  const theme = user?.preferences?.theme || 'auto';

  const handleThemeChange = async (value: string) => {
    if (user) {
      try {
        await updateUser({
          id: user._id,
          data: { 
            preferences: { theme: value as 'light' | 'dark' | 'auto' },
            __v: user.__v
          }
        });
        await queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
      } catch (error) {
        console.error('Failed to update theme', error);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <Appbar.Header>
        <Appbar.Action icon="menu" onPress={toggleDrawer} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>
      
      <List.Section title="Appearance">
        <RadioButton.Group onValueChange={handleThemeChange} value={theme}>
          <List.Item
            title="System Default"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => <RadioButton value="auto" disabled={!user} />}
            onPress={() => handleThemeChange('auto')}
            disabled={!user}
          />
          <List.Item
            title="Light"
            left={(props) => <List.Icon {...props} icon="white-balance-sunny" />}
            right={() => <RadioButton value="light" disabled={!user} />}
            onPress={() => handleThemeChange('light')}
            disabled={!user}
          />
          <List.Item
            title="Dark"
            left={(props) => <List.Icon {...props} icon="weather-night" />}
            right={() => <RadioButton value="dark" disabled={!user} />}
            onPress={() => handleThemeChange('dark')}
            disabled={!user}
          />
        </RadioButton.Group>
      </List.Section>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
