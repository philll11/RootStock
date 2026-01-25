import { useEffect, useMemo } from 'react';
import { debounce } from 'lodash-es';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    TextField,
    Grid,
    Autocomplete,
    Checkbox,
    Button,
    Box,
    Typography,
    FormControlLabel,
    Switch,
} from '@mui/material';

import { Orchard } from 'types/assets/orchard.types';
import { orchardSchema, OrchardFormData } from 'types/assets/orchard.schema';

import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';

import ResourceRelatedTabs from 'ui-component/extended/ResourceRelatedTabs';
import ResourceAuditTable from 'ui-component/extended/ResourceAuditTable';
import BlockList from 'views/assets/blocks/BlockList';

import { useGetClients } from 'hooks/iam/useClients';
import { useGetUsers } from 'hooks/iam/useUsers';
import { IconHistory, IconBuildingEstate } from '@tabler/icons-react';

export type OrchardFormMode = 'create' | 'edit' | 'view';

interface OrchardFormProps {
    mode: OrchardFormMode;
    orchard?: Orchard | null;
    initialValues?: Partial<OrchardFormData>;
    onSubmit: (values: OrchardFormData) => void;
    isLoading?: boolean;
    onCancel: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    onValuesChange?: (values: Partial<OrchardFormData>) => void;
}

const OrchardForm = ({
    mode,
    orchard,
    initialValues,
    onSubmit,
    onCancel,
    isLoading,
    onDirtyChange,
    onValuesChange
}: OrchardFormProps) => {
    const isEditing = mode === 'edit';
    const isCreating = mode === 'create';
    const isViewing = mode === 'view';

    const { data: clients = [], isLoading: isLoadingClients } = useGetClients();
    const { data: users = [], isLoading: isLoadingUsers } = useGetUsers();

    const { can } = usePermission();

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { isDirty, errors },
    } = useForm<OrchardFormData>({
        resolver: zodResolver(orchardSchema),
        defaultValues: {
            name: '',
            clientId: '',
            userIds: [],
            isActive: true,
            __v: 0,
            ...initialValues,
        },
    });

    // Create a debounced version of the change handler
    const debouncedOnValuesChange = useMemo(
        () =>
            debounce((val: Partial<OrchardFormData>) => {
                if (onValuesChange) {
                    onValuesChange(val);
                }
            }, 500),
        [onValuesChange]
    );

    // Watch for changes and notify parent
    useEffect(() => {
        if (!onValuesChange) return;
        const subscription = watch((value) => {
            debouncedOnValuesChange(value as Partial<OrchardFormData>);
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

    // Handle initial values from orchard prop
    useEffect(() => {
        if (orchard && (isEditing || isViewing)) {
            reset({
                name: orchard.name,
                clientId: typeof orchard.clientId === 'object' ? orchard.clientId._id : orchard.clientId,
                userIds: orchard.userIds?.map((u) => (typeof u === 'object' ? u._id : u)) || [],
                isActive: orchard.isActive,
                __v: orchard.__v,
            });
        } else if (isCreating) {
            reset({
                name: initialValues?.name || '',
                clientId: initialValues?.clientId || '',
                userIds: initialValues?.userIds || [],
                isActive: true,
                __v: 0,
                ...initialValues
            });
        }
    }, [orchard, mode, isEditing, isViewing, isCreating, reset]);

    const handleFormSubmit = (values: OrchardFormData) => {
        const submissionData: any = { ...values };
        if (isEditing && orchard) {
            delete submissionData.clientId; // ClientId is not editable
            submissionData.__v = orchard.__v;
        }
        if (isCreating) {
            delete submissionData.isActive;
            delete submissionData.__v;
        }
        onSubmit(submissionData as OrchardFormData);
    };

    const handleClear = () => {
        reset({
            name: '',
            clientId: '',
            userIds: [],
        });
    };

    // Define tabs
    const tabs = useMemo(() => [
        {
            label: 'Blocks',
            value: 'blocks',
            icon: <IconBuildingEstate size="1.3rem" />,
            disabled: isCreating,
            component: orchard?._id ? <BlockList orchardId={orchard._id} orchardName={orchard.name} /> : null
        },
        {
            label: 'Audit Trail',
            value: 'audit',
            icon: <IconHistory size="1.3rem" />,
            disabled: isCreating,
            component: (
                <Box sx={{ mt: 2 }}>
                    {orchard?._id ? (
                        <ResourceAuditTable resource="Orchard" resourceId={orchard._id} />
                    ) : (
                        <Typography color="textSecondary">Audit trail is only available for existing records.</Typography>
                    )}
                </Box>
            )
        }
    ], [orchard, isCreating]);


    const isSubmitDisabled = isLoading || (!isDirty && !isCreating) || isViewing;

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
            <Grid container spacing={3}>
                <Grid size={12}>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Orchard Name"
                                fullWidth
                                error={!!errors.name}
                                helperText={errors.name?.message}
                                disabled={isViewing}
                            />
                        )}
                    />
                </Grid>

                <Grid size={12}>
                    <Controller
                        name="clientId"
                        control={control}
                        render={({ field: { value, onChange, ...field } }) => (
                            <Autocomplete
                                {...field}
                                options={clients}
                                getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                                value={clients.find((c) => c._id === value) || null}
                                onChange={(_, newValue) => {
                                    onChange(newValue ? newValue._id : '');
                                }}
                                disabled={isViewing || isEditing}
                                loading={isLoadingClients}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Client"
                                        error={!!errors.clientId}
                                        helperText={errors.clientId?.message}
                                    />
                                )}
                                isOptionEqualToValue={(option, value) => option._id === value._id}
                            />
                        )}
                    />
                </Grid>

                <Grid size={12}>
                    <Controller
                        name="userIds"
                        control={control}
                        render={({ field: { value, onChange, ...field } }) => (
                            <Autocomplete
                                {...field}
                                multiple
                                limitTags={3}
                                options={users}
                                disableCloseOnSelect
                                getOptionLabel={(option) => typeof option === 'string' ? option : `${option.firstName} ${option.lastName}`}
                                value={users.filter(u => value?.includes(u._id)) || []}
                                onChange={(_, newValue) => {
                                    onChange(newValue.map(v => v._id));
                                }}
                                disabled={isViewing}
                                loading={isLoadingUsers}
                                isOptionEqualToValue={(option, value) => option._id === value._id}
                                renderOption={(props, option, { selected }) => (
                                    <li {...props}>
                                        <Checkbox style={{ marginRight: 8 }} checked={selected} />
                                        {option.firstName} {option.lastName}
                                    </li>
                                )}
                                renderInput={(params) => (
                                    <TextField {...params} label="Contact Users" placeholder="Select users" />
                                )}
                            />
                        )}
                    />

                </Grid>
                {!isCreating && can(PERMISSIONS.ORCHARD_MANAGE_INACTIVE) && (
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
                                        {isEditing ? 'Update Orchard' : 'Create Orchard'}
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

export default OrchardForm;
