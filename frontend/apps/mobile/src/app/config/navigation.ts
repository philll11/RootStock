import { PERMISSIONS } from '@rootstock/shared/util';

export interface NavigationItem {
  label: string;
  screen?: string;
  icon: string;
  permission?: string | null;
  children?: NavigationItem[];
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    screen: 'Dashboard',
    icon: 'view-dashboard',
    permission: null,
  },
  {
    label: 'Horticulture Management',
    icon: 'tree',
    children: [
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
        label: 'Blocks',
        screen: 'BlocksList',
        icon: 'sprout',
        permission: PERMISSIONS.BLOCK_VIEW,
      },
    ]
  },
  {
    label: 'System Management',
    icon: 'cog',
    children: [
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
        label: 'Settings',
        screen: 'Settings',
        icon: 'cog',
        permission: null,
      },
    ]
  },
  {
    label: 'Lists',
    icon: 'format-list-bulleted',
    children: [
      {
        label: 'Varieties',
        screen: 'VarietiesList',
        icon: 'leaf',
        permission: PERMISSIONS.VARIETY_VIEW,
      },
    ]
  },
];
