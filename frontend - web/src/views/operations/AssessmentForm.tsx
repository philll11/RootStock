import { useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash-es';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    TextField,
    Grid,
    Autocomplete,
    Button,
    Typography,
    Alert,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    Box
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { IconTrash, IconPlus, IconHistory } from '@tabler/icons-react';

import { Assessment, AssessmentStatus, AssessmentType } from 'types/operations/assessment.types';
import { assessmentSchema, AssessmentFormData } from 'types/operations/assessment.schema';

import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';

import ResourceRelatedTabs from 'ui-component/extended/ResourceRelatedTabs';
import ResourceAuditTable from 'ui-component/extended/ResourceAuditTable';
import SubCard from 'ui-component/cards/SubCard';

import { useGetBlocks } from 'hooks/assets/useBlocks';

export type AssessmentFormMode = 'create' | 'edit' | 'view';

interface AssessmentFormProps {
    mode: AssessmentFormMode;
    assessment?: Assessment | null;
    initialValues?: Partial<AssessmentFormData>;
    onSubmit: (values: AssessmentFormData) => void;
    isLoading?: boolean;
    onCancel: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    onValuesChange?: (values: Partial<AssessmentFormData>) => void;
    blockId?: string;
}

const AssessmentForm = ({
    mode,
    assessment,
    initialValues,
    onSubmit,
    onCancel,
    isLoading,
    onDirtyChange,
    onValuesChange,
    blockId,
}: AssessmentFormProps) => {
    const isEditing = mode === 'edit';
    const isCreating = mode === 'create';
    const isViewing = mode === 'view';

    const { data: blocks = [], isLoading: isLoadingBlocks } = useGetBlocks();
    const { can } = usePermission();

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { isDirty, errors }
    } = useForm<AssessmentFormData>({
        resolver: zodResolver(assessmentSchema),
        defaultValues: {
            name: '',
            type: AssessmentType.HAIL,
            blockId: blockId || '',
            date: new Date(),
            status: AssessmentStatus.PENDING,
            samples: [],
            changeReason: '',
            isActive: true,
            __v: 0,
            ...initialValues
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'samples'
    });

    const watchedValues = watch();
    const watchedSamples = watch('samples');

    // Keep a stable ref to the callback to avoid breaking debounce if prop changes referentially
    const onValuesChangeRef = useRef(onValuesChange);
    useEffect(() => {
        onValuesChangeRef.current = onValuesChange;
    }, [onValuesChange]);


    // Debounced notification of value changes (Standard Pattern)
    const debouncedOnValuesChange = useMemo(
        () =>
            debounce((val: Partial<AssessmentFormData>) => {
                if (onValuesChangeRef.current) {
                    onValuesChangeRef.current(val);
                }
            }, 500),
        []
    );

    useEffect(() => {
        if (!onValuesChange) return;
        debouncedOnValuesChange(watchedValues as Partial<AssessmentFormData>);
    }, [watchedValues, debouncedOnValuesChange, onValuesChange]);

    // Notify parent of dirty state
    useEffect(() => {
        if (onDirtyChange) {
            onDirtyChange(isDirty);
        }
    }, [isDirty, onDirtyChange]);

    // Initialize Form Data (Standard Pattern)
    useEffect(() => {
        if (assessment && (isEditing || isViewing)) {
            reset({
                name: assessment.name,
                type: assessment.type,
                blockId: typeof assessment.blockId === 'object' ? assessment.blockId._id : assessment.blockId,
                date: new Date(assessment.date),
                status: assessment.status,
                samples: assessment.samples || [],
                changeReason: '', // Reset change reason on load
                isActive: assessment.isActive,
                __v: assessment.__v
            });
        } else if (isCreating) {
            reset({
                name: initialValues?.name || '',
                type: initialValues?.type || AssessmentType.HAIL,
                blockId: initialValues?.blockId || blockId || '',
                date: initialValues?.date || new Date(),
                status: AssessmentStatus.PENDING,
                samples: initialValues?.samples || [],
                changeReason: '',
                isActive: true,
                __v: 0,
                ...initialValues
            });
        }
    }, [assessment, mode, isEditing, isViewing, isCreating, blockId, reset]);

    // Handle Submit Wrapper (Standard Pattern)
    const handleFormSubmit = (values: AssessmentFormData) => {
        onSubmit(values);
    };

    // Calculate Projected Summary
    const projectedSummary = useMemo(() => {
        const samples = watchedSamples || [];
        const totalSamples = samples.length;
        const totalFruit = samples.reduce((sum, s) => sum + (Number(s.totalFruit) || 0), 0);
        const totalDamaged = samples.reduce((sum, s) => sum + (Number(s.damagedFruit) || 0), 0);
        const averageDamagePercentage = totalFruit > 0 ? (totalDamaged / totalFruit) * 100 : 0;

        return { totalSamples, totalFruit, totalDamaged, averageDamagePercentage };
    }, [watchedSamples]);

    // Check if form should be locked (Completed status requires special handling)
    const isCompleted = assessment?.status === AssessmentStatus.COMPLETED;
    const canEditCompleted = can(PERMISSIONS.ASSESSMENT_EDIT);
    const isFormLocked = isLoading || isViewing || (isCompleted && !canEditCompleted && isEditing);


    const handleClear = () => {
        reset({
            name: '',
            type: AssessmentType.HAIL,
            blockId: blockId || '',
            date: new Date(),
            status: AssessmentStatus.PENDING,
            samples: [],
        });
    };


    const tabs = useMemo(() => [
        {
            label: 'Audit Trail',
            value: 'audit',
            icon: <IconHistory size="1.3rem" />,
            disabled: isCreating,
            component: (
                <Box sx={{ mt: 2 }}>
                    {assessment?._id ? (
                        <ResourceAuditTable resource="Assessment" resourceId={assessment._id} />
                    ) : (
                        <Typography color="textSecondary">Audit trail is only available for existing records.</Typography>
                    )}
                </Box>
            )
        }
    ],
        [assessment, isCreating]
    );

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)}>
            <Grid container spacing={3}>
                {/* Context Section */}
                <Grid size={12}>
                    <SubCard title="Context">
                        <Grid container spacing={2}>
                            <Grid size={12}>
                                <Controller
                                    name="name"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Assessment Name"
                                            error={!!errors.name}
                                            helperText={errors.name?.message}
                                            disabled={isFormLocked}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={12}>
                                <Controller
                                    name="date"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            {...field}
                                            label="Assessment Date"
                                            slotProps={{
                                                textField: {
                                                    fullWidth: true,
                                                    error: !!errors.date,
                                                    helperText: errors.date?.message as string
                                                }
                                            }}
                                            disabled={isFormLocked}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={12}>
                                <Controller
                                    name="blockId"
                                    control={control}
                                    render={({ field }) => (
                                        <Autocomplete
                                            options={blocks}
                                            getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
                                            isOptionEqualToValue={(option, value) => option._id === value._id}
                                            value={blocks.find((b) => b._id === field.value) || null}
                                            onChange={(_, newValue) => field.onChange(newValue ? newValue._id : null)}
                                            disabled={isFormLocked || !!blockId}
                                            loading={isLoadingBlocks}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Block"
                                                    error={!!errors.blockId}
                                                    helperText={errors.blockId?.message}
                                                />
                                            )}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={12}>
                                <Controller
                                    name="type"
                                    control={control}
                                    render={({ field }) => (
                                        <Autocomplete
                                            options={Object.values(AssessmentType)}
                                            value={field.value}
                                            onChange={(_, newValue) => field.onChange(newValue as AssessmentType)}
                                            disableClearable
                                            disabled={isFormLocked}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Type"
                                                    error={!!errors.type}
                                                    helperText={errors.type?.message}
                                                />
                                            )}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </SubCard>
                </Grid>

                {/* Reason for Change (Only if Completed) */}
                {isCompleted && isEditing && (
                    <Grid size={12}>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            This record is COMPLETED. Any changes will be audited.
                        </Alert>
                        <Controller
                            name="changeReason"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="Reason for Change"
                                    required
                                    error={!!errors.changeReason}
                                    helperText={errors.changeReason?.message}
                                />
                            )}
                        />
                    </Grid>
                )}

                {/* Summary Stats */}
                <Grid size={12}>
                    <Grid container spacing={2}>
                        <Grid size={12}>
                            <SubCard title="Saved Summary (Server)">
                                {assessment?.summary ? (
                                    <Stack spacing={1}>
                                        <Typography variant="body2">Total Samples: {assessment.summary.totalSamples}</Typography>
                                        <Typography variant="body2">Total Fruit: {assessment.summary.totalFruit}</Typography>
                                        <Typography variant="body2">Total Damaged: {assessment.summary.totalDamaged}</Typography>
                                        <Typography
                                            variant="subtitle1"
                                            color={assessment.summary.averageDamagePercentage > 0 ? 'error' : 'inherit'}
                                        >
                                            Damage: {assessment.summary.averageDamagePercentage.toFixed(2)}%
                                        </Typography>
                                    </Stack>
                                ) : (
                                    <Typography color="textSecondary" variant="caption">
                                        No summary available
                                    </Typography>
                                )}
                            </SubCard>
                        </Grid>
                        <Grid size={12}>
                            <SubCard title="Projected Summary (Live)">
                                <Stack spacing={1}>
                                    <Typography variant="body2">Total Samples: {projectedSummary.totalSamples}</Typography>
                                    <Typography variant="body2">Total Fruit: {projectedSummary.totalFruit}</Typography>
                                    <Typography variant="body2">Total Damaged: {projectedSummary.totalDamaged}</Typography>
                                    <Typography
                                        variant="subtitle1"
                                        color={projectedSummary.averageDamagePercentage > 0 ? 'error' : 'inherit'}
                                    >
                                        Damage: {projectedSummary.averageDamagePercentage.toFixed(2)}%
                                    </Typography>
                                </Stack>
                            </SubCard>
                        </Grid>
                    </Grid>
                </Grid>

                {/* Samples Grid */}
                <Grid size={12}>
                    <SubCard
                        title="Samples"
                        secondary={
                            !isFormLocked && (
                                <Button
                                    variant="outlined"
                                    startIcon={<IconPlus size={18} />}
                                    onClick={() => append({ rowNumber: fields.length + 1, totalFruit: 0, damagedFruit: 0 })}
                                    size="small"
                                >
                                    Add Sample
                                </Button>
                            )
                        }
                    >
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell width="10%">Row #</TableCell>
                                        <TableCell width="40%">Total Fruit</TableCell>
                                        <TableCell width="40%">Damaged Fruit</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {fields.map((field, index) => (
                                        <TableRow key={field.id}>
                                            <TableCell>
                                                <Controller
                                                    name={`samples.${index}.rowNumber`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <TextField {...field} size="small" type="number" variant="standard" disabled={isFormLocked} />
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Controller
                                                    name={`samples.${index}.totalFruit`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            size="small"
                                                            type="number"
                                                            fullWidth
                                                            error={!!errors.samples?.[index]?.totalFruit}
                                                            disabled={isFormLocked}
                                                        />
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Controller
                                                    name={`samples.${index}.damagedFruit`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <TextField
                                                            {...field}
                                                            size="small"
                                                            type="number"
                                                            fullWidth
                                                            error={!!errors.samples?.[index]?.damagedFruit}
                                                            disabled={isFormLocked}
                                                        />
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                {!isFormLocked && (
                                                    <IconButton size="small" color="error" onClick={() => remove(index)}>
                                                        <IconTrash size={18} />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {fields.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">
                                                <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>
                                                    No samples added yet. Click &quot;Add Sample&quot; to begin.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {errors.samples && (
                            <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                                {errors.samples.message}
                            </Typography>
                        )}
                    </SubCard>
                </Grid>
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
                                    <Button type="submit" variant="contained" color="primary" disabled={isFormLocked}>
                                        {isEditing ? 'Update Block' : 'Create Block'}
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

export default AssessmentForm;
