import React from 'react';
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
  SegmentedButtons,
  Chip,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserType } from '@rootstock/iam/users/users-data-access';
import { useGetClients } from '@rootstock/iam/clients/clients-data-access';
import { useGetRoles } from '@rootstock/iam/roles/roles-data-access';
import { useMobileDiscardWarning } from '@rootstock/ui/mobile';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

const userSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().optional(),
  userType: z.nativeEnum(UserType),
  roleId: z.string().optional(),
  clientIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  defaultValues?: Partial<UserFormData>;
  onSubmit: (data: UserFormData) => Promise<void>;
  isSubmitting?: boolean;
  mode: 'create' | 'edit' | 'view';
  onCancel: () => void;
}

export function UserForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  mode,
  onCancel,
}: UserFormProps) {
  const theme = useTheme();
  const { can } = usePermission();
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const { data: clients = [] } = useGetClients();
  const { data: roles = [] } = useGetRoles();

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
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

  useMobileDiscardWarning(isDirty && !isSubmitting);

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

  const canToggleActive = isEdit && can(PERMISSIONS.USER_EDIT);

  return (
    <View style={styles.container}>
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
                disabled={isView}
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
                disabled={isView}
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
                disabled={isView}
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

        {!isView && (
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  label={isCreate ? 'Password' : 'New Password (Optional)'}
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
        )}

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
                disabled={isView}
              />
            )}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
            Role
          </Text>
          {isView ? (
            <Text variant="bodyLarge">{selectedRole?.name || 'None'}</Text>
          ) : (
            <>
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
            </>
          )}
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
                onClose={
                  isView
                    ? undefined
                    : () => {
                        setValue(
                          'clientIds',
                          selectedClientIds.filter((id) => id !== client._id),
                          { shouldDirty: true }
                        );
                      }
                }
              >
                {client.name}
              </Chip>
            ))}
            {!isView && (
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
            onPress={handleSubmit(onSubmit)}
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
