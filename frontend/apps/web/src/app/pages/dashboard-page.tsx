import { AppShell, Burger, Group, Skeleton, Text, Title, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuth } from '@rootstock/core';

export function DashboardPage() {
  const [opened, { toggle }] = useDisclosure();
  const { logout } = useAuth();

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
          <Button variant="subtle" onClick={logout}>Logout</Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Text>Dashboard</Text>
        <Text>Users</Text>
        <Text>Settings</Text>
      </AppShell.Navbar>

      <AppShell.Main>
        <Title order={2} mb="lg">Dashboard</Title>
        <Skeleton height={200} radius="md" animate={false} />
        <Skeleton height={200} radius="md" mt="md" animate={false} />
      </AppShell.Main>
    </AppShell>
  );
}
