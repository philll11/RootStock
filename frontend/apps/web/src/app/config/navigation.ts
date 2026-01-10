import { IconHome, IconUsers, IconBuildingSkyscraper, IconShieldLock, IconSettings, IconTree, IconLeaf, IconClipboardCheck } from '@tabler/icons-react';
import { PERMISSIONS, VisibilityScope } from '@rootstock/shared/util';

export interface NavigationItem {
  label: string;
  path?: string;
  icon?: any;
  permission?: string | null;
  type?: 'link' | 'header';
  children?: NavigationItem[];
  requiredScope?: VisibilityScope;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: 'Home',
    path: '/',
    icon: IconHome,
    permission: null,
    type: 'link',
  },
  {
    label: 'Entities',
    type: 'link',
    icon: IconTree,
    children: [
      {
        label: 'Clients',
        path: '/clients',
        icon: IconBuildingSkyscraper,
        permission: PERMISSIONS.CLIENT_VIEW,
        type: 'link',
      },
      {
        label: 'Orchards',
        path: '/orchards',
        icon: IconTree,
        permission: PERMISSIONS.ORCHARD_VIEW,
        type: 'link',
      },
      {
        label: 'Blocks',
        path: '/blocks',
        icon: IconLeaf,
        permission: PERMISSIONS.BLOCK_VIEW,
        type: 'link',
      },
    ]
  },
  {
    label: 'Operations',
    type: 'link',
    icon: IconClipboardCheck,
    children: [
      {
        label: 'Assessments',
        path: '/assessments',
        icon: IconClipboardCheck,
        permission: PERMISSIONS.ASSESSMENT_VIEW,
        type: 'link',
      },
    ]
  },
  {
    label: 'Lists',
    type: 'link',
    icon: IconLeaf,
    children: [
      {
        label: 'Varieties',
        path: '/varieties',
        icon: IconLeaf,
        permission: PERMISSIONS.VARIETY_VIEW,
        type: 'link',
      },
    ]
  },
  {
    label: 'System Management',
    type: 'link',
    icon: IconSettings,
    children: [
      {
        label: 'Users',
        path: '/users',
        icon: IconUsers,
        permission: PERMISSIONS.USER_VIEW,
        type: 'link',
      },
      {
        label: 'Roles',
        path: '/roles',
        icon: IconShieldLock,
        permission: PERMISSIONS.ROLE_VIEW,
        type: 'link',
        requiredScope: VisibilityScope.GLOBAL,
      },
      {
        label: 'Settings',
        path: '/settings',
        icon: IconSettings,
        permission: PERMISSIONS.SYSTEM_CONFIG_VIEW,
        type: 'link',
      },
    ]
  },
];
