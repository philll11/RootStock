import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Appbar, TextInput, Button, Switch, Text, useTheme, HelperText, SegmentedButtons, Chip, Modal, Portal, List, Searchbar } from 'react-native-paper';
import { useUsers, CreateUserDto, UpdateUserDto, UserType } from '@rootstock/users/users-data-access';
import { useClients, searchClients } from '@rootstock/clients/clients-data-access';
import { useMobileDiscardWarning } from '@rootstock/ui/mobile';

export const UserFormScreen = ({ navigation, route }: any) => {
  const theme = useTheme();
  const { userId } = route.params || {};
  const isEditing = !!userId;
  
  const { getUser, createUser, updateUser, deleteUser, isCreating, isUpdating } = useUsers();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState<UserType>(UserType.Employee);
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [availableClients, setAvailableClients] = useState<{_id: string, name: string}[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{firstName?: string; lastName?: string; email?: string; password?: string}>({});

  // Load user data if editing
  useEffect(() => {
    if (isEditing) {
      setIsLoading(true);
      getUser(userId)
        .then(user => {
          setFirstName(user.firstName);
          setLastName(user.lastName);
          setEmail(user.email);
          setUserType(user.userType);
          setIsActive(user.isActive);
          setClientIds(user.clientIds || []);
          setIsLoading(false);
          // Reset dirty state after loading
          setTimeout(() => setIsDirty(false), 100);
        })
        .catch(err => {
          console.error(err);
          Alert.alert('Error', 'Failed to load user details');
          navigation.goBack();
        });
    }
  }, [userId, isEditing]);

  // Load clients for selection
  useEffect(() => {
    if (clientModalVisible) {
      searchClients(clientSearchQuery).then(setAvailableClients);
    }
  }, [clientModalVisible, clientSearchQuery]);

  // Track dirty state
  const handleChange = (setter: (val: any) => void, value: any, field: string) => {
    setter(value);
    setIsDirty(true);
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Enable discard warning
  useMobileDiscardWarning(isDirty && !isSubmitting);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+$/.test(email)) newErrors.email = 'Invalid email';
    
    if (!isEditing && !password) newErrors.password = 'Password is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateUser({ 
          id: userId, 
          data: { 
            firstName, 
            lastName, 
            email, 
            userType, 
            isActive,
            clientIds
          } 
        });
      } else {
        await createUser({ 
          firstName, 
          lastName, 
          email, 
          userType, 
          password,
          isActive,
          clientIds
        });
      }
      // Reset dirty state so we can navigate back without warning
      setIsDirty(false);
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save user');
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(userId);
              setIsDirty(false);
              navigation.goBack();
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const toggleClient = (id: string) => {
    const newClientIds = clientIds.includes(id)
      ? clientIds.filter(c => c !== id)
      : [...clientIds, id];
    handleChange(setClientIds, newClientIds, 'clientIds');
  };

  const isSaving = isCreating || isUpdating;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isEditing ? 'Edit User' : 'New User'} />
        {isEditing && (
          <Appbar.Action icon="delete" onPress={handleDelete} color={theme.colors.error} />
        )}
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          mode="outlined"
          label="First Name"
          value={firstName}
          onChangeText={(val) => handleChange(setFirstName, val, 'firstName')}
          error={!!errors.firstName}
          style={styles.input}
        />
        {errors.firstName && <HelperText type="error">{errors.firstName}</HelperText>}

        <TextInput
          mode="outlined"
          label="Last Name"
          value={lastName}
          onChangeText={(val) => handleChange(setLastName, val, 'lastName')}
          error={!!errors.lastName}
          style={styles.input}
        />
        {errors.lastName && <HelperText type="error">{errors.lastName}</HelperText>}

        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={(val) => handleChange(setEmail, val, 'email')}
          error={!!errors.email}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        {errors.email && <HelperText type="error">{errors.email}</HelperText>}

        {!isEditing && (
          <>
            <TextInput
              mode="outlined"
              label="Password"
              value={password}
              onChangeText={(val) => handleChange(setPassword, val, 'password')}
              error={!!errors.password}
              secureTextEntry
              style={styles.input}
            />
            {errors.password && <HelperText type="error">{errors.password}</HelperText>}
          </>
        )}

        <Text variant="bodyMedium" style={styles.label}>User Type</Text>
        <SegmentedButtons
          value={userType}
          onValueChange={(val) => handleChange(setUserType, val as UserType, 'userType')}
          buttons={[
            { value: UserType.Employee, label: 'Employee', disabled: isEditing },
            { value: UserType.Contact, label: 'Contact', disabled: isEditing },
          ]}
          style={styles.input}
        />

        <Text variant="bodyMedium" style={styles.label}>Clients</Text>
        <View style={styles.chipContainer}>
          {clientIds.map(id => {
             // We might not have the name loaded if we haven't opened the modal, 
             // but for now let's just show the ID or try to find it in availableClients if loaded
             // Ideally we would fetch the names on load.
             const client = availableClients.find(c => c._id === id);
             return (
               <Chip key={id} onClose={() => toggleClient(id)} style={styles.chip}>
                 {client?.name || 'Client ' + id.substring(0, 4)}
               </Chip>
             );
          })}
          <Chip icon="plus" onPress={() => setClientModalVisible(true)} style={styles.chip}>Add Client</Chip>
        </View>

        {isEditing && (
          <View style={styles.switchContainer}>
            <Text variant="bodyLarge">Active</Text>
            <Switch value={isActive} onValueChange={(val) => handleChange(setIsActive, val, 'isActive')} />
          </View>
        )}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving || isLoading}
          style={styles.button}
        >
          Save
        </Button>
      </ScrollView>

      <Portal>
        <Modal visible={clientModalVisible} onDismiss={() => setClientModalVisible(false)} contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          <Text variant="titleMedium" style={{ marginBottom: 16 }}>Select Clients</Text>
          <Searchbar
            placeholder="Search clients"
            onChangeText={setClientSearchQuery}
            value={clientSearchQuery}
            style={{ marginBottom: 16 }}
          />
          <ScrollView style={{ maxHeight: 300 }}>
            {availableClients.map(client => (
              <List.Item
                key={client._id}
                title={client.name}
                right={props => clientIds.includes(client._id) ? <List.Icon {...props} icon="check" /> : null}
                onPress={() => toggleClient(client._id)}
              />
            ))}
          </ScrollView>
          <Button onPress={() => setClientModalVisible(false)} style={{ marginTop: 16 }}>Done</Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  input: { marginBottom: 8 },
  label: { marginTop: 8, marginBottom: 4 },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  button: { marginTop: 24 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  chip: { margin: 4 },
  modalContent: { padding: 20, margin: 20, borderRadius: 8 }
});
