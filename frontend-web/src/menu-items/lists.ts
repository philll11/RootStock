// assets
import { IconSettingsSpark } from '@tabler/icons-react';
import { NavItem } from './types';

// constant
const icons = {
  IconSettingsSpark
};

// ==============================|| LISTS MENU ITEMS ||============================== //

const lists: NavItem = {
  id: 'lists',
  title: 'Lists',
  type: 'group',
  children: [
    {
      id: 'varieties',
      title: 'Varieties',
      type: 'item',
      url: '/varieties',
      icon: icons.IconSettingsSpark,
      breadcrumbs: true
    }
  ]
};

export default lists;
