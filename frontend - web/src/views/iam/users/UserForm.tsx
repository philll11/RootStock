import React, { useEffect, useMemo, useState, useRef } from 'react';
import { debounce } from 'lodash-es';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    TextField,
    Button,
    Grid,
    MenuItem,
    FormControl,
    InputLabel,
    Autocomplete,
    Box,
    Checkbox,
    InputAdornment,
    IconButton,
    OutlinedInput,
    FormHelperText,
    Typography,
    FormControlLabel,
    Switch,
} from '@mui/material';
import { IconEye, IconEyeOff, IconHistory, IconLock } from '@tabler/icons-react';

// Project Imports
import { Client } from 'types/iam/client.types';
import { User, UserType } from 'types/iam/user.types';
import { userSchema, UserFormData } from 'types/iam/user.schema';

import { PERMISSIONS } from 'constants/permissions';
import { usePermission } from 'contexts/AuthContext'
    ;
import ResourceRelatedTabs from 'ui-component/extended/ResourceRelatedTabs';
import ResourceAuditTable from 'ui-component/extended/ResourceAuditTable';

import { useGetRoles } from 'hooks/iam/useRoles';
import { useGetClients } from 'hooks/iam/useClients';


export type UserFormMode = 'create' | 'edit' | 'view';

interface UserFormProps {
    mode: UserFormMode;
    user?: User | null;
    initialValues?: Partial<UserFormData>;
    onSubmit: (values: any) => void;
    isLoading: boolean;
    onCancel: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    onValuesChange?: (values: Partial<UserFormData>) => void;
}

