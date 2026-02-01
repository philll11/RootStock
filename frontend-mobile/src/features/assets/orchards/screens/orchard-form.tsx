import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
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
  Chip,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Orchard,
  orchardSchema,
  OrchardFormData,
} from '@/features/assets/orchards/data';
import { useGetClients } from '@/features/iam/clients/data';
import { useGetUsers } from '@/features/iam/users/data';
import { useMobileDiscardWarning } from '@/hooks';
import { AppTheme } from '@/theme';
import { usePermission } from '@/features/iam/auth/data';
import { PERMISSIONS } from '@/utils';

interface OrchardFormProps {
  defaultValues?: Partial<OrchardFormData>;
  onSubmit: (data: OrchardFormData) => Promise<void>;
  isSubmitting?: boolean;
  mode: 'create' | 'edit' | 'view';
  onCancel: () => void;
  onClientChange?: (clientId: string) => void;
}

export function OrchardForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  mode,
  onCancel,
  onClientChange,
}: OrchardFormProps) {
  const theme = useTheme<AppTheme>();
  const { can } = usePermission();
  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const { data: clients = [] } = useGetClients();
  const { data: users = [] } = useGetUsers();

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<OrchardFormData>({
    resolver: zodResolver(orchardSchema) as any,
    defaultValues: {
      name: '',
      clientId: '',
      userIds: [],
      isActive: true,
      ...defaultValues,
    },
  });

  useMobileDiscardWarning(isDirty && !isSubmitting);

  const handleFormSubmit = async (data: OrchardFormData) => {
    reset(data);
    await onSubmit(data);
  };

  const [clientModalVisible, setClientModalVisible] = React.useState(false);
  const [userModalVisible, setUserModalVisible] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const selectedClientId = watch('clientId');
  const selectedUserIds = watch('userIds') || [];

  React.useEffect(() => {
    if (onClientChange && selectedClientId) {
       onClientChange(selectedClientId);
    }
  }, [selectedClientId, onClientChange]);

  const selectedClient = clients.find((c) => c._id === selectedClientId);
  const selectedUsers = users.filter((u) => selectedUserIds.includes(u._id));

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(
    (u) =>
      u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canToggleActive = isEdit && can(PERMISSIONS.ORCHARD_EDIT);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput
                label="Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                mode="outlined"
                disabled={isView}
                error={!!errors.name}
              />
              {errors.name && (
                <HelperText type="error" visible={!!errors.name}>
                  {errors.name.message}
                </HelperText>
              )}
            </View>
          )}
        />

        <View style={styles.inputContainer}>
          <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
            Client
          </Text>
          {isView ? (
            <Text variant="bodyLarge">{selectedClient?.name || 'None'}</Text>
          ) : (
            <>
              <Button
                mode="outlined"
                onPress={() => {
                  setSearchQuery('');
                  setClientModalVisible(true);
                }}
                style={styles.selectorButton}
              >
                {selectedClient?.name || 'Select Client'}
              </Button>
              {errors.clientId && (
                <HelperText type="error" visible={!!errors.clientId}>
                  {errors.clientId.message}
                </HelperText>
              )}
            </>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
            Assigned Users
          </Text>
          <View style={styles.chipContainer}>
            {selectedUsers.map((user) => (
              <Chip
                key={user._id}
                style={styles.chip}
                onClose={
                  isView
                    ? undefined
                    : () => {
                        setValue(
                          'userIds',
                          selectedUserIds.filter((id) => id !== user._id),
                          { shouldDirty: true }
                        );
                      }
                }
              >
                {user.firstName} {user.lastName}
              </Chip>
            ))}
            {!isView && (
              <Chip
                icon="plus"
                onPress={() => {
                  setSearchQuery('');
                  setUserModalVisible(true);
                }}
                style={styles.chip}
              >
                Add User
              </Chip>
            )}
          </View>
        </View>

        {canToggleActive && (
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
      </ScrollView>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={onCancel}
          style={styles.button}
          disabled={isSubmitting}
        >
          {isView ? 'Back' : 'Cancel'}
        </Button>
        {!isView && (
          <Button
            mode="contained"
            onPress={handleSubmit(handleFormSubmit)}
            style={styles.button}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Save
          </Button>
        )}
      </View>

      <Portal>
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
            {filteredClients.map((client) => (
              <List.Item
                key={client._id}
                title={client.name}
                onPress={() => {
                  setValue('clientId', client._id, { shouldDirty: true });
                  setClientModalVisible(false);
                }}
                right={(props) =>
                  selectedClientId === client._id ? (
                    <List.Icon {...props} icon="check" />
                  ) : null
                }
              />
            ))}
          </ScrollView>
        </Modal>

        <Modal
          visible={userModalVisible}
          onDismiss={() => setUserModalVisible(false)}
          contentContainerStyle={[
            styles.modalContent,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Searchbar
            placeholder="Search Users"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          <ScrollView>
            {filteredUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user._id);
              return (
                <List.Item
                  key={user._id}
                  title={`${user.firstName} ${user.lastName}`}
                  onPress={() => {
                    const newIds = isSelected
                      ? selectedUserIds.filter((id) => id !== user._id)
                      : [...selectedUserIds, user._id];
                    setValue('userIds', newIds, { shouldDirty: true });
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actions: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
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


