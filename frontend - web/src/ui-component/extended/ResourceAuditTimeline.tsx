import { Fragment } from 'react';
import { useTheme } from '@mui/material/styles';
import { 
    Box, Stack, Typography, Chip, Paper, Divider, 
    Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { 
    IconHistory, IconPencil, IconPlus, IconTrash, IconRotate, IconChevronDown 
} from '@tabler/icons-react';

// project imports
import { useGetAuditHistory } from 'hooks/system/useAudit';
import { AuditAction, AuditChange, AuditEntry } from 'api/system/audit.types';
import UserAvatar from 'ui-component/extended/Avatar';
import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';

// types
export interface ResourceAuditTimelineProps {
    resource: string;
    resourceId: string;
}

// --- Helper Functions ---
const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};

const getActionColor = (action: AuditAction, theme: any) => {
    switch (action) {
        case AuditAction.CREATE: return theme.palette.success.main;
        case AuditAction.UPDATE: return theme.palette.warning.main;
        case AuditAction.DELETE: return theme.palette.error.main;
        case AuditAction.REOPEN: return theme.palette.info.main;
        default: return theme.palette.grey[500];
    }
};

const getActionIcon = (action: AuditAction) => {
    switch (action) {
        case AuditAction.CREATE: return <IconPlus size="1.1rem" />;
        case AuditAction.UPDATE: return <IconPencil size="1.1rem" />;
        case AuditAction.DELETE: return <IconTrash size="1.1rem" />;
        case AuditAction.REOPEN: return <IconRotate size="1.1rem" />;
        default: return <IconHistory size="1.1rem" />;
    }
};

const formatValue = (val: any) => {
    if (val === null || val === undefined) return <em>null</em>;
    if (typeof val === 'object') return JSON.stringify(val); // Simplistic for now
    if (typeof val === 'boolean') return val ? 'True' : 'False';
    return String(val);
};

// --- Sub-Components ---
const ChangeDiff = ({ change }: { change: AuditChange }) => {
    const theme = useTheme();
    
    return (
        <Box sx={{ p: 1, border: '1px solid', borderColor: theme.palette.divider, borderRadius: 1, mb: 1, bgcolor: theme.palette.background.default }}>
             <Typography variant="subtitle2" sx={{ mb: 0.5, textTransform: 'capitalize' }}>
                {change.field.replace(/([A-Z])/g, ' $1').trim()}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                <Typography 
                    variant="body2" 
                    sx={{ 
                        textDecoration: 'line-through', 
                        color: theme.palette.error.main,
                        bgcolor: theme.palette.error.light,
                        px: 0.5, borderRadius: 0.5 
                    }}
                >
                    {formatValue(change.oldValue)}
                </Typography>
                <Typography variant="body2" color="text.secondary">→</Typography>
                <Typography 
                    variant="body2" 
                    sx={{ 
                        fontWeight: 'bold', 
                        color: theme.palette.success.dark,
                        bgcolor: theme.palette.success.light,
                        px: 0.5, borderRadius: 0.5
                    }}
                >
                    {formatValue(change.newValue)}
                </Typography>
            </Stack>
        </Box>
    );
};

const AuditItem = ({ entry, isLast }: { entry: AuditEntry, isLast: boolean }) => {
    const theme = useTheme();
    const actionColor = getActionColor(entry.action, theme);
    
    // Resolve User Name
    // Safe check if userId is populated object or just string
    const userName = typeof entry.userId === 'object' && entry.userId !== null
        ? `${(entry.userId as any).firstName} ${(entry.userId as any).lastName}`
        : 'Unknown User';

    return (
        <Stack direction="row" spacing={3} sx={{ position: 'relative', pb: isLast ? 0 : 3 }}>
            {/* Timeline Line */}
            {!isLast && (
                <Box 
                    sx={{ 
                        position: 'absolute', 
                        left: 20, 
                        top: 40, 
                        bottom: -10, 
                        width: 2, 
                        bgcolor: theme.palette.divider,
                        zIndex: 0
                    }} 
                />
            )}

            {/* Icon/Avatar Node */}
            <Box sx={{ position: 'relative', zIndex: 1 }}>
                 <UserAvatar 
                    sx={{ 
                        bgcolor: theme.palette.background.paper, 
                        border: `2px solid ${actionColor}`,
                        color: actionColor,
                        width: 40, height: 40
                    }}
                 >
                    {getActionIcon(entry.action)}
                 </UserAvatar>
            </Box>

            {/* Content Body */}
            <Box flex={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="subtitle1">
                                {userName}
                            </Typography>
                            <Chip 
                                label={entry.action} 
                                size="small" 
                                sx={{ 
                                    height: 20, 
                                    fontSize: '0.7rem',
                                    bgcolor: actionColor + '20', // 20% opacity
                                    color: actionColor,
                                    fontWeight: 'bold'
                                }} 
                            />
                        </Stack>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            {getTimeAgo(entry.date)} • {new Date(entry.date).toLocaleString()}
                        </Typography>
                    </Box>
                </Stack>
                
                {/* Reason / Metadata */}
                {entry.reason && (
                    <Typography variant="body2" sx={{ mb: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                        "{entry.reason}"
                    </Typography>
                )}

                {/* Changes Accordion if changes exist */}
                {entry.changes && entry.changes.length > 0 && (
                     <Accordion 
                        disableGutters 
                        elevation={0}
                        sx={{ 
                            border: `1px solid ${theme.palette.divider}`,
                            '&:before': { display: 'none' },
                            mt: 1
                        }}
                    >
                        <AccordionSummary expandIcon={<IconChevronDown size="1rem" />}>
                            <Typography variant="body2">
                                {entry.changes.length} Field{entry.changes.length !== 1 ? 's' : ''} Modified
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                            {entry.changes.map((change, idx) => (
                                <ChangeDiff key={idx} change={change} />
                            ))}
                        </AccordionDetails>
                    </Accordion>
                )}

                {/* Snapshot for Delete/Create if no explicit changes listed but we want to show something */}
                 {entry.action === AuditAction.CREATE && entry.changes.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                        Record created.
                    </Typography>
                 )}
            </Box>
        </Stack>
    );
};

const ResourceAuditTimeline = ({ resource, resourceId }: ResourceAuditTimelineProps) => {
    const { data: history, isLoading, error } = useGetAuditHistory(resource, resourceId);

    if (isLoading) return <Box p={3}><Typography>Loading audit trail...</Typography></Box>;
    if (error) return <Box p={3}><Typography color="error">Failed to load audit history.</Typography></Box>;
    if (!history || history.length === 0) return <Box p={3}><Typography color="text.secondary">No audit history found.</Typography></Box>;

    return (
        <Box sx={{ maxWidth: '100%', overflowX: 'hidden' }}>
            {history.map((entry, index) => (
                <AuditItem 
                    key={entry._id || index} 
                    entry={entry} 
                    isLast={index === history.length - 1} 
                />
            ))}
        </Box>
    );
};

export default ResourceAuditTimeline;
