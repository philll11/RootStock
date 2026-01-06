import { useState, useMemo } from 'react';
import { Group, Text, Avatar, Code, Badge } from '@mantine/core';
import { useGetAuditHistory, AuditAction, AuditEntry, AuditChange, AuditUser } from '@rootstock/system/audit/audit-data-access';
import { DataTable, DataTableColumn } from '@rootstock/ui/web';
import { palette } from '@rootstock/ui/theme';
import dayjs from 'dayjs';

interface AuditTableProps {
    resource: string;
    recordId: string;
}

interface FlatAuditEntry extends Omit<AuditChange, 'field' | 'oldValue' | 'newValue'> {
    _id: string; // Composite ID
    originalEntryId: string;
    date: string;
    action: AuditAction;
    reason?: string;
    user: AuditUser | string;
    field: string;
    oldValue: any;
    newValue: any;
}

const getActionColor = (action: AuditAction) => {
    switch (action) {
        case AuditAction.CREATE: return palette.actions.create;
        case AuditAction.UPDATE: return palette.actions.update;
        case AuditAction.DELETE: return palette.actions.delete;
        default: return palette.neutral[500];
    }
};

const formatValue = (value: any) => {
    if (value === null || value === undefined) return <Text c="dimmed" size="xs">Empty</Text>;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    // Check if likely a date string (YMD)
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return dayjs(value).format('DD MMM YYYY, HH:mm');
    }
    if (typeof value === 'object') return <Code fz="xs">{JSON.stringify(value)}</Code>;
    return <Text size='sm'>{value.toString()}</Text>;
};

export const AuditTable = ({ resource, recordId }: AuditTableProps) => {
    const { data: auditEntries, isLoading } = useGetAuditHistory(resource, recordId);

    const flatEntries: FlatAuditEntry[] = useMemo(() => {
        if (!auditEntries) return [];
        return auditEntries.flatMap(entry => {
            // If there are valid changes, map them
            if (entry.changes && entry.changes.length > 0) {
                return entry.changes.map((change, index) => ({
                    ...change,
                    _id: `${entry._id}_${index}`,
                    originalEntryId: entry._id,
                    date: entry.date,
                    action: entry.action,
                    reason: entry.reason,
                    user: entry.userId,
                }));
            }
            // If no changes (e.g. empty delete?), return one row with empty change data
            return [{
                _id: `${entry._id}_0`,
                originalEntryId: entry._id,
                date: entry.date,
                action: entry.action,
                reason: entry.reason,
                user: entry.userId,
                field: '-',
                oldValue: null,
                newValue: null,
            }];
        });
    }, [auditEntries]);

    const [sortState, setSortState] = useState<{
        accessor: string;
        direction: 'asc' | 'desc';
    }>({ accessor: 'date', direction: 'desc' });

    const columns: DataTableColumn<FlatAuditEntry>[] = [
        {
            accessor: 'date',
            title: 'Date',
            sortable: true,
            width: 180,
            render: (entry) => (
                <Text size="sm">{dayjs(entry.date).format('D MMM YYYY, HH:mm')}</Text>
            ),
        },
        {
            accessor: 'action',
            title: 'Action',
            sortable: true,
            width: 120,
            render: (entry) => (
                <Badge color={getActionColor(entry.action)} variant="light">
                    {entry.action}
                </Badge>
            ),
        },
        {
            accessor: 'user',
            title: 'User',
            sortable: true,
            render: (entry) => {
                const user = typeof entry.user === 'object' ? entry.user : { firstName: 'Unknown', lastName: 'User', _id: '?' };
                const userName = `${user.firstName} ${user.lastName}`;
                return (
                    <Group gap="xs">
                        <Avatar size="sm" radius="xl" color="initials" name={userName} />
                        <Text size="sm">{userName}</Text>
                    </Group>
                )
            },
        },
        {
            accessor: 'field',
            title: 'Field',
            sortable: true,
            render: (entry) => <Code>{entry.field}</Code>
        },
        {
            accessor: 'oldValue',
            title: 'Old Value',
            render: (entry) => <Text size="sm" c="dimmed" >{formatValue(entry.oldValue)}</Text>
        },
        {
            accessor: 'newValue',
            title: 'New Value',
            render: (entry) => <Text size="sm">{formatValue(entry.newValue)}</Text>
        }
    ];

    const sortedEntries = flatEntries
        ? [...flatEntries].sort((a, b) => {
            const { accessor, direction } = sortState;

            // Custom sort for User
            if (accessor === 'user') {
                const userA = typeof a.user === 'object' ? `${a.user.firstName} ${a.user.lastName}` : '';
                const userB = typeof b.user === 'object' ? `${b.user.firstName} ${b.user.lastName}` : '';
                return direction === 'asc' ? userA.localeCompare(userB) : userB.localeCompare(userA);
            }

            const aValue = (a as any)[accessor];
            const bValue = (b as any)[accessor];

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        })
        : undefined;

    return (
        <DataTable
            data={sortedEntries}
            columns={columns}
            isLoading={isLoading}
            noDataMessage="No audit history found."
            onSort={(accessor, direction) => setSortState({ accessor, direction })}
            initialSort={sortState}
        />
    );
};
