import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { TextInput, Button, HelperText, SegmentedButtons, List, Checkbox, useTheme, Switch } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { roleSchema, RoleFormData } from '../../../../types/iam/role.schema';
import { PERMISSIONS, VisibilityScope } from '../../../../constants/permissions';

interface RoleFormProps {
    defaultValues?: Partial<RoleFormData>;
    onSubmit: (data: RoleFormData) => void;
    isSubmitting?: boolean;
}

export const RoleForm = ({ defaultValues, onSubmit, isSubmitting }: RoleFormProps) => {
    const theme = useTheme();
    const { control, handleSubmit, formState: { errors, isDirty }, watch, setValue } = useForm<RoleFormData>({
        resolver: zodResolver(roleSchema),
        defaultValues: {
            name: '',
            description: '',
            visibilityScope: VisibilityScope.CLIENT,
            permissions: [],
            isActive: true,
            ...defaultValues,
        },
    });

    const selectedPermissions = watch('permissions') || [];

    const togglePermission = (permission: string) => {
        const current = new Set(selectedPermissions);
        if (current.has(permission)) {
            current.delete(permission);
        } else {
            current.add(permission);
        }
        setValue('permissions', Array.from(current), { shouldDirty: true });
    };

    const groupedPermissions = React.useMemo(() => {
        return Object.values(PERMISSIONS).reduce((acc, permission) => {
            const [resource] = permission.split(':');
            if (!acc[resource]) acc[resource] = [];
            acc[resource].push(permission);
            return acc;
        }, {} as Record<string, string[]>);
    }, []);

    const toggleGroup = (resource: string) => {
        const groupPermissions = groupedPermissions[resource];
        const current = new Set(selectedPermissions);
        const allSelected = groupPermissions.every((p) => current.has(p));

        if (allSelected) {
            groupPermissions.forEach(p => current.delete(p));
        } else {
            groupPermissions.forEach(p => current.add(p));
        }
        setValue('permissions', Array.from(current), { shouldDirty: true });
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container}>
                <Controller
                    control={control}
                    name="name"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <View style={styles.inputContainer}>
                            <TextInput
                                label="Name"
                                mode="outlined"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                error={!!errors.name}
                            />
                            <HelperText type="error" visible={!!errors.name}>
                                {errors.name?.message}
                            </HelperText>
                        </View>
                    )}
                />

                <Controller
                    control={control}
                    name="description"
                    render={({ field: { onChange, onBlur, value } }) => (
                        <View style={styles.inputContainer}>
                            <TextInput
                                label="Description"
                                mode="outlined"
                                onBlur={onBlur}
                                onChangeText={onChange}
                                value={value}
                                multiline
                            />
                        </View>
                    )}
                />

                <Controller
                    control={control}
                    name="visibilityScope"
                    render={({ field: { onChange, value } }) => (
                        <View style={styles.inputContainer}>
                            <SegmentedButtons
                                value={value}
                                onValueChange={onChange}
                                buttons={[
                                    { value: VisibilityScope.CLIENT, label: 'Client' },
                                    { value: VisibilityScope.SUBSIDIARY, label: 'Subsidiary' },
                                    { value: VisibilityScope.GLOBAL, label: 'Global' },
                                ]}
                            />
                        </View>
                    )}
                />

                <List.Section title="Permissions">
                    {Object.entries(groupedPermissions).map(([resource, permissions]) => {
                        const allSelected = permissions.every(p => selectedPermissions.includes(p));
                        const someSelected = permissions.some(p => selectedPermissions.includes(p));

                        return (
                            <List.Accordion
                                key={resource}
                                title={resource}
                                left={props => <List.Icon {...props} icon="folder" />}
                            >
                                <List.Item
                                    title={`Select All ${resource}`}
                                    left={() => (
                                        <Checkbox
                                            status={allSelected ? 'checked' : someSelected ? 'indeterminate' : 'unchecked'}
                                            onPress={() => toggleGroup(resource)}
                                        />
                                    )}
                                />
                                {permissions.map((permission) => (
                                    <List.Item
                                        key={permission}
                                        title={permission.split(':')[1]} // Show Action only
                                        left={() => (
                                            <Checkbox
                                                status={selectedPermissions.includes(permission) ? 'checked' : 'unchecked'}
                                                onPress={() => togglePermission(permission)}
                                            />
                                        )}
                                    />
                                ))}
                            </List.Accordion>
                        );
                    })}
                </List.Section>

                <Controller
                    control={control}
                    name="isActive"
                    render={({ field: { value, onChange } }) => (
                        <List.Item
                            title="Active Status"
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
                    Save Role
                </Button>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 100,
    },
    inputContainer: {
        marginBottom: 16,
    },
    submitButton: {
        marginTop: 24,
    }
});
