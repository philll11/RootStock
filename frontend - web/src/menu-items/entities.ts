// assets
import { IconBuildingCommunity, IconTrees } from '@tabler/icons-react';
import { NavItem } from './types';

// constant
const icons = {
    IconBuildingCommunity,
    IconTrees
};

// ==============================|| ENTITIES MENU ITEMS ||============================== //

const entities: NavItem = {
    id: 'entities',
    title: 'Entities',
    type: 'group',
    children: [
        {
            id: 'clients',
            title: 'Clients',
            type: 'item',
            url: '/clients',
            icon: icons.IconBuildingCommunity,
            breadcrumbs: true
        },
        {
            id: 'orchards',
            title: 'Orchards',
            type: 'item',
            url: '/orchards',
            icon: icons.IconTrees,
            breadcrumbs: true
        },

    ]
};

export default entities;