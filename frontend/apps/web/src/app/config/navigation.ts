import { IconHome, IconUsers, IconBuildingSkyscraper, IconShieldLock, IconSettings } from '@tabler/icons-react';
import { PERMISSIONS } from '@rootstock/shared/util';

export interface NavigationItem {
  label: string;
  path?: string;
  icon?: any;
  permission?: string | null;
  type?: 'link' | 'header';
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: IconHome,
    permission: null,
    type: 'link',
  },
  {
    label: 'Management',
    type: 'header',
  },
  {
    label: 'Users',
    path: '/users',
    icon: IconUsers,
    permission: PERMISSIONS.USER_VIEW,
    type: 'link',
  },
  {
    label: 'Clients',
    path: '/clients',
    icon: IconBuildingSkyscraper,
    permission: PERMISSIONS.CLIENT_VIEW,
    type: 'link',
  },
  {
    label: 'Roles',
    path: '/roles',
    icon: IconShieldLock,
    permission: PERMISSIONS.ROLE_VIEW,
    type: 'link',
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: IconSettings,
    permission: null,
    type: 'link',
  },
];
