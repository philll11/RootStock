// frontend/apps/web/src/app/components/theme-toggle.tsx
import { ActionIcon, useMantineColorScheme, useComputedColorScheme, Menu } from '@mantine/core';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';
import { useAuth } from '@rootstock/iam/auth/auth-data-access';
import { useUsers } from '@rootstock/iam/users/users-data-access';
import { shadows, iconSizes } from '@rootstock/ui/theme';

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const { user } = useAuth();
  const { updateUser } = useUsers();

  const handleThemeChange = async (scheme: 'light' | 'dark' | 'auto') => {
    setColorScheme(scheme);

    if (user) {
      try {
        await updateUser({ 
          id: user._id, 
          data: { preferences: { theme: scheme } } 
        });
      } catch (error) {
        console.error('Failed to save theme preference', error);
      }
    }
  };

  const getIcon = () => {
    if (colorScheme === 'auto') return <IconDeviceDesktop size={iconSizes.lg} stroke={1.5} />;
    if (computedColorScheme === 'dark') return <IconMoon size={iconSizes.lg} stroke={1.5} />;
    return <IconSun size={iconSizes.lg} stroke={1.5} />;
  };

  return (
    <Menu shadow={shadows.md} width={150} position="bottom-end">
      <Menu.Target>
        <ActionIcon
          variant="default"
          size="lg"
          aria-label="Toggle color scheme"
        >
          {getIcon()}
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item 
          leftSection={<IconSun size={iconSizes.md} />} 
          onClick={() => handleThemeChange('light')}
          bg={colorScheme === 'light' ? 'var(--mantine-color-blue-light)' : undefined}
        >
          Light
        </Menu.Item>
        <Menu.Item 
          leftSection={<IconMoon size={iconSizes.md} />} 
          onClick={() => handleThemeChange('dark')}
          bg={colorScheme === 'dark' ? 'var(--mantine-color-blue-light)' : undefined}
        >
          Dark
        </Menu.Item>
        <Menu.Item 
          leftSection={<IconDeviceDesktop size={iconSizes.md} />} 
          onClick={() => handleThemeChange('auto')}
          bg={colorScheme === 'auto' ? 'var(--mantine-color-blue-light)' : undefined}
        >
          System
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}