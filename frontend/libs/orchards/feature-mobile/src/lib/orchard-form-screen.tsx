import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, FlatList } from 'react-native';
import { Appbar, TextInput, Button, Switch, Text, useTheme, HelperText, ActivityIndicator, Portal, Modal, List, Searchbar, Checkbox } from 'react-native-paper';
import { useOrchards, CreateOrchardDto } from '@rootstock/orchards/orchards-data-access';
import { useClients } from '@rootstock/clients/clients-data-access';
import { useUsers } from '@rootstock/users/users-data-access';
import { useMobileDiscardWarning, DetailRow } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

// Draft state outside component to persist across navigation
let createFormDraft: Partial<CreateOrchardDto> = {};

export function OrchardFormScreen({ navigation, route }: any) {
  const theme = useTheme();
  const { orchardId } = route.params || {};
  const isEditing = !!orchardId;

  const { getOrchard, createOrchard, updateOrchard } = useOrchards();
  const { clients } = useClients();
  const { users } = useUsers();
  const { can } = usePermission();
  const canEdit = can(isEditing ? PERMISSIONS.ORCHARD_EDIT : PERMISSIONS.ORCHARD_CREATE);

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [userIds, setUserIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{name?: string; clientId?: string}>({});

  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // View mode state - default to edit mode if creating, view mode if editing
  const [isEditMode, setIsEditMode] = useState(!isEditing);

  // Load orchard data if editing
  useEffect(() => {
    if (isEditing) {
      setIsLoading(true);
      getOrchard(orchardId)
        .then(orchard => {
          setName(orchard.name);
          setClientId(typeof orchard.clientId === 'object' ? orchard.clientId._id : orchard.clientId);
          setUserIds(orchard.userIds?.map(u => typeof u === 'object' ? u._id : u) || []);
          setIsActive(orchard.isActive);
          setIsLoading(false);
          setTimeout(() => setIsDirty(false), 100);
        })
        .catch((err: any) => {
          console.error(err);
          Alert.alert('Error', 'Failed to load orchard details');
          navigation.goBack();
        });
    }
  }, [orchardId, isEditing]);

  // Load draft if creating
  useEffect(() => {
    if (!isEditing && Object.keys(createFormDraft).length > 0) {
      if (createFormDraft.name) setName(createFormDraft.name);
      if (createFormDraft.clientId) setClientId(createFormDraft.clientId);
      if (createFormDraft.userIds) setUserIds(createFormDraft.userIds);
      // Don't set dirty immediately to avoid warning on fresh open
    }
  }, [isEditing]);

  // Save draft on change
  useEffect(() => {
    if (!isEditing) {
      createFormDraft = { name, clientId, userIds };
    }
  }, [name, clientId, userIds, isEditing]);

  // Track dirty state
  const handleNameChange = (text: string) => {
    setName(text);
    setIsDirty(true);
    if (text.trim().length > 0) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleClientIdChange = (text: string) => {
    setClientId(text);
    setIsDirty(true);
    if (text.trim().length > 0) {
      setErrors(prev => ({ ...prev, clientId: undefined }));
    }
  };

  const handleUserToggle = (id: string) => {
    setUserIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(uid => uid !== id);
      } else {
        return [...prev, id];
      }
    });
    setIsDirty(true);
  };

  const handleActiveChange = (value: boolean) => {
    setIsActive(value);
    setIsDirty(true);
  };

  // Enable discard warning only in edit mode
  useMobileDiscardWarning(isEditMode && isDirty && !isSubmitting);

  const validate = () => {
    const newErrors: {name?: string; clientId?: string} = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!clientId.trim()) newErrors.clientId = 'Client ID is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateOrchard({ id: orchardId, data: { name, isActive, userIds } });
        setIsEditMode(false);
      } else {
        await createOrchard({ name, clientId, userIds });
        createFormDraft = {}; // Clear draft
        navigation.goBack();
      }
      setIsDirty(false);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Failed to save orchard');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getClientName = (id: string) => {
    const client = clients?.find(c => c._id === id);
    return client ? client.name : id;
  };

  const getUserNames = () => {
    if (!userIds.length) return 'None';
    return userIds.map(id => {
      const user = users?.find(u => u._id === id);
      return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
    }).join(', ');
  };

  const filteredClients = clients?.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];
  const filteredUsers = users?.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isEditing ? (isEditMode ? 'Edit Orchard' : 'Orchard Details') : 'New Orchard'} />
        {!isEditMode && canEdit && (
          <Appbar.Action icon="pencil" onPress={() => setIsEditMode(true)} />
        )}
        {isEditMode && isEditing && (
          <Appbar.Action icon="close" onPress={() => {
             setIsEditMode(false);
             setIsDirty(false);
             // Reset values
             getOrchard(orchardId).then(o => {
                setName(o.name);
                setIsActive(o.isActive);
                setUserIds(o.userIds?.map(u => typeof u === 'object' ? u._id : u) || []);
             });
          }} />
        )}
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        {isEditMode ? (
          <>
            <TextInput
              label="Name"
              value={name}
              onChangeText={handleNameChange}
              mode="outlined"
              style={styles.input}
              error={!!errors.name}
            />
            <HelperText type="error" visible={!!errors.name}>
              {errors.name}
            </HelperText>

            <TouchableOpacity 
              onPress={() => {
                setSearchQuery('');
                setClientModalVisible(true);
              }}
              disabled={isEditing} // Immutable after create
            >
              <View pointerEvents="none">
                <TextInput
                  label="Client"
                  value={getClientName(clientId)}
                  mode="outlined"
                  disabled={isEditing} 
                  style={styles.input}
                  error={!!errors.clientId}
                  right={<TextInput.Icon icon="chevron-down" />}
                />
              </View>
            </TouchableOpacity>
            <HelperText type="info" visible={!isEditing}>
              Tap to select a client
            </HelperText>
            {isEditing && (
              <HelperText type="info" visible={true}>
                Client cannot be changed after creation.
              </HelperText>
            )}

            <TouchableOpacity 
              onPress={() => {
                setSearchQuery('');
                setUserModalVisible(true);
              }}
            >
              <View pointerEvents="none">
                <TextInput
                  label="Assigned Users"
                  value={getUserNames()}
                  mode="outlined"
                  style={styles.input}
                  multiline
                  right={<TextInput.Icon icon="account-multiple-plus" />}
                />
              </View>
            </TouchableOpacity>
            <HelperText type="info" visible={true}>
              Tap to manage assigned users
            </HelperText>

            {isEditing && (
              <View style={styles.switchContainer}>
                <Text variant="bodyLarge">Active</Text>
                <Switch
                  value={isActive}
                  onValueChange={handleActiveChange}
                />
              </View>
            )}

            <Button
              mode="contained"
              onPress={handleSave}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.button}
            >
              Save
            </Button>
          </>
        ) : (
          <>
            <DetailRow label="Name" value={name} />
            <DetailRow label="Client" value={getClientName(clientId)} />
            <DetailRow label="Assigned Users" value={getUserNames()} />
            <DetailRow label="Status" value={isActive ? 'Active' : 'Inactive'} />
          </>
        )}
      </ScrollView>

      <Portal>
        <Modal visible={clientModalVisible} onDismiss={() => setClientModalVisible(false)} contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <Text variant="titleLarge" style={styles.modalTitle}>Select Client</Text>
          <Searchbar
            placeholder="Search clients"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          <FlatList
            data={filteredClients}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                onPress={() => {
                  handleClientIdChange(item._id);
                  setClientModalVisible(false);
                }}
                right={props => clientId === item._id ? <List.Icon {...props} icon="check" /> : null}
              />
            )}
          />
          <Button onPress={() => setClientModalVisible(false)} style={styles.modalButton}>Close</Button>
        </Modal>
      </Portal>

      <Portal>
        <Modal visible={userModalVisible} onDismiss={() => setUserModalVisible(false)} contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <Text variant="titleLarge" style={styles.modalTitle}>Assign Users</Text>
          <Searchbar
            placeholder="Search users"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          <FlatList
            data={filteredUsers}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <List.Item
                title={`${item.firstName} ${item.lastName}`}
                onPress={() => handleUserToggle(item._id)}
                right={() => <Checkbox status={userIds.includes(item._id) ? 'checked' : 'unchecked'} />}
              />
            )}
          />
          <Button onPress={() => setUserModalVisible(false)} style={styles.modalButton}>Done</Button>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  input: { marginBottom: 4 },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  button: { marginTop: 16 },
  modalContent: { padding: 20, margin: 20, borderRadius: 8, maxHeight: '80%' },
  modalTitle: { marginBottom: 16, textAlign: 'center' },
  searchBar: { marginBottom: 16 },
  modalButton: { marginTop: 16 },
});