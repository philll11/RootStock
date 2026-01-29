import { useState, SyntheticEvent } from 'react';
import { 
    Box, Stack, Typography, Switch, FormControlLabel, Divider, 
    Tabs, Tab, useMediaQuery, useTheme 
} from '@mui/material';
import { IconSettings, IconShieldLock } from '@tabler/icons-react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import SubCard from 'ui-component/cards/SubCard';
import { useGetSystemConfig, useUpdateSystemConfig } from 'hooks/system/useConfig';
import { AuditConfig } from 'api/system/config';
import { usePermission } from 'contexts/AuthContext';
import { PERMISSIONS } from 'constants/permissions';

// Tab Panel Helper
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`vertical-tabpanel-${index}`}
            aria-labelledby={`vertical-tab-${index}`}
            {...other}
            style={{ width: '100%' }}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `vertical-tab-${index}`,
        'aria-controls': `vertical-tabpanel-${index}`
    };
}

const SystemSettingsPage = () => {
    const theme = useTheme();
    const matchDownMD = useMediaQuery(theme.breakpoints.down('md'));
    const [value, setValue] = useState(0);
    const { can } = usePermission();
    const canEdit = can(PERMISSIONS.SYSTEM_CONFIG_EDIT);

    const handleChange = (event: SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    // --- Config Data ---
    const { data: auditConfig, isLoading: isAuditLoading } = useGetSystemConfig<AuditConfig>('audit');
    const { mutate: updateConfig, isPending: isUpdating } = useUpdateSystemConfig();

    const handleAuditToggle = (checked: boolean) => {
        if (!auditConfig) return;
        updateConfig({
            key: 'audit',
            data: {
                value: {
                    ...auditConfig.value,
                    enabled: checked
                }
            }
        });
    };

    return (
        <MainCard title="System Settings" content={false}>
            <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', height: '100%', minHeight: 'calc(100vh - 200px)' }}>
                {/* Vertical Tabs */}
                <Tabs
                    orientation="vertical"
                    variant="scrollable"
                    value={value}
                    onChange={handleChange}
                    aria-label="System Settings Tabs"
                    sx={{ 
                        borderRight: 1, 
                        borderColor: 'divider',
                        minWidth: 200,
                        '& .MuiTab-root': { minHeight: 60, display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }
                    }}
                >
                    <Tab 
                        icon={<IconSettings size={18} />} 
                        iconPosition="start" 
                        label="General" 
                        {...a11yProps(0)} 
                    />
                    
                    <Tab 
                        icon={<IconSettings size={18} />} 
                        iconPosition="start" 
                        label="Soemthing Else" 
                        {...a11yProps(0)} 
                    />
                    {/* Future configuration tabs can be added here */}
                    {/* <Tab label="Notifications" {...a11yProps(1)} /> */}
                </Tabs>

                {/* --- Tab 0: General System Settings --- */}
                <TabPanel value={value} index={0}>
                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="h4" gutterBottom>General Configuration</Typography>
                            <Typography variant="body2" color="textSecondary">
                                Manage global system behaviors and logging policies.
                            </Typography>
                        </Box>

                        <Divider />

                        <SubCard title="Audit Logging">
                             <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="subtitle1">Enable Global Audit Trail</Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        When enabled, all critical changes (Create, Update, Delete) to resources will be logged.
                                    </Typography>
                                </Box>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={auditConfig?.value?.enabled ?? false}
                                            onChange={(e) => handleAuditToggle(e.target.checked)}
                                            disabled={!canEdit || isUpdating || isAuditLoading}
                                            name="audit-toggle"
                                            color="primary"
                                        />
                                    }
                                    label={auditConfig?.value?.enabled ? "On" : "Off"}
                                />
                            </Stack>
                        </SubCard>
                        
                        {/* Add more general system settings here as needed */}
                    </Stack>
                </TabPanel>
            </Box>
        </MainCard>
    );
};

export default SystemSettingsPage;
