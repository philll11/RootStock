import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Appbar, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth, setSuppressSessionExpiry } from '@rootstock/auth/auth-data-access';
import { useUsers, UpdateUserDto } from '@rootstock/users/users-data-access';
import { spacing } from '@rootstock/ui/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { updateUser, isUpdating } = useUsers();
  const theme = useTheme();
  const router = useRouter();

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
      __v: user.__v,
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
      router.back();
    } catch (error) {
      console.error('Failed to update profile', error);
      setSuppressSessionExpiry(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
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
            label="New Password (Optional)"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />

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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.md,
  },
});
