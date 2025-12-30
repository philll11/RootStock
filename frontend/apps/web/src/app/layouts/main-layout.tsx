// frontend/apps/web/src/app/layouts/main-layout.tsx
import { AppShell, Burger, Group, Title, Button, NavLink, Text, ActionIcon, ScrollArea, Tooltip, rem } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuth, usePermission } from '@rootstock/iam/auth/auth-data-access';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { IconUser, IconChevronRight, IconChevronLeft } from '@tabler/icons-react';
import { ThemeToggle } from '../components/theme-toggle';
import { NAVIGATION_ITEMS } from '../config/navigation';
import { layout, iconSizes } from '@rootstock/ui/theme';

export function MainLayout() {
  const [opened, { toggle }] = useDisclosure();
  const [expanded, { toggle: toggleExpanded, open: expand }] = useDisclosure(true);
  const { logout } = useAuth();
  const { hasPermission } = usePermission();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppShell
      header={{ height: layout.headerHeight }}
      navbar={{
        width: { base: 80, sm: expanded ? layout.sidebarWidth : 80 },
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={{
        navbar: {
          transition: 'width 300ms ease',
        },
        main: {
          transition: 'padding-left 300ms ease',
        }
      }}
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
              <IconUser size={iconSizes.lg} stroke={1.5} />
            </ActionIcon>
            <Button variant="subtle" onClick={logout}>Logout</Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={0}>
        <AppShell.Section grow component={ScrollArea} p="md">
          {NAVIGATION_ITEMS.map((item, index) => {
            const renderNavItem = (navItem: any, idx: number) => {
              // Check permission for the item itself
              if (navItem.permission && !hasPermission(navItem.permission)) {
                return null;
              }

              // If it has children, check if user has permission for at least one child
              if (navItem.children && navItem.children.length > 0) {
                const visibleChildren = navItem.children.filter((child: any) => 
                  !child.permission || hasPermission(child.permission)
                );
                
                if (visibleChildren.length === 0) {
                  return null;
                }
                
                // Use visibleChildren for rendering
                navItem = { ...navItem, children: visibleChildren };
              }

              if (navItem.type === 'header') {
                if (!expanded) return <div key={idx} style={{ height: 1, backgroundColor: 'var(--mantine-color-default-border)', margin: '10px 0' }} />;
                return (
                  <Text key={idx} size="xs" fw={500} c="dimmed" mt="md" mb="xs" tt="uppercase">
                    {navItem.label}
                  </Text>
                );
              }

              const Icon = navItem.icon;
              const hasChildren = navItem.children && navItem.children.length > 0;
              const isChildActive = hasChildren && navItem.children.some((child: any) => 
                child.path && (child.path === '/' ? location.pathname === '/' : location.pathname.startsWith(child.path))
              );

              return (
                <Tooltip 
                  label={navItem.label} 
                  position="right" 
                  disabled={expanded} 
                  key={idx}
                  transitionProps={{ duration: 0 }}
                >
                  <div style={{ marginBottom: 4 }}>
                    <NavLink
                      label={navItem.label}
                      leftSection={Icon ? <Icon size={iconSizes.lg} stroke={1.5} /> : null}
                      childrenOffset={expanded ? 28 : 0}
                      active={
                        navItem.path 
                          ? (navItem.path === '/' ? location.pathname === '/' : location.pathname.startsWith(navItem.path))
                          : (!expanded && isChildActive)
                      }
                      defaultOpened={false}
                      rightSection={!expanded ? null : undefined}
                      styles={{
                        root: {
                          transition: 'padding-left 300ms ease, padding-right 300ms ease',
                          justifyContent: 'flex-start',
                          paddingLeft: expanded ? 12 : 'calc(50% - 10px)',
                          paddingRight: expanded ? 12 : 0,
                        },
                        section: {
                          transition: 'margin-right 300ms ease',
                          marginRight: expanded ? 12 : 0,
                          marginLeft: 0,
                        },
                        body: {
                          transition: 'opacity 300ms ease, max-width 300ms ease',
                          opacity: expanded ? 1 : 0,
                          maxWidth: expanded ? 200 : 0,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }
                      }}
                      onClick={() => {
                        if (!expanded) {
                          expand();
                        }
                        if (navItem.path && !hasChildren) {
                          navigate(navItem.path);
                          if (opened) toggle();
                        }
                      }}
                    >
                      {expanded && hasChildren ? navItem.children.map((child: any, childIdx: number) => renderNavItem(child, childIdx)) : null}
                    </NavLink>
                  </div>
                </Tooltip>
              );
            };

            return renderNavItem(item, index);
          })}
        </AppShell.Section>
        
        <AppShell.Section p="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
          <Group justify={expanded ? "flex-end" : "center"}>
            <ActionIcon onClick={toggleExpanded} variant="default" size="lg" aria-label="Toggle sidebar">
              {expanded ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
            </ActionIcon>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}