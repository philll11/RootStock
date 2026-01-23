import dashboard from './dashboard';
import pages from './pages';
import iam from './iam';
import system from './system';
import { MenuItem } from './types';

// ==============================|| MENU ITEMS ||============================== //

const menuItems: MenuItem = {
  items: [dashboard, pages, iam, system]
};

export default menuItems;
