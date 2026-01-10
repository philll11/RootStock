import { useState } from 'react';
import { 
  Container, Title, Paper, Switch, Group, Text, Stack, 
  LoadingOverlay, Grid, NavLink, TextInput, Box 
} from '@mantine/core';
import { IconSearch, IconCpu } from '@tabler/icons-react';
import { useGetSystemConfig, useUpdateSystemConfig } from '@rootstock/system/config/system-config-data-access';
import { usePermission } from '@rootstock/iam/auth/auth-data-access';
import { PERMISSIONS } from '@rootstock/shared/util';

export function SystemSettingsPage() {
  const { can } = usePermission();
  const canEdit = can(PERMISSIONS.SYSTEM_CONFIG_EDIT);
  const [activeTab, setActiveTab] = useState('system');

  const { data: auditConfig, isLoading } = useGetSystemConfig('audit');
  const { mutate: updateConfig, isPending: isUpdating } = useUpdateSystemConfig();

  const handleAuditToggle = (checked: boolean) => {
    if (!auditConfig) return;
    
    updateConfig({
      key: 'audit',
      data: {
        value: {
          ...auditConfig.value,
          enabled: checked,
        },
      },
    });
  };

  const renderContent = () => {
    if (activeTab === 'system') {
      return (
        <Stack gap="lg">
          <Box>
            <Title order={3} mb="xs">System Configuration</Title>
            <Text c="dimmed" size="sm">Manage global system settings and behaviors.</Text>
          </Box>
          
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text fw={500}>Audit Logging</Text>
                  <Text size="sm" c="dimmed">
                    Enable or disable global audit logging for all resources.
                  </Text>
                </div>
                <Switch
                  checked={auditConfig?.value?.enabled ?? false}
                  onChange={(event) => handleAuditToggle(event.currentTarget.checked)}
                  disabled={!canEdit || isUpdating}
                  size="md"
                />
              </Group>
            </Stack>
          </Paper>
        </Stack>
      );
    }
    return null;
  };

  if (isLoading) {
    return <LoadingOverlay visible={true} />;
  }

  return (
    <Container size="xl" py="xl" h="calc(100vh - 100px)">
      <Grid h="100%">
        <Grid.Col span={3} style={{ borderRight: '1px solid var(--mantine-color-gray-3)' }}>
          <Stack gap="md">
            <Title order={2} px="xs">Settings</Title>
            <TextInput 
              placeholder="Search settings" 
              leftSection={<IconSearch size={16} />}
              mb="sm"
            />
            <Box>
              <NavLink 
                label="System" 
                leftSection={<IconCpu size={20} />}
                active={activeTab === 'system'}
                onClick={() => setActiveTab('system')}
                variant="filled"
                color="blue"
                style={{ borderRadius: 'var(--mantine-radius-sm)' }}
              />
            </Box>
          </Stack>
        </Grid.Col>
        
        <Grid.Col span={9} pl="xl">
          {renderContent()}
        </Grid.Col>
      </Grid>
    </Container>
  );
}

export default SystemSettingsPage;
