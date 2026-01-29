import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
    TextInput,
    Button,
    Switch,
    HelperText,
    List,
    Portal,
    Searchbar,
    SegmentedButtons,
    RadioButton,
    Text,
    Modal,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { withObservables } from '@nozbe/watermelondb/react';
import { getDatabase } from '@/src/database';
import { UserType } from '@/src/types/iam/user.types';
import { userSchema, UserFormData } from '@/src/types/iam/user.schema';
import Role from '@/src/database/models/iam/Role';
import Client from '@/src/database/models/iam/Client';

interface UserFormProps {
    defaultValues?: Partial<UserFormData>;
    onSubmit: (data: UserFormData) => void;
    isSubmitting?: boolean;
    roles: Role[];
    clients: Client[];
    isEditMode?: boolean;
}

const UserFormComponent = ({
    defaultValues,
    onSubmit,
    isSubmitting,
    roles,
    clients,
    isEditMode,
}: UserFormProps) => {
    const [roleModalVisible, setRoleModalVisible] = useState(false);
    const [clientModalVisible, setClientModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const {
        control,
        handleSubmit,
        formState: { errors },
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

    const selectedRoleId = watch('roleId');
    const selectedClientIds = watch('clientIds') || [];
    const userType = watch('userType');

    const selectedRole = roles.find((r) => r.id === selectedRoleId);

    const filteredRoles = roles.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredClients = clients.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleClient = (clientId: string) => {
        const current = new Set(selectedClientIds);
        if (current.has(clientId)) {
            current.delete(clientId);
        } else {
            if (userType === UserType.Contact) {
                current.clear(); // Contact only 1 client
            }
            current.add(clientId);
        }
        setValue('clientIds', Array.from(current), { shouldValidate: true, shouldDirty: true });
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container}>
                <Controller
                    control={control}
                    name="firstName"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label="First Name"
                            mode="outlined"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            error={!!errors.firstName}
                            style={styles.input}
                        />
                    )}
                />
                <HelperText type="error" visible={!!errors.firstName}>
                    {errors.firstName?.message}
                </HelperText>

                <Controller
                    control={control}
                    name="lastName"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label="Last Name"
                            mode="outlined"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            error={!!errors.lastName}
                            style={styles.input}
                        />
                    )}
                />
                <HelperText type="error" visible={!!errors.lastName}>
                    {errors.lastName?.message}
                </HelperText>

                <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                            label="Email"
                            mode="outlined"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            error={!!errors.email}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={styles.input}
                        />
                    )}
                />
                <HelperText type="error" visible={!!errors.email}>
                    {errors.email?.message}
                </HelperText>

                {!isEditMode && (
                    <Controller
                        control={control}
                        name="password"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <>
                                <TextInput
                                    label="Password"
                                    mode="outlined"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    error={!!errors.password}
                                    secureTextEntry
                                    style={styles.input}
                                />
                                <HelperText type="error" visible={!!errors.password}>
                                    {errors.password?.message}
                                </HelperText>
                            </>
                        )}
                    />
                )}

                <Controller
                    control={control}
                    name="userType"
                    render={({ field: { onChange, value } }) => (
                        <SegmentedButtons
                            value={value}
                            onValueChange={(val) => {
                                onChange(val);
                                // Clear clients if switching types to avoid validation error
                                setValue('clientIds', []);
                            }}
                            buttons={[
                                { value: UserType.Employee, label: 'Employee' },
                                { value: UserType.Contact, label: 'Contact' },
                            ]}
                            style={styles.input}
                        />
                    )}
                />

                <List.Section>
                    <List.Item
                        title="Role"
                        description={selectedRole?.name || 'Select a role'}
                        left={(props) => <List.Icon {...props} icon="shield-account" />}
                        onPress={() => {
                            setSearchQuery('');
                            setRoleModalVisible(true)
                        }}
                    />
                    {errors.roleId && <HelperText type="error">{errors.roleId.message}</HelperText>}

                    <List.Item
                        title="Clients"
                        description={`${selectedClientIds.length} selected`}
                        left={(props) => <List.Icon {...props} icon="domain" />}
                        onPress={() => {
                            setSearchQuery('');
                            setClientModalVisible(true)
                        }}
                    />
                    {errors.clientIds && <HelperText type="error">{errors.clientIds.message}</HelperText>}
                </List.Section>

                <Controller
                    control={control}
                    name="isActive"
                    render={({ field: { value, onChange } }) => (
                        <List.Item
                            title="Active Account"
                            right={() => <Switch value={value} onValueChange={onChange} />}
                        />
                    )}
                />

                <Button
                    mode="contained"
                    onPress={handleSubmit(onSubmit)}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    style={styles.submitButton}
                >
                    Save User
                </Button>

                {/* Roles Modal */}
                <Portal>
                    <Modal visible={roleModalVisible} onDismiss={() => setRoleModalVisible(false)} contentContainerStyle={styles.modalContent}>
                        <Text variant="titleLarge">Select Role</Text>
                        <Searchbar placeholder="Search roles" onChangeText={setSearchQuery} value={searchQuery} />
                        <ScrollView style={{ maxHeight: 300 }}>
                            {filteredRoles.map(role => (
                                <List.Item
                                    key={role.id}
                                    title={role.name}
                                    right={() => selectedRoleId === role.id ? <List.Icon icon="check" /> : null}
                                    onPress={() => {
                                        setValue('roleId', role.id, { shouldValidate: true, shouldDirty: true });
                                        setRoleModalVisible(false);
                                    }}
                                />
                            ))}
                        </ScrollView>
                        <Button onPress={() => setRoleModalVisible(false)}>Close</Button>
                    </Modal>
                </Portal>

                {/* Clients Modal */}
                <Portal>
                    <Modal visible={clientModalVisible} onDismiss={() => setClientModalVisible(false)} contentContainerStyle={styles.modalContent}>
                        <Text variant="titleLarge">Select Clients</Text>
                        <Searchbar placeholder="Search clients" onChangeText={setSearchQuery} value={searchQuery} />
                        <ScrollView style={{ maxHeight: 300 }}>
                            {filteredClients.map(client => (
                                <List.Item
                                    key={client.id}
                                    title={client.name}
                                    right={() => (
                                        <View pointerEvents="none">
                                            {userType === UserType.Contact ? (
                                                <RadioButton
                                                    value={client.id}
                                                    status={selectedClientIds.includes(client.id) ? 'checked' : 'unchecked'}
                                                />
                                            ) : (
                                                <Switch value={selectedClientIds.includes(client.id)} />
                                            )}
                                        </View>
                                    )}
                                    onPress={() => toggleClient(client.id)}
                                />
                            ))}
                        </ScrollView>
                        <Button onPress={() => setClientModalVisible(false)}>Done</Button>
                    </Modal>
                </Portal>

            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 100,
    },
    input: {
        marginBottom: 8,
    },
    submitButton: {
        marginTop: 24,
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        margin: 20,
        borderRadius: 8,
    }
});

export const UserForm = withObservables([], () => ({
    roles: getDatabase().collections.get<Role>('roles').query(),
    clients: getDatabase().collections.get<Client>('clients').query(),
}))(UserFormComponent);
