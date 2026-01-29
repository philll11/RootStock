import dashboard from './dashboard';
import entities from './entities';
import iam from './iam';
import system from './system';
import { MenuItem } from './types';
import lists from './lists';
import operations from './operations';

// ==============================|| MENU ITEMS ||============================== //

const menuItems: MenuItem = {
  items: [dashboard, entities, operations, lists, iam, system]
};

export default menuItems;
