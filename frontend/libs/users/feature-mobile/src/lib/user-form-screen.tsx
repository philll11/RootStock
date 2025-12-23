// frontend/libs/users/feature-mobile/src/lib/user-form-screen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Appbar, TextInput, Button, Switch, Text, useTheme, HelperText, SegmentedButtons, Chip, Modal, Portal, List, Searchbar } from 'react-native-paper';
import { useUsers, UserType } from '@rootstock/users/users-data-access';
import { useClients, searchClients } from '@rootstock/clients/clients-data-access';
import { useRoles } from '@rootstock/roles/roles-data-access';
import { useMobileDiscardWarning, FormLayout, FormMode, confirmDiscard } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';
import { spacing } from '@rootstock/ui/theme';

export const UserFormScreen = ({ navigation, route }: any) => {
  const theme = useTheme();
  const { userId } = route.params || {};
  const isEditing = !!userId;

  const { getUser, createUser, updateUser, deleteUser, isCreating, isUpdating } = useUsers();
  const { roles } = useRoles();
  const { clients } = useClients();
  const { can } = usePermission();
  const canEdit = can(isEditing ? PERMISSIONS.USER_EDIT : PERMISSIONS.USER_CREATE);

  const [isEditMode, setIsEditMode] = useState(!isEditing);
  const mode: FormMode = !userId ? 'create' : (isEditMode ? 'edit' : 'view');
  const isView = mode === 'view';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState<UserType>(UserType.Employee);
  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [roleName, setRoleName] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [availableClients, setAvailableClients] = useState<{ _id: string, name: string }[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; email?: string; password?: string }>({});

  useEffect(() => {
    if (isEditing) {
      setIsLoading(true);
      getUser(userId)
        .then(user => {
          setFirstName(user.firstName);
          setLastName(user.lastName);
          setEmail(user.email);
          setUserType(user.userType);
          setRoleId(typeof user.roleId === 'object' ? user.roleId._id : user.roleId);
          if (typeof user.roleId === 'object') {
            setRoleName(user.roleId.name);
          }
          setIsActive(user.isActive);
          setClientIds(user.clientIds || []);
          setIsLoading(false);
          setTimeout(() => setIsDirty(false), 100);
        })
        .catch((err: any) => {
          console.error(err);
          if (err.response?.status !== 401) {
            Alert.alert('Error', 'Failed to load user details');
          }
          navigation.goBack();
        });
    }
  }, [userId, isEditing]);

  useEffect(() => {
    if (clientModalVisible) {
      searchClients(clientSearchQuery).then(setAvailableClients);
    }
  }, [clientModalVisible, clientSearchQuery]);

  const handleChange = (setter: (val: any) => void, value: any, field: string) => {
    setter(value);
    setIsDirty(true);
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  useMobileDiscardWarning(isEditMode && isDirty && !isSubmitting);

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

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateUser({
          id: userId,
          data: { firstName, lastName, email, userType, roleId, isActive, clientIds }
        });
        setIsEditMode(false);
      } else {
        await createUser({
          firstName, lastName, email, userType, roleId, password, clientIds
        });
        navigation.goBack();
      }
      setIsDirty(false);
    } catch (error: any) {
      console.error(error);
      if (error.response?.status !== 401) {
        Alert.alert('Error', 'Failed to save user');
      }
    } finally {
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
            } catch (error: any) {
              console.error(error);
              if (error.response?.status !== 401) {
                Alert.alert('Error', 'Failed to delete user');
              }
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

  return (
    <FormLayout
      mode={mode}
      title={isEditing ? (isEditMode ? 'Edit User' : 'User Details') : 'New User'}
      onCancel={() => {
        if (isEditMode && isEditing) {
          const cancelEdit = () => {
            setIsEditMode(false);
            setIsLoading(true);
            getUser(userId).then(user => {
              setFirstName(user.firstName);
              setLastName(user.lastName);
              setEmail(user.email);
              setUserType(user.userType);
              setRoleId(typeof user.roleId === 'object' ? user.roleId._id : user.roleId);
              if (typeof user.roleId === 'object') {
                setRoleName(user.roleId.name);
              }
              setIsActive(user.isActive);
              setClientIds(user.clientIds || []);
              setIsLoading(false);
              setIsDirty(false);
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
      canEdit={canEdit}
      isLoading={isLoading || isSubmitting}
      isDirty={isDirty}
    >
      <TextInput
        mode="outlined"
        label="First Name"
        value={firstName}
        onChangeText={(val) => handleChange(setFirstName, val, 'firstName')}
        error={!!errors.firstName}
        editable={!isView}
        style={styles.input}
      />
      {!isView && errors.firstName && <HelperText type="error">{errors.firstName}</HelperText>}

      <TextInput
        mode="outlined"
        label="Last Name"
        value={lastName}
        onChangeText={(val) => handleChange(setLastName, val, 'lastName')}
        error={!!errors.lastName}
        editable={!isView}
        style={styles.input}
      />
      {!isView && errors.lastName && <HelperText type="error">{errors.lastName}</HelperText>}

      <TextInput
        mode="outlined"
        label="Email"
        value={email}
        onChangeText={(val) => handleChange(setEmail, val, 'email')}
        error={!!errors.email}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!isView}
        style={styles.input}
      />
      {!isView && errors.email && <HelperText type="error">{errors.email}</HelperText>}

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
          { value: UserType.Employee, label: 'Employee', disabled: isView },
          { value: UserType.Contact, label: 'Contact', disabled: isView },
        ]}
        style={styles.input}
      />

      <Text variant="bodyMedium" style={styles.label}>Role</Text>
      <View style={styles.chipContainer}>
        <Chip
          mode="outlined"
          onPress={() => !isView && can(PERMISSIONS.ROLE_VIEW) && setRoleModalVisible(true)}
          style={styles.chip}
          icon="shield-account"
          onClose={!isView && roleId ? () => handleChange(setRoleId, undefined, 'roleId') : undefined}
          disabled={isView || !can(PERMISSIONS.ROLE_VIEW)}
        >
          {roles.find(r => r._id === roleId)?.name || roleName || 'Select Role'}
        </Chip>
      </View>

      <Text variant="bodyMedium" style={styles.label}>Clients</Text>
      <View style={styles.chipContainer}>
        {clientIds.map(id => {
          const client = clients?.find(c => c._id === id) || availableClients.find(c => c._id === id);
          return (
            <Chip key={id} onClose={!isView ? () => toggleClient(id) : undefined} style={styles.chip}>
              {client?.name || 'Client ' + id.substring(0, 4)}
            </Chip>
          );
        })}
        {!isView && <Chip icon="plus" onPress={() => setClientModalVisible(true)} style={styles.chip}>Add Client</Chip>}
      </View>

      {isEditing && (
        <View style={styles.switchContainer}>
          <Text variant="bodyLarge">Active</Text>
          <Switch value={isActive} onValueChange={(val) => handleChange(setIsActive, val, 'isActive')} disabled={isView} />
        </View>
      )}

      {isEditMode && isEditing && can(PERMISSIONS.USER_DELETE) && (
        <Button 
          mode="outlined" 
          onPress={handleDelete} 
          textColor={theme.colors.error} 
          style={{ marginTop: spacing.xl, borderColor: theme.colors.error }}
        >
          Delete User
        </Button>
      )}

      <Portal>
        <Modal visible={clientModalVisible} onDismiss={() => setClientModalVisible(false)} contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          <Text variant="titleMedium" style={{ marginBottom: spacing.md }}>Select Clients</Text>
          <Searchbar
            placeholder="Search clients"
            onChangeText={setClientSearchQuery}
            value={clientSearchQuery}
            style={{ marginBottom: spacing.md }}
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
          <Button onPress={() => setClientModalVisible(false)} style={{ marginTop: spacing.md }}>Done</Button>
        </Modal>
      </Portal>

      <Portal>
        <Modal visible={roleModalVisible} onDismiss={() => setRoleModalVisible(false)} contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          <Text variant="titleMedium" style={{ marginBottom: spacing.md }}>Select Role</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {roles.map(role => (
              <List.Item
                key={role._id}
                title={role.name}
                right={props => role._id === roleId ? <List.Icon {...props} icon="check" /> : null}
                onPress={() => {
                  handleChange(setRoleId, role._id, 'roleId');
                  setRoleModalVisible(false);
                }}
              />
            ))}
          </ScrollView>
          <Button onPress={() => setRoleModalVisible(false)} style={{ marginTop: spacing.md }}>Cancel</Button>
        </Modal>
      </Portal>
    </FormLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md },
  input: { marginBottom: spacing.sm },
  label: { marginTop: spacing.sm, marginBottom: spacing.xs },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  button: { marginTop: spacing.lg },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  chip: { margin: spacing.xs },
  modalContent: { padding: spacing.lg, margin: spacing.lg, borderRadius: 8 }
});