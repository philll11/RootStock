import { PERMISSIONS, VisibilityScope } from '@rootstock/shared/util';

export interface NavigationItem {
  label: string;
  screen: string;
  icon: string;
  permission?: string | null;
  children?: NavigationItem[];
  requiredScope?: VisibilityScope;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Dashboard',
    screen: '/',
    icon: 'view-dashboard',
    permission: null,
  },
  {
    label: 'Horticulture Management',
    screen: '',
    icon: 'tree',
    children: [
      {
        label: 'Clients',
        screen: '/iam/clients',
        icon: 'domain',
        permission: PERMISSIONS.CLIENT_VIEW,
      },
      {
        label: 'Orchards',
        screen: '/assets/orchards',
        icon: 'tree',
        permission: PERMISSIONS.ORCHARD_VIEW,
      },
      {
        label: 'Blocks',
        screen: '/assets/blocks',
        icon: 'sprout',
        permission: PERMISSIONS.BLOCK_VIEW,
      },
    ]
  },
  {
    label: 'Lists',
    screen: '',
    icon: 'format-list-bulleted',
    children: [
      {
        label: 'Varieties',
        screen: '/master-data/varieties',
        icon: 'leaf',
        permission: PERMISSIONS.VARIETY_VIEW,
      },
    ]
  },
  {
    label: 'System Management',
    screen: '',
    icon: 'cog',
    children: [
      {
        label: 'Users',
        screen: '/iam/users',
        icon: 'account-group',
        permission: PERMISSIONS.USER_VIEW,
      },
      {
        label: 'Roles',
        screen: '/iam/roles',
        icon: 'shield-account',
        permission: PERMISSIONS.ROLE_VIEW,
        requiredScope: VisibilityScope.GLOBAL,
      },
      {
        label: 'Settings',
        screen: '/settings',
        icon: 'cog',
        permission: null,
      },
    ]
  },
];
