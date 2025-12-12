import { PERMISSIONS } from '@rootstock/shared/util';

export interface NavigationItem {
  label: string;
  screen: string;
  icon: string;
  permission?: string | null;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    screen: 'Dashboard',
    icon: 'view-dashboard',
    permission: null,
  },
  {
    label: 'Clients',
    screen: 'ClientsList',
    icon: 'domain',
    permission: PERMISSIONS.CLIENT_VIEW,
  },
  {
    label: 'Orchards',
    screen: 'OrchardsList',
    icon: 'tree',
    permission: PERMISSIONS.ORCHARD_VIEW,
  },
  {
    label: 'Users',
    screen: 'UsersList',
    icon: 'account-group',
    permission: PERMISSIONS.USER_VIEW,
  },
  {
    label: 'Roles',
    screen: 'RolesList',
    icon: 'shield-account',
    permission: PERMISSIONS.ROLE_VIEW,
  },
  {
    label: 'Varieties',
    screen: 'VarietiesList',
    icon: 'leaf',
    permission: PERMISSIONS.VARIETY_VIEW,
  },
  {
    label: 'Settings',
    screen: 'Settings',
    icon: 'cog',
    permission: null,
  },
];
