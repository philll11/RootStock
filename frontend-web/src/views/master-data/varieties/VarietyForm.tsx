import { useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash-es';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField, Grid, Switch, FormControlLabel, Box, Button, Typography } from '@mui/material';

import { Variety } from 'types/master-data/variety.types';
import { varietySchema, VarietyFormData } from 'types/master-data/variety.schema';

import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';

import ResourceRelatedTabs from 'ui-component/extended/ResourceRelatedTabs';
import ResourceAuditTable from 'ui-component/extended/ResourceAuditTable';
import { IconHistory } from '@tabler/icons-react';

export type VarietyFormMode = 'create' | 'edit' | 'view';

interface VarietyFormProps {
    mode: VarietyFormMode;
    variety?: Variety | null;
    initialValues?: Partial<VarietyFormData>;
    onSubmit: (values: any) => void;
    isLoading?: boolean;
    onCancel: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    onValuesChange?: (values: Partial<VarietyFormData>) => void;
}

const VarietyForm = ({ mode, variety, initialValues, onSubmit, onCancel, isLoading, onDirtyChange, onValuesChange }: VarietyFormProps) => {
    const isEditing = mode === 'edit';
    const isCreating = mode === 'create';
    const isViewing = mode === 'view';

    const { can } = usePermission();

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { isDirty, errors }
    } = useForm<VarietyFormData>({
        resolver: zodResolver(varietySchema),
        defaultValues: {
            name: '',
            isActive: true,
            __v: 0,
            ...initialValues
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
            debounce((val: Partial<VarietyFormData>) => {
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
            debouncedOnValuesChange(value as Partial<VarietyFormData>);
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

    // Handle initial values from variety prop
    useEffect(() => {
        if (variety && (isEditing || isViewing)) {
            reset({
                name: variety.name,
                isActive: variety.isActive,
                __v: variety.__v
            });
        } else if (isCreating) {
            reset({
                name: initialValues?.name || '',
                isActive: true,
                __v: 0,
                ...initialValues
            });
        }
    }, [variety, mode, isEditing, isViewing, isCreating, reset]);

    const handleFormSubmit = (values: VarietyFormData) => {
        if (mode === 'create') {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { isActive, __v, ...createData } = values;
            onSubmit(createData);
        } else if (mode === 'edit') {
            onSubmit({
                ...values,
                __v: variety?.__v
            });
        }
    };

    const handleClear = () => {
        reset({
            name: ''
        });
    };

    // Define tabs
    const tabs = useMemo(
        () => [
            {
                label: 'Audit Trail',
                value: 'audit',
                icon: <IconHistory size="1.3rem" />,
                disabled: isCreating,
                component: (
                    <Box sx={{ mt: 2 }}>
                        {variety?._id ? (
                            <ResourceAuditTable resource="Variety" resourceId={variety._id} />
                        ) : (
                            <Typography color="textSecondary">Audit trail is only available for existing records.</Typography>
                        )}
                    </Box>
                )
            }
        ],
        [variety, isCreating]
    );

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
                                label="Variety Name"
                                fullWidth
                                error={!!errors.name}
                                helperText={errors.name?.message}
                                disabled={isViewing}
                            />
                        )}
                    />
                </Grid>

                {/* Active Switch - Only show in Edit/View mode if permitted */}
                {!isCreating && can(PERMISSIONS.VARIETY_MANAGE_INACTIVE) && (
                    <Grid size={12}>
                        <Controller
                            name="isActive"
                            control={control}
                            render={({ field }) => (
                                <FormControlLabel
                                    control={
                                        <Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} disabled={isViewing} color="success" />
                                    }
                                    label={field.value ? 'Active' : 'Inactive'}
                                />
                            )}
                        />
                    </Grid>
                )}
            </Grid>

            {/* Related Data / Audit Trail */}
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
                                    <Button variant="text" color="error" onClick={() => handleClear()}>
                                        Clear
                                    </Button>
                                ) : (
                                    <Box />
                                )}

                                <Box display="flex" gap={2}>
                                    <Button variant="outlined" color="primary" onClick={onCancel} disabled={isLoading}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" variant="contained" color="primary" disabled={isSubmitDisabled}>
                                        {isEditing ? 'Update Variety' : 'Create Variety'}
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

export default VarietyForm;
