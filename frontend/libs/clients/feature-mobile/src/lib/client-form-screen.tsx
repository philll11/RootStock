import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Appbar, TextInput, Button, Switch, Text, useTheme, HelperText } from 'react-native-paper';
import { useClients, CreateClientDto, UpdateClientDto } from '@rootstock/clients/clients-data-access';
import { useMobileDiscardWarning } from '@rootstock/ui/mobile';

export const ClientFormScreen = ({ navigation, route }: any) => {
  const theme = useTheme();
  const { clientId } = route.params || {};
  const isEditing = !!clientId;
  
  const { getClient, createClient, updateClient, deleteClient, isCreating, isUpdating, isDeleting } = useClients();
  
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{name?: string}>({});

  // Load client data if editing
  useEffect(() => {
    if (isEditing) {
      setIsLoading(true);
      getClient(clientId)
        .then(client => {
          setName(client.name);
          setIsActive(client.isActive);
          setIsLoading(false);
          // Reset dirty state after loading
          setTimeout(() => setIsDirty(false), 100);
        })
        .catch(err => {
          console.error(err);
          Alert.alert('Error', 'Failed to load client details');
          navigation.goBack();
        });
    }
  }, [clientId, isEditing]);

  // Track dirty state
  const handleNameChange = (text: string) => {
    setName(text);
    setIsDirty(true);
    if (text.trim().length > 0) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleActiveChange = (value: boolean) => {
    setIsActive(value);
    setIsDirty(true);
  };

  // Enable discard warning
  useMobileDiscardWarning(isDirty && !isSubmitting);

  const validate = () => {
    const newErrors: {name?: string} = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateClient({ id: clientId, data: { name, isActive } });
      } else {
        await createClient({ name });
      }
      // Reset dirty state so we can navigate back without warning
      setIsDirty(false);
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save client');
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Client',
      'Are you sure you want to delete this client? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClient(clientId);
              setIsDirty(false);
              navigation.goBack();
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to delete client');
            }
          }
        }
      ]
    );
  };

  const isSaving = isCreating || isUpdating;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isEditing ? 'Edit Client' : 'New Client'} />
        {isEditing && (
          <Appbar.Action icon="delete" onPress={handleDelete} color={theme.colors.error} />
        )}
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          mode="outlined"
          label="Name"
          value={name}
          onChangeText={handleNameChange}
          error={!!errors.name}
          style={styles.input}
        />
        {errors.name && <HelperText type="error">{errors.name}</HelperText>}

        {isEditing && (
          <View style={styles.switchContainer}>
            <Text variant="bodyLarge">Active</Text>
            <Switch value={isActive} onValueChange={handleActiveChange} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  input: { marginBottom: 8 },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  button: { marginTop: 24 },
});
