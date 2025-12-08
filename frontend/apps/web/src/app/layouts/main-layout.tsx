import { AppShell, Burger, Group, Title, Button, NavLink, Text, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuth, usePermission } from '@rootstock/auth/auth-data-access';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { IconUser } from '@tabler/icons-react';
import { ThemeToggle } from '../components/theme-toggle';
import { NAVIGATION_ITEMS } from '../config/navigation';

export function MainLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { logout } = useAuth();
  const { hasPermission } = usePermission();
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
        {NAVIGATION_ITEMS.map((item, index) => {
          if (item.permission && !hasPermission(item.permission)) {
            return null;
          }

          if (item.type === 'header') {
            return (
              <Text key={index} size="xs" fw={500} c="dimmed" mt="md" mb="xs" tt="uppercase">
                {item.label}
              </Text>
            );
          }

          const Icon = item.icon;
          return (
            <NavLink
              key={index}
              label={item.label}
              leftSection={Icon ? <Icon size="1rem" stroke={1.5} /> : null}
              active={item.path ? (item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)) : false}
              onClick={() => {
                if (item.path) {
                  navigate(item.path);
                  if (opened) toggle();
                }
              }}
            />
          );
        })}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
