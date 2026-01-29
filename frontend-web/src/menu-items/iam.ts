// assets
import { IconUsers, IconSettings2, IconBuildingCommunity } from '@tabler/icons-react';
import { NavItem } from './types';

// constant
const icons = {
  IconUsers, 
  IconSettings2,
  IconBuildingCommunity
};

// ==============================|| IAM MENU ITEMS ||============================== //

const iam: NavItem = {
  id: 'iam',
  title: 'Identity Access',
  type: 'group',
  children: [
    {
      id: 'users',
      title: 'Users',
      type: 'item',
      url: '/users',
      icon: icons.IconUsers,
      breadcrumbs: true
    },
    {
      id: 'roles',
      title: 'Roles',
      type: 'item',
      url: '/roles',
      icon: icons.IconSettings2,
      breadcrumbs: true
    },

  ]
};

export default iam;
