// frontend/apps/mobile/src/app/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Appbar, HelperText, useTheme } from 'react-native-paper';
import { useAuth, setSuppressSessionExpiry } from '@rootstock/auth/auth-data-access';
import { useUsers, UpdateUserDto } from '@rootstock/users/users-data-access';
import { spacing } from '@rootstock/ui/theme';

export const ProfileScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const { updateUser, isUpdating } = useUsers();
  const theme = useTheme();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
    }
  }, [user]);

  const handleSavePress = () => {
    if (password) {
      Alert.alert(
        "Update Password?",
        "Are you sure you want to update your password? You will be required to log in again on all devices.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          { 
            text: "Update Password", 
            onPress: executeUpdate 
          }
        ]
      );
    } else {
      executeUpdate();
    }
  };

  const executeUpdate = async () => {
    if (!user) return;

    const updateData: UpdateUserDto = {
      firstName,
      lastName,
      email,
    };

    if (password) {
      updateData.password = password;
      setSuppressSessionExpiry(true);
    }

    try {
      await updateUser({ id: user._id, data: updateData });
      
      if (password) {
        await logout();
        setSuppressSessionExpiry(false);
        return;
      }

      setPassword('');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to update profile', error);
      setSuppressSessionExpiry(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Edit Profile" />
      </Appbar.Header>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <TextInput
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <TextInput
            label="New Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry
            placeholder="Leave blank to keep current"
          />
          <HelperText type="info">
            Leave password blank to keep current password.
          </HelperText>

          <Button 
            mode="contained" 
            onPress={handleSavePress} 
            loading={isUpdating} 
            style={styles.button}
          >
            Save Changes
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
    padding: spacing.md,
  },
  input: {
    marginBottom: spacing.sm,
  },
  button: {
    marginTop: spacing.md,
  },
});