import { useEffect, useMemo, memo, useState, SyntheticEvent, useRef } from 'react';
import { debounce } from 'lodash-es';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    TextField,
    Button,
    FormControlLabel,
    Switch,
    Box,
    Grid,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    Stack,
    Typography,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    InputAdornment,
    Tooltip,
    useTheme
} from '@mui/material';
import { IconChevronDown, IconSearch, IconInfoCircle } from '@tabler/icons-react';

// Project Imports
import { Role } from 'types/iam/role.types';
import { roleSchema, RoleFormData } from 'types/iam/role.schema';

import { VisibilityScope, DOMAIN_MAPPING, PERMISSIONS } from 'constants/permissions';
import { usePermission } from 'contexts/AuthContext';

import ResourceRelatedTabs from 'ui-component/extended/ResourceRelatedTabs';
import ResourceAuditTable from 'ui-component/extended/ResourceAuditTable';

import { getGroupedPermissions, parsePermission } from 'utils/permission-helper';
import { IconHistory, IconLockAccess } from '@tabler/icons-react';

export type RoleFormMode = 'create' | 'edit' | 'view';

interface RoleFormProps {
    mode: RoleFormMode;
    role?: Role | null;
    initialValues?: Partial<RoleFormData>;
    onSubmit: (values: any) => void;
    isLoading: boolean;
    onCancel: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    onValuesChange?: (values: Partial<RoleFormData>) => void;
}

const ACTION_COLUMNS = ['View', 'Create', 'Edit', 'Delete', 'ManageInactive'];

// Memoized Permission Table to prevent unnecessary re-renders
interface PermissionTableProps {
    currentPermissions: string[];
    onChange: (permissions: string[]) => void;
    isViewing: boolean;
    resources: string[];
    groupedPermissions: Record<string, string[]>;
    getPermissionString: (resource: string, action: string) => string | undefined;
}

