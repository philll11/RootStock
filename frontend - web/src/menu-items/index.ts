import dashboard from './dashboard';
import pages from './pages';
import entities from './entities';
import iam from './iam';
import system from './system';
import { MenuItem } from './types';

// ==============================|| MENU ITEMS ||============================== //

const menuItems: MenuItem = {
  items: [dashboard, pages, entities, iam, system]
};

export default menuItems;
