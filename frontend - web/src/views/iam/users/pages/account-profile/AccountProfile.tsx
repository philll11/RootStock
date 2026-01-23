import { useState, SyntheticEvent, useEffect } from 'react';
import { 
    Box, 
    Tabs, 
    Tab, 
    Grid, 
    TextField, 
    Button, 
    Typography, 
    Stack, 
    useTheme, 
    useMediaQuery,
    Divider,
    Alert
} from '@mui/material';
import { IconUser, IconLock, IconSettings } from '@tabler/icons-react';
import { useForm, Controller } from 'react-hook-form';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import SubCard from 'ui-component/cards/SubCard';
import { useAuth } from 'contexts/AuthContext';
import { useUpdateUser } from 'hooks/iam/useUsers';
import { gridSpacing } from 'store/constant';
import AnimateButton from 'ui-component/extended/AnimateButton';

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

// ==============================| PROFILE TAB |============================== //

const ProfileTab = () => {
    const { user } = useAuth();
    const { mutate: updateUser, isPending } = useUpdateUser();
    
    const { control, handleSubmit, reset } = useForm({
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
        }
    });

    useEffect(() => {
        if (user) {
            reset({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || ''
            });
        }
    }, [user, reset]);

    const onSubmit = (data: any) => {
        if (!user?._id) return;
        updateUser({ 
            id: user._id, 
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                __v: user.__v
            } 
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <SubCard title="Personal Information">
                <Grid container spacing={gridSpacing}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller
                            name="firstName"
                            control={control}
                            rules={{ required: 'First Name is required' }}
                            render={({ field, fieldState: { error } }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="First Name"
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Controller
                            name="lastName"
                            control={control}
                            rules={{ required: 'Last Name is required' }}
                            render={({ field, fieldState: { error } }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="Last Name"
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Controller
                            name="email"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="Email Address"
                                    disabled
                                    helperText="Email cannot be changed directly."
                                />
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Stack direction="row" justifyContent="flex-end">
                            <AnimateButton>
                                <Button variant="contained" type="submit" disabled={isPending}>
                                    Save Changes
                                </Button>
                            </AnimateButton>
                        </Stack>
                    </Grid>
                </Grid>
            </SubCard>
        </form>
    );
};

// ==============================| SECURITY TAB |============================== //

const SecurityTab = () => {
    const { user } = useAuth();
    const { mutate: updateUser, isPending } = useUpdateUser();

    const { control, handleSubmit, watch, reset } = useForm({
        defaultValues: {
            password: '',
            confirmPassword: ''
        }
    });

    const onSubmit = (data: any) => {
        if (!user?._id) return;
        updateUser({ 
            id: user._id, 
            data: {
                password: data.password,
                __v: user.__v
            } 
        }, {
            onSuccess: () => reset()
        });
    };

    const password = watch('password');

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <SubCard title="Change Password">
                <Grid container spacing={gridSpacing}>
                     <Grid size={{ xs: 12 }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Password must be at least 6 characters long.
                        </Alert>
                     </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Controller
                            name="password"
                            control={control}
                            rules={{ 
                                required: 'New Password is required',
                                minLength: { value: 6, message: 'Password must be at least 6 characters' }
                            }}
                            render={({ field, fieldState: { error } }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    type="password"
                                    label="New Password"
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Controller
                            name="confirmPassword"
                            control={control}
                            rules={{ 
                                required: 'Confirm Password is required',
                                validate: (val) => val === password || 'Passwords do not match'
                            }}
                            render={({ field, fieldState: { error } }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    type="password"
                                    label="Confirm New Password"
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Stack direction="row" justifyContent="flex-end">
                            <AnimateButton>
                                <Button variant="contained" type="submit" disabled={isPending}>
                                    Change Password
                                </Button>
                            </AnimateButton>
                        </Stack>
                    </Grid>
                </Grid>
            </SubCard>
        </form>
    );
};

// ==============================| MAIN PAGE |============================== //

const AccountProfile = () => {
    const theme = useTheme();
    const [value, setValue] = useState(0);

    const handleChange = (event: SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <MainCard title="Account Settings" content={false}>
            <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', height: '100%', minHeight: 'calc(100vh - 200px)' }}>
                <Tabs
                    orientation="vertical"
                    variant="scrollable"
                    value={value}
                    onChange={handleChange}
                    aria-label="Account Settings Tabs"
                    sx={{ 
                        borderRight: 1, 
                        borderColor: 'divider',
                        minWidth: 200,
                        '& .MuiTab-root': { minHeight: 60, display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }
                    }}
                >
                    <Tab 
                        icon={<IconUser size={18} />} 
                        iconPosition="start" 
                        label="Profile" 
                        {...a11yProps(0)} 
                    />
                    <Tab 
                        icon={<IconLock size={18} />} 
                        iconPosition="start" 
                        label="Security" 
                        {...a11yProps(1)} 
                    />
                    <Tab 
                        icon={<IconSettings size={18} />} 
                        iconPosition="start" 
                        label="Preferences" 
                        {...a11yProps(2)} 
                        disabled
                    />
                </Tabs>
                
                <Box sx={{ flexGrow: 1, width: '100%' }}>
                    <TabPanel value={value} index={0}>
                        <ProfileTab />
                    </TabPanel>
                    <TabPanel value={value} index={1}>
                        <SecurityTab />
                    </TabPanel>
                     <TabPanel value={value} index={2}>
                        <Typography variant="h4">Preferences Coming Soon</Typography>
                    </TabPanel>
                </Box>
            </Box>
        </MainCard>
    );
};

export default AccountProfile;
