import { SyntheticEvent, ReactNode, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import { Box, Tab, Tabs, Chip, Stack } from '@mui/material';

// project imports
import MainCard from 'ui-component/cards/MainCard';

// types
export interface TabDefinition {
    label: string;
    value: string;
    component: ReactNode;
    icon?: ReactNode;
    count?: number;
    disabled?: boolean;
}

export interface ResourceRelatedTabsProps {
    tabs: TabDefinition[];
    defaultTab?: string;
}

const ResourceRelatedTabs = ({ tabs, defaultTab }: ResourceRelatedTabsProps) => {
    const theme = useTheme();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Get current tab from URL or default to first one
    const currentTab = searchParams.get('tab') || defaultTab || tabs[0]?.value;

    const handleChange = (event: SyntheticEvent, newValue: string) => {
        setSearchParams({ ...Object.fromEntries(searchParams), tab: newValue });
    };

    // Ensure we have a valid tab selected (handling bad URLs)
    useEffect(() => {
        if (!tabs.find(t => t.value === currentTab)) {
            const fallback = defaultTab || tabs[0]?.value;
            if (fallback) {
                setSearchParams({ ...Object.fromEntries(searchParams), tab: fallback });
            }
        }
    }, [currentTab, tabs, defaultTab, searchParams, setSearchParams]);

    // Find the component to render
    const activeComponent = tabs.find(t => t.value === currentTab)?.component;

    return (
        <MainCard 
            content={false}
            sx={{ 
                '& .MuiTab-root': {
                    minHeight: 50, // Increase tab click area
                    flexDirection: 'row', // Icon formatting
                    gap: 1
                }
            }}
        >
            <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
                <Tabs 
                    value={currentTab} 
                    onChange={handleChange} 
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="resource related tabs"
                    textColor="secondary"
                    indicatorColor="secondary"
                >
                    {tabs.map((tab) => (
                        <Tab 
                            key={tab.value} 
                            value={tab.value} 
                            label={
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <Chip 
                                            label={tab.count} 
                                            size="small" 
                                            color={currentTab === tab.value ? "secondary" : "default"} 
                                            variant={currentTab === tab.value ? "filled" : "outlined"}
                                            sx={{ height: 20, minWidth: 20, px: 0.5 }}
                                        />
                                    )}
                                </Stack>
                            } 
                            icon={tab.icon as React.ReactElement}
                            iconPosition="start"
                            disabled={tab.disabled}
                        />
                    ))}
                </Tabs>
            </Box>
            
            {/* Content Area */}
            <Box sx={{ p: 3 }}>
                {activeComponent}
            </Box>
        </MainCard>
    );
};

export default ResourceRelatedTabs;
