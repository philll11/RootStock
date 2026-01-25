import { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Chip, Stack, ChipProps } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

// project imports
import { useGetAuditHistory } from 'hooks/system/useAudit';
import { AuditAction, AuditChange } from 'api/system/audit.types';
import DataGridWrapper from 'ui-component/extended/DataGridWrapper';
import UserAvatar from 'ui-component/extended/Avatar';

// types
export interface ResourceAuditTableProps {
    resource: string;
    resourceId: string;
}

interface FlatAuditEntry extends Omit<AuditChange, 'field' | 'oldValue' | 'newValue'> {
    id: string; // DataGrid requires 'id'
    originalEntryId: string;
    date: string;
    action: AuditAction;
    reason?: string;
    userId: any; // Populated User or ID
    field: string;
    oldValue: any;
    newValue: any;
}

// --- Helper Functions ---
const getActionColor = (action: AuditAction): ChipProps['color'] => {
    switch (action) {
        case AuditAction.CREATE: return 'success';
        case AuditAction.UPDATE: return 'warning';
        case AuditAction.DELETE: return 'error';
        case AuditAction.REOPEN: return 'info';
        default: return 'default';
    }
};

const formatValue = (value: any) => {
    if (value === null || value === undefined) return <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>Empty</Typography>;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    // Check for ISO Date
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return new Date(value).toLocaleString();
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

export const ResourceAuditTable = ({ resource, resourceId }: ResourceAuditTableProps) => {
    const theme = useTheme();
    const { data: auditEntries, isLoading } = useGetAuditHistory(resource, resourceId);

    // 1. Flatten Data Structure
    const flatEntries: FlatAuditEntry[] = useMemo(() => {
        if (!auditEntries) return [];
        return auditEntries.flatMap((entry, index) => {
            const base = {
                originalEntryId: entry._id,
                date: entry.date,
                action: entry.action,
                reason: entry.reason,
                userId: entry.userId,
            };

            // If there are changes, map them to rows
            if (entry.changes && entry.changes.length > 0) {
                return entry.changes.map((change, changeIndex) => ({
                    ...base,
                    id: `${entry._id || index}_${changeIndex}`,
                    field: change.field,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                }));
            }

            // Fallback for actions with no specific field changes (e.g., initial create or delete snapshot)
            return [{
                ...base,
                id: `${entry._id || index}_0`,
                field: '-',
                oldValue: null,
                newValue: null,
            }];
        });
    }, [auditEntries]);

    // 2. Define Columns
    const columns: GridColDef[] = [
        {
            field: 'date',
            headerName: 'Date',
            width: 200,
            renderCell: (params: GridRenderCellParams) => (
                <Stack>
                    <Typography variant="body2">{new Date(params.value).toLocaleDateString()}</Typography>
                    <Typography variant="caption" color="textSecondary">{new Date(params.value).toLocaleTimeString()}</Typography>
                </Stack>
            )
        },
        {
            field: 'action',
            headerName: 'Action',
            width: 120,
            renderCell: (params: GridRenderCellParams) => (
                <Chip
                    label={params.value}
                    color={getActionColor(params.value as AuditAction)}
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                />
            )
        },
        {
            field: 'userId', // Accessor for User
            headerName: 'User',
            width: 200,
            renderCell: (params: GridRenderCellParams) => {
                const user = params.value;
                const userName = typeof user === 'object' && user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
                return (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ height: '100%' }}>
                        <UserAvatar
                            alt={userName}
                            sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                            color="primary"
                        >
                            {/* Fallback initials if no image - MUI Avatar handles this with 'alt' or children */}
                            {userName.charAt(0)}
                        </UserAvatar>
                        <Typography variant="body2">{userName}</Typography>
                    </Stack>
                );
            }
        },
        {
            field: 'field',
            headerName: 'Field Changed',
            width: 250,
            renderCell: (params: GridRenderCellParams) => {
                const entry = params.row as FlatAuditEntry;
                const isUpdate = entry.action === AuditAction.UPDATE;
                const wasEmpty = entry.oldValue === null || entry.oldValue === undefined || entry.oldValue === '';
                const isEmptyNow = entry.newValue === null || entry.newValue === undefined || entry.newValue === '';

                let badge = null;
                if (isUpdate) {
                    if (wasEmpty && !isEmptyNow) {
                        badge = <Chip label="ADDED" color="success" size="small" sx={{ height: 16, fontSize: '0.625rem', ml: 1 }} />;
                    } else if (!wasEmpty && isEmptyNow) {
                        badge = <Chip label="REMOVED" color="error" size="small" sx={{ height: 16, fontSize: '0.625rem', ml: 1 }} />;
                    }
                }

                return (
                    <Stack direction="row" alignItems="center" sx={{ height: '100%' }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {params.value !== '-' ? params.value.replace(/([A-Z])/g, ' $1').trim() : '-'}
                        </Typography>
                        {badge}
                    </Stack>
                );
            }
        },
        {
            field: 'oldValue',
            headerName: 'Old Value',
            width: 200,
            renderCell: (params: GridRenderCellParams) => (
                <Box sx={{
                    color: theme.palette.text.secondary,
                    textDecoration: 'line-through',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                }}>
                    {formatValue(params.value)}
                </Box>
            )
        },
        {
            field: 'newValue',
            headerName: 'New Value',
            width: 200,
            renderCell: (params: GridRenderCellParams) => (
                <Box sx={{
                    color: theme.palette.text.primary,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    fontWeight: 500
                }}>
                    {formatValue(params.value)}
                </Box>
            )
        }
    ];

    return (
        <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
            <DataGridWrapper
                title="" // No title needed inside tabs
                rows={flatEntries}
                columns={columns}
                loading={isLoading}
                checkboxSelection={false}
                sx={{ border: 'none' }} // Seamless integration
            />
        </Box>
    );
};

export default ResourceAuditTable;