const UserForm = ({
    mode,
    user,
    initialValues,
    onSubmit,
    isLoading,
    onCancel,
    onDirtyChange,
    onValuesChange
}: UserFormProps) => {
    const isEditing = mode === 'edit';
    const isCreating = mode === 'create';
    const isViewing = mode === 'view';

    const { can } = usePermission();

    const [showPassword, setShowPassword] = useState(false);
    const [changePasswordMode, setChangePasswordMode] = useState(false);

    // Data Fetching
    const { data: roles = [] } = useGetRoles();
    const { data: clients = [] } = useGetClients();

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { isDirty, errors },
    } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            userType: UserType.Employee,
            roleId: '',
            clientIds: [],
            password: '',
            isActive: true,
            __v: 0,
            ...initialValues,
        }
    });

    // Keep a stable ref to the callback to avoid breaking debounce if prop changes referentially
    const onValuesChangeRef = useRef(onValuesChange);
    useEffect(() => {
        onValuesChangeRef.current = onValuesChange;
    }, [onValuesChange]);


    // Create a debounced version of the change handler
    const debouncedOnValuesChange = useMemo(
        () =>
            debounce((val: Partial<UserFormData>) => {
                if (onValuesChangeRef.current) {
                    onValuesChangeRef.current(val);
                }
            }, 500),
        []
    );

    // Watch for changes and notify parent
    useEffect(() => {
        if (!onValuesChange) return;
        const subscription = watch((value) => {
            debouncedOnValuesChange(value as Partial<UserFormData>);
        });
        return () => {
            subscription.unsubscribe();
            debouncedOnValuesChange.cancel();
        };
    }, [watch, debouncedOnValuesChange, onValuesChange]);

    // Notify parent about dirty state
    useEffect(() => {
        if (onDirtyChange) {
            onDirtyChange(isDirty);
        }
    }, [isDirty, onDirtyChange]);

    // Initialize form with data
    useEffect(() => {

        if (user && (isEditing || isViewing)) {
            // Normalize populated fields to IDs for the form
            // The API returns full objects for roleId and clientIds, but the form expects ID strings.
            const normalizedRoleId = typeof user.roleId === 'object' && user.roleId !== null
                ? (user.roleId as any)._id
                : user.roleId;

            const normalizedClientIds = Array.isArray(user.clientIds)
                ? user.clientIds.map((c: any) => (typeof c === 'object' ? c._id : c))
                : [];
            reset({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                userType: user.userType,
                roleId: normalizedRoleId,
                clientIds: normalizedClientIds,
                isActive: user.isActive,
                __v: user.__v,
            });
        } else if (isCreating) {
            reset({
                firstName: initialValues?.firstName || '',
                lastName: initialValues?.lastName || '',
                email: initialValues?.email || '',
                userType: initialValues?.userType || UserType.Employee,
                roleId: initialValues?.roleId || '',
                clientIds: initialValues?.clientIds || [],
                isActive: true,
                __v: 0,
                ...initialValues
            });
        }
    }, [user, mode, isEditing, isViewing, isCreating, reset]);

    const handleFormSubmit = (values: UserFormData) => {
        if (mode === 'create') {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { isActive, __v, ...createData } = values;
            onSubmit(createData);
        } else if (mode === 'edit') {
            onSubmit({
                ...values,
                __v: user?.__v
            });
        }
    };

    const handleClear = () => {
        reset({
            firstName: '',
            lastName: '',
            email: '',
            userType: UserType.Employee,
            roleId: undefined,
            password: '',
            clientIds: []
        });
    };

    const watchedUserType = watch('userType');

    // Reactively handle User Type changes
    useEffect(() => {
        // If user type changes to Contact, ensure only 1 client is selected (or clear if multiple)
        // Ideally we strictly enforce this, for now we just let validation handle 0 or 2+, 
        // but we switch autocomplete mode which usually clears selection if not compatible.
        // Actually Autocomplete 'multiple' prop switch might require clearing value.
        const currentClients = watch('clientIds') || [];
        if (watchedUserType === UserType.Contact && currentClients.length > 1) {
            // reset to empty or first
            setValue('clientIds', [currentClients[0]]);
        }
    }, [watchedUserType, setValue, watch]);

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    const handleMouseDownPassword = (event: React.MouseEvent) => {
        event.preventDefault();
    };

    const isSubmitDisabled = isLoading || (!isDirty && !isCreating) || isViewing;


    // Define tabs
    const tabs = useMemo(() => [
        {
            label: 'Audit Trail',
            value: 'audit',
            icon: <IconHistory size="1.3rem" />,
            disabled: isCreating,
            component: (
                <Box sx={{ mt: 2 }}>
                    {user?._id ? (
                        <ResourceAuditTable resource="User" resourceId={user._id} />
                    ) : (
                        <Typography color="textSecondary">Audit trail is only available for existing records.</Typography>
                    )}
                </Box>
            )
        }
    ], [user, isCreating]);

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
            <Grid container spacing={3}>
                <Grid size={12}>
                    <Controller
                        name="firstName"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="First Name"
                                fullWidth
                                error={!!errors.firstName}
                                helperText={errors.firstName?.message}
                                disabled={isViewing}
                            />
                        )}
                    />
                </Grid>
                <Grid size={12}>
                    <Controller
                        name="lastName"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Last Name"
                                fullWidth
                                error={!!errors.lastName}
                                helperText={errors.lastName?.message}
                                disabled={isViewing}
                            />
                        )}
                    />
                </Grid>
                <Grid size={12}>
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Email Address"
                                fullWidth
                                error={!!errors.email}
                                helperText={errors.email?.message}
                                disabled={isViewing}
                                autoComplete="username"
                            />
                        )}
                    />
                </Grid>

                <Grid size={12}>
                    <Controller
                        name="userType"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                select
                                label="User Type"
                                fullWidth
                                {...field}
                                error={!!errors.userType}
                                helperText={errors.userType?.message}
                                disabled={isViewing}
                            >
                                <MenuItem value={UserType.Employee}>Employee</MenuItem>
                                <MenuItem value={UserType.Contact}>Contact</MenuItem>
                            </TextField>
                        )}
                    />
                </Grid>
                <Grid size={12}>
                    <Controller
                        name="roleId"
                        control={control}
                        render={({ field: { value, onChange, ...field } }) => (
                            <Autocomplete
                                {...field}
                                options={roles}
                                getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                                value={roles.find((r) => r._id === value) || null}
                                onChange={(_, newValue) => {
                                    onChange(newValue ? newValue._id : '');
                                }}
                                disabled={isViewing}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Role"
                                        error={!!errors.roleId}
                                        helperText={errors.roleId?.message}
                                    />
                                )}
                                isOptionEqualToValue={(option, value) => option._id === value._id}
                            />
                        )}
                    />
                </Grid>

                <Grid size={12}>
                    <Controller
                        name="clientIds"
                        control={control}
                        render={({ field: { value, onChange, ...field } }) => {
                            const isMultiple = watchedUserType === UserType.Employee;
                            return (
                                <Autocomplete
                                    multiple={isMultiple}
                                    limitTags={3}
                                    id="client-selector"
                                    options={clients}
                                    disableCloseOnSelect={isMultiple}
                                    getOptionLabel={(option) => option.name}
                                    isOptionEqualToValue={(option, value) => option._id === value._id}
                                    // Convert stored IDs to Client objects
                                    value={
                                        isMultiple
                                            ? clients.filter(c => (value as string[])?.includes(c._id))
                                            : (clients.find(c => (value as string[])?.[0] === c._id) || null)
                                    }
                                    onChange={(_, newValue) => {
                                        if (isMultiple) {
                                            onChange((newValue as Client[]).map(c => c._id));
                                        } else {
                                            onChange(newValue ? [(newValue as Client)._id] : []);
                                        }
                                    }}
                                    disabled={isViewing || isLoading}
                                    renderOption={(props, option, { selected }) => {
                                        const { key, ...rest } = props;
                                        return (
                                            <li key={key} {...rest}>
                                                {isMultiple && (
                                                    <Checkbox style={{ marginRight: 8 }} checked={selected} />
                                                )}
                                                {option.name}
                                            </li>
                                        );
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Assigned Clients"
                                            error={!!errors.clientIds}
                                            helperText={errors.clientIds?.message || (watchedUserType === UserType.Contact ? 'Contacts must belong to exactly one client.' : undefined)}
                                        />
                                    )}
                                />
                            );
                        }}
                    />
                </Grid>

                {/* Password Section */}
                <Grid size={12}>
                    {isEditing && !changePasswordMode ? (
                        <Button
                            variant="outlined"
                            startIcon={<IconLock />}
                            onClick={() => setChangePasswordMode(true)}
                            disabled={isViewing}
                        >
                            Change Password
                        </Button>
                    ) : (
                        <FormControl fullWidth variant="outlined" error={!!errors.password}>
                            <InputLabel htmlFor="outlined-adornment-password">Password</InputLabel>
                            <Controller
                                name="password"
                                control={control}
                                render={({ field }) => (
                                    <OutlinedInput
                                        {...field}
                                        id="outlined-adornment-password"
                                        type={showPassword ? 'text' : 'password'}
                                        disabled={isViewing}
                                        autoComplete="new-password"
                                        endAdornment={
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="toggle password visibility"
                                                    onClick={handleClickShowPassword}
                                                    onMouseDown={handleMouseDownPassword}
                                                    edge="end"
                                                >
                                                    {showPassword ? <IconEye /> : <IconEyeOff />}
                                                </IconButton>
                                            </InputAdornment>
                                        }
                                        label="Password"
                                    />
                                )}
                            />
                            {errors.password && (
                                <FormHelperText error>{errors.password.message}</FormHelperText>
                            )}
                            {changePasswordMode && (
                                <Box sx={{ mt: 1 }}>
                                    <Button size="small" onClick={() => {
                                        setValue('password', '');
                                        setChangePasswordMode(false);
                                    }}>Cancel Change</Button>
                                </Box>
                            )}
                        </FormControl>
                    )}

                </Grid>
                {!isCreating && can(PERMISSIONS.USER_MANAGE_INACTIVE) && (
                    <Grid size={12}>
                        <Controller
                            name="isActive"
                            control={control}
                            render={({ field }) => (
                                <FormControlLabel
                                    control={<Switch {...field} checked={field.value} />}
                                    label="Active"
                                    disabled={isViewing}
                                />
                            )}
                        />
                    </Grid>
                )}
            </Grid>

            <Box sx={{ mt: 3 }}>
                <ResourceRelatedTabs tabs={tabs} />
            </Box>

            {/* Buttons (Hidden in View mode if strictly viewing, or you might want an Edit button) */}
            {!isViewing && (
                <Box sx={{ mt: 3 }}>
                    <Grid container>
                        <Grid size={12}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                {isCreating ? (
                                    <Button
                                        variant="text"
                                        color="error"
                                        onClick={() => handleClear()}
                                    >
                                        Clear
                                    </Button>
                                ) : <Box />}

                                <Box display="flex" gap={2}>
                                    <Button variant="outlined" color="primary" onClick={onCancel} disabled={isLoading}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        disabled={isSubmitDisabled}
                                    >
                                        {isEditing ? 'Update User' : 'Create User'}
                                    </Button>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            )}
        </form>
    );
};

export default UserForm;
