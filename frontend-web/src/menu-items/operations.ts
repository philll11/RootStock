// assets
import { IconClipboardList } from '@tabler/icons-react';
import { NavItem } from './types';

// constant
const icons = {
  IconClipboardList
};

// ==============================|| OPERATIONS MENU ITEMS ||============================== //

const lists: NavItem = {
  id: 'operations',
  title: 'Operations',
  type: 'group',
  children: [
    {
      id: 'assessments',
      title: 'Assessments',
      type: 'item',
      url: '/assessments',
      icon: icons.IconClipboardList,
      breadcrumbs: true
    }
  ]
};

export default lists;