const PermissionTable = memo(({
    currentPermissions,
    onChange,
    isViewing,
    resources,
    groupedPermissions,
    getPermissionString
}: PermissionTableProps) => {

    const togglePermission = (perm: string) => {
        if (currentPermissions.includes(perm)) {
            onChange(currentPermissions.filter(p => p !== perm));
        } else {
            onChange([...currentPermissions, perm]);
        }
    };

    const toggleResource = (resource: string, perms: string[]) => {
        const allSelected = perms.every(p => currentPermissions.includes(p));
        if (allSelected) {
            // Deselect all
            onChange(currentPermissions.filter(p => !perms.includes(p)));
        } else {
            // Select all (add missing)
            const missing = perms.filter(p => !currentPermissions.includes(p));
            onChange([...currentPermissions, ...missing]);
        }
    };

    return (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Resource</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>All</TableCell>
                        {ACTION_COLUMNS.map(col => <TableCell key={col} align="center" sx={{ fontWeight: 600 }}>{col}</TableCell>)}
                        <TableCell align="center" sx={{ fontWeight: 600 }}>Other</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {resources.map(resource => {
                        const resourcePerms = groupedPermissions[resource] || [];
                        const standardPerms = ACTION_COLUMNS.map(action => getPermissionString(resource, action)).filter(Boolean) as string[];
                        const otherPerms = resourcePerms.filter(p => !standardPerms.includes(p));
                        const allRowPerms = [...standardPerms, ...otherPerms];
                        const isAllSelected = allRowPerms.length > 0 && allRowPerms.every(p => currentPermissions.includes(p));
                        const isIndeterminate = allRowPerms.some(p => currentPermissions.includes(p)) && !isAllSelected;

                        return (
                            <TableRow key={resource} hover>
                                <TableCell component="th" scope="row">
                                    <Typography variant="subtitle2">{resource}</Typography>
                                </TableCell>
                                <TableCell align="center">
                                    <Checkbox
                                        checked={isAllSelected}
                                        indeterminate={isIndeterminate}
                                        onChange={() => toggleResource(resource, allRowPerms)}
                                        disabled={isViewing}
                                    />
                                </TableCell>
                                {ACTION_COLUMNS.map(action => {
                                    const permString = getPermissionString(resource, action);
                                    return (
                                        <TableCell key={action} align="center">
                                            {permString ? (
                                                <Checkbox
                                                    checked={currentPermissions.includes(permString)}
                                                    onChange={() => togglePermission(permString)}
                                                    disabled={isViewing}
                                                />
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">-</Typography>
                                            )}
                                        </TableCell>
                                    );
                                })}
                                <TableCell align="center">
                                    {otherPerms.length > 0 && (
                                        <Stack direction="row" flexWrap="wrap" justifyContent="center">
                                            {otherPerms.map(p => (
                                                <FormControlLabel
                                                    key={p}
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={currentPermissions.includes(p)}
                                                            onChange={() => togglePermission(p)}
                                                            disabled={isViewing}
                                                        />
                                                    }
                                                    label={<Typography variant="caption">{parsePermission(p).action}</Typography>}
                                                />
                                            ))}
                                        </Stack>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
});

const RoleForm = ({
    mode,
    role,
    initialValues,
    onSubmit,
    isLoading,
    onCancel,
    onDirtyChange,
    onValuesChange,
}: RoleFormProps) => {
    const isEditing = mode === 'edit';
    const isCreating = mode === 'create';
    const isViewing = mode === 'view';

    const { can } = usePermission();

    const theme = useTheme();

    // Search state
    const [searchTerm, setSearchTerm] = useState('');

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { isDirty, errors },
    } = useForm<RoleFormData>({
        resolver: zodResolver(roleSchema),
        defaultValues: {
            name: '',
            description: '',
            visibilityScope: VisibilityScope.CLIENT,
            permissions: [],
            isActive: true,
            __v: 0,
            ...initialValues,
        },
    });

    // Keep a stable ref to the callback to avoid breaking debounce if prop changes referentially
    const onValuesChangeRef = useRef(onValuesChange);
    useEffect(() => {
        onValuesChangeRef.current = onValuesChange;
    }, [onValuesChange]);


    // Create a debounced version of the change handler
    const debouncedOnValuesChange = useMemo(
        () =>
            debounce((val: Partial<RoleFormData>) => {
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
            debouncedOnValuesChange(value as Partial<RoleFormData>);
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
        if (role && (isEditing || isViewing)) {
            reset({
                name: role.name,
                description: role.description || '',
                visibilityScope: role.visibilityScope,
                permissions: role.permissions,
                isActive: role.isActive,
                __v: role.__v,
            });
        } else if (isCreating) {
            reset({
                name: initialValues?.name || '',
                description: initialValues?.description || '',
                visibilityScope: initialValues?.visibilityScope || VisibilityScope.CLIENT,
                permissions: initialValues?.permissions || [],
                isActive: true,
                __v: 0,
                ...initialValues
            });
        }
    }, [role, mode, isEditing, isViewing, isCreating, reset]);

    const handleFormSubmit = (values: RoleFormData) => {
        if (mode === 'create') {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { isActive, __v, ...createData } = values;
            onSubmit(createData);
        } else if (mode === 'edit') {
            onSubmit({
                ...values,
                __v: role?.__v
            });
        }
    };

    const handleClear = () => {
        reset({
            name: '',
            description: '',
            visibilityScope: VisibilityScope.CLIENT,
            permissions: [],
            isActive: true,
            __v: 0,
        });
    };

    const groupedPermissions = useMemo(() => {
        return getGroupedPermissions();
    }, []);

    const allResources = useMemo(() => Object.keys(groupedPermissions), [groupedPermissions]);

    const getPermissionString = (resource: string, action: string) => {
        const perms = groupedPermissions[resource] || [];
        return perms.find(p => parsePermission(p).action.toLowerCase() === action.toLowerCase() || p.toLowerCase().includes(`:${action.toLowerCase()}`));
    };

    const isSubmitDisabled = isLoading || (!isDirty && !isCreating) || isViewing;

    // Define tabs
    const tabs = useMemo(() => [
        {
            label: 'Permissions',
            value: 'permissions',
            icon: <IconLockAccess size="1.3rem" />,
            component: (
                <Grid container spacing={3}>
                    <Grid size={12}>
                        <Box sx={{ mb: 2 }}>
                            <TextField
                                fullWidth
                                placeholder="Search permissions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <IconSearch size={18} />
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                                size="small"
                            />
                        </Box>

                        <Controller
                            name="permissions"
                            control={control}
                            render={({ field }) => {
                                const currentPermissions = field.value || [];

                                return (
                                    <Box>
                                        {Object.entries(DOMAIN_MAPPING).map(([domain, resources]) => {
                                            // Filter resources based on search term
                                            const visibleResources = resources.filter(res => {
                                                // Check resource name
                                                if (res.toLowerCase().includes(searchTerm.toLowerCase())) return true;
                                                // Check permission strings
                                                const perms = groupedPermissions[res] || [];
                                                return perms.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
                                            });

                                            // Filter resources to only those that actually exist in our mapped permissions
                                            const validResources = visibleResources.filter(res => allResources.includes(res));

                                            if (validResources.length === 0) return null;

                                            // Calculate indeterminate/checked state for domain
                                            const domainPerms: string[] = [];
                                            validResources.forEach(res => {
                                                domainPerms.push(...(groupedPermissions[res] || []));
                                            });

                                            const isAllDomainSelected = domainPerms.length > 0 && domainPerms.every(p => currentPermissions.includes(p));
                                            const isDomainIndeterminate = domainPerms.some(p => currentPermissions.includes(p)) && !isAllDomainSelected;

                                            const handleDomainToggle = (e: SyntheticEvent) => {
                                                e.stopPropagation();
                                                if (isViewing) return;

                                                if (isAllDomainSelected) {
                                                    // Deselect all
                                                    field.onChange(currentPermissions.filter(p => !domainPerms.includes(p)));
                                                } else {
                                                    // Select all (merge)
                                                    const missing = domainPerms.filter(p => !currentPermissions.includes(p));
                                                    field.onChange([...currentPermissions, ...missing]);
                                                }
                                            };

                                            return (
                                                <Accordion key={domain} defaultExpanded disableGutters>
                                                    <AccordionSummary expandIcon={<IconChevronDown size={20} />}>
                                                        <Box display="flex" alignItems="center" onClick={(e) => e.stopPropagation()}>
                                                            <Checkbox
                                                                checked={isAllDomainSelected}
                                                                indeterminate={isDomainIndeterminate}
                                                                onChange={handleDomainToggle}
                                                                disabled={isViewing}
                                                            />
                                                            <Typography variant="subtitle1">{domain}</Typography>
                                                        </Box>
                                                    </AccordionSummary>
                                                    <AccordionDetails sx={{ p: 0 }}>
                                                        <PermissionTable
                                                            currentPermissions={currentPermissions}
                                                            onChange={field.onChange}
                                                            isViewing={isViewing}
                                                            resources={validResources}
                                                            groupedPermissions={groupedPermissions}
                                                            getPermissionString={getPermissionString}
                                                        />
                                                    </AccordionDetails>
                                                </Accordion>
                                            );
                                        })}
                                    </Box>
                                );
                            }}
                        />
                    </Grid>
                </Grid>
            )
        },
        {
            label: 'Audit Trail',
            value: 'audit',
            icon: <IconHistory size="1.3rem" />,
            disabled: isCreating,
            component: (
                <Box sx={{ mt: 2 }}>
                    {role?._id ? (
                        <ResourceAuditTable resource="Role" resourceId={role._id} />
                    ) : (
                        <Typography color="textSecondary">Audit trail is only available for existing records.</Typography>
                    )}
                </Box>
            )
        }
    ], [control, isCreating, isViewing, role, searchTerm, groupedPermissions, allResources, getPermissionString]);

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)}>
            <Grid container spacing={2}>
                <Grid size={12}>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Role Name"
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
                        name="visibilityScope"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                select
                                label="Visibility Scope"
                                fullWidth
                                error={!!errors.visibilityScope}
                                helperText={errors.visibilityScope?.message}
                                disabled={isViewing}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Tooltip
                                                title={
                                                    <Box sx={{ p: 1 }}>
                                                        <Typography
                                                            variant="subtitle2"
                                                            sx={{
                                                                mb: 1,
                                                                fontWeight: 600,
                                                                color: theme.palette.mode === 'dark' ? 'common.black' : 'common.white'
                                                            }}
                                                        >
                                                            Scope Definitions
                                                        </Typography>
                                                        <Stack spacing={0.5}>
                                                            <Typography
                                                                variant="caption"
                                                                display="block"
                                                                sx={{ color: theme.palette.mode === 'dark' ? 'common.black' : 'common.white' }}
                                                            >
                                                                • <strong>Global:</strong> Visible across all subsidiaries.
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                display="block"
                                                                sx={{ color: theme.palette.mode === 'dark' ? 'common.black' : 'common.white' }}
                                                            >
                                                                • <strong>Subsidiary:</strong> Restricted to current subsidiary.
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                display="block"
                                                                sx={{ color: theme.palette.mode === 'dark' ? 'common.black' : 'common.white' }}
                                                            >
                                                                • <strong>Client:</strong> Limited to specific client context.
                                                            </Typography>
                                                        </Stack>
                                                    </Box>
                                                }
                                                arrow
                                                placement="right"
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                                                    <IconInfoCircle size="1.2rem" />
                                                </Box>
                                            </Tooltip>
                                        </InputAdornment>
                                    )
                                }}
                            >
                                {Object.values(VisibilityScope).map((scope) => (
                                    <MenuItem key={scope} value={scope}>
                                        {scope}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}
                    />
                </Grid>
                <Grid size={12}>
                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Description"
                                fullWidth
                                multiline
                                rows={2}
                                error={!!errors.description}
                                helperText={errors.description?.message}
                                disabled={isViewing}
                            />
                        )}
                    />
                </Grid>
                {!isCreating && can(PERMISSIONS.ROLE_MANAGE_INACTIVE) && (
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

            {/* Actions for Details and Permissions tabs */}
            {!isViewing && (
                <Box sx={{ mt: 3 }}>
                    <Grid container>
                        <Grid size={12}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                {isCreating ? (
                                    <Button
                                        variant="text"
                                        color="error"
                                        onClick={handleClear}
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
                                        {isEditing ? 'Update Role' : 'Create Role'}
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

export default RoleForm;
