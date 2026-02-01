import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  TextInput,
  Button,
  Switch,
  Text,
  HelperText,
  useTheme,
  List,
  Modal,
  Portal,
  Searchbar,
  SegmentedButtons,
  Chip,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserType, userSchema, UserFormData } from '@/features/iam/users/data';
import { useGetClients } from '@/features/iam/clients/data';
import { useGetRoles } from '@/features/iam/roles/data';
import { useMobileDiscardWarning } from '@/hooks';
import { AppTheme } from '@/theme';
import { usePermission } from '@/features/iam/auth/data';
import { PERMISSIONS } from '@/utils';
import { spacing } from '@/theme';

export interface UserFormProps {
  defaultValues?: Partial<UserFormData>;
  onSubmit: (data: UserFormData) => Promise<void>;
  isEditMode?: boolean;
  isSubmitting?: boolean;
}

export function UserForm({
  defaultValues,
  onSubmit,
  isEditMode = false,
  isSubmitting,
}: UserFormProps) {
  const theme = useTheme<AppTheme>();
  const { can } = usePermission();
  const [isSaving, setIsSaving] = useState(false);

  const { data: clients = [] } = useGetClients();
  const { data: roles = [] } = useGetRoles();

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema) as any,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      userType: UserType.Employee,
      roleId: '',
      clientIds: [],
      isActive: true,
      ...defaultValues,
    },
  });

  useMobileDiscardWarning(isDirty && !isSaving);

  const [clientModalVisible, setClientModalVisible] = React.useState(false);
  const [roleModalVisible, setRoleModalVisible] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const selectedRoleId = watch('roleId');
  const selectedClientIds = watch('clientIds') || [];
  const userType = watch('userType');

  const selectedRole = roles.find((r) => r._id === selectedRoleId);
  const selectedClients = clients.filter((c) =>
    selectedClientIds.includes(c._id)
  );

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFormSubmit = async (data: UserFormData) => {
    setIsSaving(true);
    try {
      await onSubmit(data);
    } catch (error) {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput
                label="First Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                mode="outlined"
                error={!!errors.firstName}
              />
              {errors.firstName && (
                <HelperText type="error" visible={!!errors.firstName}>
                  {errors.firstName.message}
                </HelperText>
              )}
            </View>
          )}
        />

        <Controller
          control={control}
          name="lastName"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput
                label="Last Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                mode="outlined"
                error={!!errors.lastName}
              />
              {errors.lastName && (
                <HelperText type="error" visible={!!errors.lastName}>
                  {errors.lastName.message}
                </HelperText>
              )}
            </View>
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput
                label="Email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                mode="outlined"
                error={!!errors.email}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {errors.email && (
                <HelperText type="error" visible={!!errors.email}>
                  {errors.email.message}
                </HelperText>
              )}
            </View>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput
                label={isEditMode ? 'New Password (Optional)' : 'Password'}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                mode="outlined"
                secureTextEntry
                error={!!errors.password}
              />
              {errors.password && (
                <HelperText type="error" visible={!!errors.password}>
                  {errors.password.message}
                </HelperText>
              )}
            </View>
          )}
        />

        <View style={styles.inputContainer}>
          <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
            User Type
          </Text>
          <Controller
            control={control}
            name="userType"
            render={({ field: { value, onChange } }) => (
              <SegmentedButtons
                value={value}
                onValueChange={onChange}
                buttons={[
                  { value: UserType.Employee, label: 'Employee' },
                  { value: UserType.Contact, label: 'Contact' },
                ]}
              />
            )}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
            Role
          </Text>
          <Button
            mode="outlined"
            onPress={() => {
              setSearchQuery('');
              setRoleModalVisible(true);
            }}
            style={styles.selectorButton}
          >
            {selectedRole?.name || 'Select Role'}
          </Button>
        </View>

        <View style={styles.inputContainer}>
          <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
            Assigned Clients
          </Text>
          <View style={styles.chipContainer}>
            {selectedClients.map((client) => (
              <Chip
                key={client._id}
                style={styles.chip}
                onClose={() => {
                  setValue(
                    'clientIds',
                    selectedClientIds.filter((id) => id !== client._id),
                    { shouldDirty: true }
                  );
                }}
              >
                {client.name}
              </Chip>
            ))}
            <Chip
              icon="plus"
              onPress={() => {
                setSearchQuery('');
                setClientModalVisible(true);
              }}
              style={styles.chip}
            >
              Add Client
            </Chip>
          </View>
        </View>

        {can(PERMISSIONS.USER_MANAGE_INACTIVE) && isEditMode && (
          <Controller
            control={control}
            name="isActive"
            render={({ field: { value, onChange } }) => (
              <View style={styles.switchContainer}>
                <Text variant="bodyLarge">Active</Text>
                <Switch value={value} onValueChange={onChange} />
              </View>
            )}
          />
        )}

        <Button
          mode="contained"
          onPress={handleSubmit(handleFormSubmit)}
          style={styles.submitButton}
          loading={isSubmitting || isSaving}
          disabled={isSubmitting || isSaving}
        >
          {isEditMode ? 'Save Changes' : 'Create User'}
        </Button>
      </ScrollView>

      <Portal>
        <Modal
          visible={roleModalVisible}
          onDismiss={() => setRoleModalVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Searchbar
            placeholder="Search Roles"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          <ScrollView>
            {filteredRoles.map((role) => (
              <List.Item
                key={role._id}
                title={role.name}
                onPress={() => {
                  setValue('roleId', role._id, { shouldDirty: true });
                  setRoleModalVisible(false);
                }}
                right={(props) =>
                  selectedRoleId === role._id ? (
                    <List.Icon {...props} icon="check" />
                  ) : null
                }
              />
            ))}
          </ScrollView>
        </Modal>

        <Modal
          visible={clientModalVisible}
          onDismiss={() => setClientModalVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Searchbar
            placeholder="Search Clients"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          <ScrollView>
            {filteredClients.map((client) => {
              const isSelected = selectedClientIds.includes(client._id);
              return (
                <List.Item
                  key={client._id}
                  title={client.name}
                  onPress={() => {
                    const newIds = isSelected
                      ? selectedClientIds.filter((id) => id !== client._id)
                      : [...selectedClientIds, client._id];
                    setValue('clientIds', newIds, { shouldDirty: true });
                  }}
                  right={(props) =>
                    isSelected ? <List.Icon {...props} icon="check" /> : null
                  }
                />
              );
            })}
          </ScrollView>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  selectorButton: {
    marginTop: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  modalContent: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  searchBar: {
    marginBottom: 16,
  },
});


