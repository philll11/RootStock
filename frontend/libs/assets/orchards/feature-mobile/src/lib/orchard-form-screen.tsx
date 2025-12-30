// frontend/libs/orchards/feature-mobile/src/lib/orchard-form-screen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import {
  TextInput,
  Button,
  Switch,
  Text,
  useTheme,
  HelperText,
  Portal,
  Modal,
  List,
  Searchbar,
  Checkbox,
} from 'react-native-paper';
import {
  useOrchards,
  CreateOrchardDto,
} from '@rootstock/orchards/orchards-data-access';
import { useClients } from '@rootstock/clients/clients-data-access';
import { useUsers } from '@rootstock/users/users-data-access';
import {
  useMobileDiscardWarning,
  FormLayout,
  FormMode,
  confirmDiscard,
} from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

let createFormDraft: Partial<CreateOrchardDto> = {};

export function OrchardFormScreen({ navigation, route }: any) {
  const theme = useTheme();
  const { orchardId } = route.params || {};
  const isEditing = !!orchardId;

  const { getOrchard, createOrchard, updateOrchard, deleteOrchard } =
    useOrchards();
  const { clients } = useClients();
  const { users } = useUsers();
  const { can } = usePermission();
  const canEdit = can(
    isEditing ? PERMISSIONS.ORCHARD_EDIT : PERMISSIONS.ORCHARD_CREATE
  );

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [userIds, setUserIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; clientId?: string }>(
    {}
  );

  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isEditMode, setIsEditMode] = useState(!isEditing);

  const mode: FormMode = isEditing ? (isEditMode ? 'edit' : 'view') : 'create';
  const isView = mode === 'view';

  useEffect(() => {
    if (isEditing) {
      setIsLoading(true);
      getOrchard(orchardId)
        .then((orchard) => {
          setName(orchard.name);
          setClientId(
            typeof orchard.clientId === 'object'
              ? orchard.clientId._id
              : orchard.clientId
          );
          setUserIds(
            orchard.userIds?.map((u) => (typeof u === 'object' ? u._id : u)) ||
              []
          );
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

  useEffect(() => {
    if (!isEditing && Object.keys(createFormDraft).length > 0) {
      if (createFormDraft.name) setName(createFormDraft.name);
      if (createFormDraft.clientId) setClientId(createFormDraft.clientId);
      if (createFormDraft.userIds) setUserIds(createFormDraft.userIds);
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      createFormDraft = { name, clientId, userIds };
    }
  }, [name, clientId, userIds, isEditing]);

  const handleNameChange = (text: string) => {
    setName(text);
    setIsDirty(true);
    if (text.trim().length > 0) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleClientIdChange = (text: string) => {
    setClientId(text);
    setIsDirty(true);
    if (text.trim().length > 0) {
      setErrors((prev) => ({ ...prev, clientId: undefined }));
    }
  };

  const handleUserToggle = (id: string) => {
    setUserIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((uid) => uid !== id);
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

  const handleDelete = () => {
    Alert.alert(
      'Delete Orchard',
      'Are you sure you want to delete this orchard? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOrchard(orchardId);
              setIsDirty(false);
              navigation.goBack();
            } catch (error: any) {
              console.error(error);
              Alert.alert('Error', 'Failed to delete orchard');
            }
          },
        },
      ]
    );
  };

  useMobileDiscardWarning(isEditMode && isDirty && !isSubmitting);

  const validate = () => {
    const newErrors: { name?: string; clientId?: string } = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!clientId.trim()) newErrors.clientId = 'Client ID is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateOrchard({
          id: orchardId,
          data: { name, isActive, userIds },
        });
        setIsEditMode(false);
      } else {
        await createOrchard({ name, clientId, userIds });
        createFormDraft = {};
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
    const client = clients?.find((c) => c._id === id);
    return client ? client.name : id;
  };

  const getUserNames = () => {
    if (!userIds.length) return 'None';
    return userIds
      .map((id) => {
        const user = users?.find((u) => u._id === id);
        return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
      })
      .join(', ');
  };

  const filteredClients =
    clients?.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];
  const filteredUsers =
    users?.filter((u) =>
      `${u.firstName} ${u.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    ) || [];

  const handleClear = () => {
    setName('');
    setClientId('');
    setUserIds([]);
    setIsActive(true);
    setIsDirty(false);
    setErrors({});
    createFormDraft = {};
  };

  return (
    <FormLayout
      mode={mode}
      title={
        isEditing
          ? isEditMode
            ? 'Edit Orchard'
            : 'Orchard Details'
          : 'New Orchard'
      }
      onCancel={() => {
        if (isEditMode && isEditing) {
          const cancelEdit = () => {
            setIsEditMode(false);
            setIsDirty(false);
            getOrchard(orchardId).then((o) => {
              setName(o.name);
              setIsActive(o.isActive);
              setUserIds(
                o.userIds?.map((u) => (typeof u === 'object' ? u._id : u)) || []
              );
            });
          };

          if (isDirty) {
            confirmDiscard(cancelEdit);
          } else {
            cancelEdit();
          }
        } else {
          navigation.goBack();
        }
      }}
      onSubmit={handleSubmit}
      onEdit={() => setIsEditMode(true)}
      onClear={!isEditing ? handleClear : undefined}
      canEdit={canEdit}
      isLoading={isLoading || isSubmitting}
      isDirty={isDirty}
    >
      <TextInput
        mode="outlined"
        label="Name"
        value={name}
        onChangeText={handleNameChange}
        error={!!errors.name}
        editable={!isView}
        style={styles.input}
      />
      {!isView && errors.name && (
        <HelperText type="error">{errors.name}</HelperText>
      )}

      <TouchableOpacity
        onPress={() => !isView && !isEditing && setClientModalVisible(true)}
        disabled={isView || isEditing}
      >
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label="Client"
            value={getClientName(clientId)}
            editable={false}
            error={!!errors.clientId}
            right={
              !isView && !isEditing ? <TextInput.Icon icon="menu-down" /> : null
            }
            style={styles.input}
          />
        </View>
      </TouchableOpacity>
      {!isView && errors.clientId && (
        <HelperText type="error">{errors.clientId}</HelperText>
      )}

      <TouchableOpacity
        onPress={() => !isView && setUserModalVisible(true)}
        disabled={isView}
      >
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label="Assigned Users"
            value={getUserNames()}
            editable={false}
            multiline
            right={!isView ? <TextInput.Icon icon="menu-down" /> : null}
            style={styles.input}
          />
        </View>
      </TouchableOpacity>

      {isEditing && (
        <View style={styles.switchContainer}>
          <Text variant="bodyLarge">Active</Text>
          <Switch
            value={isActive}
            onValueChange={handleActiveChange}
            disabled={isView}
          />
        </View>
      )}

      {isEditMode && isEditing && can(PERMISSIONS.ORCHARD_DELETE) && (
        <Button
          mode="outlined"
          onPress={handleDelete}
          textColor={theme.colors.error}
          style={{ marginTop: spacing.xl, borderColor: theme.colors.error }}
        >
          Delete Orchard
        </Button>
      )}

      <Portal>
        <Modal
          visible={clientModalVisible}
          onDismiss={() => setClientModalVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Select Client
          </Text>
          <Searchbar
            placeholder="Search clients"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          <FlatList
            data={filteredClients}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                onPress={() => {
                  handleClientIdChange(item._id);
                  setClientModalVisible(false);
                }}
                right={(props) =>
                  clientId === item._id ? (
                    <List.Icon {...props} icon="check" />
                  ) : null
                }
              />
            )}
          />
          <Button
            onPress={() => setClientModalVisible(false)}
            style={styles.modalButton}
          >
            Close
          </Button>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={userModalVisible}
          onDismiss={() => setUserModalVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Assign Users
          </Text>
          <Searchbar
            placeholder="Search users"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <List.Item
                title={`${item.firstName} ${item.lastName}`}
                onPress={() => handleUserToggle(item._id)}
                right={() => (
                  <Checkbox
                    status={
                      userIds.includes(item._id) ? 'checked' : 'unchecked'
                    }
                  />
                )}
              />
            )}
          />
          <Button
            onPress={() => setUserModalVisible(false)}
            style={styles.modalButton}
          >
            Done
          </Button>
        </Modal>
      </Portal>
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  input: { marginBottom: spacing.xs },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  button: { marginTop: spacing.md },
  modalContent: {
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: { marginBottom: spacing.md, textAlign: 'center' },
  searchBar: { marginBottom: spacing.md },
  modalButton: { marginTop: spacing.md },
});
