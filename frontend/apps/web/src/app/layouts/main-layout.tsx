import { AppShell, Burger, Group, Title, Button, NavLink, Text, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuth } from '@rootstock/auth/auth-data-access';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { IconHome, IconUsers, IconSettings, IconBuildingSkyscraper, IconUser } from '@tabler/icons-react';
import { ThemeToggle } from '../components/theme-toggle';

export function MainLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3}>RootStock</Title>
          </Group>
          <Group>
            <ThemeToggle />
            <ActionIcon 
              variant="default" 
              size="lg" 
              onClick={() => navigate('/profile')}
              aria-label="My Profile"
            >
              <IconUser stroke={1.5} />
            </ActionIcon>
            <Button variant="subtle" onClick={logout}>Logout</Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          label="Dashboard"
          leftSection={<IconHome size="1rem" stroke={1.5} />}
          active={location.pathname === '/'}
          onClick={() => {
            navigate('/');
            if (opened) toggle();
          }}
        />
        
        <Text size="xs" fw={500} c="dimmed" mt="md" mb="xs" tt="uppercase">
          Management
        </Text>
        
        <NavLink
          label="Users"
          leftSection={<IconUsers size="1rem" stroke={1.5} />}
          active={location.pathname.startsWith('/users')}
          onClick={() => {
            navigate('/users');
            if (opened) toggle();
          }}
        />

        <NavLink
          label="Clients"
          leftSection={<IconBuildingSkyscraper size="1rem" stroke={1.5} />}
          active={location.pathname.startsWith('/clients')}
          onClick={() => {
            navigate('/clients');
            if (opened) toggle();
          }}
        />
        
        <NavLink
          label="Settings"
          leftSection={<IconSettings size="1rem" stroke={1.5} />}
          active={location.pathname === '/settings'}
          onClick={() => {
            navigate('/settings');
            if (opened) toggle();
          }}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
