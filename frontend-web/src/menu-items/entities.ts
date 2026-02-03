// assets
import { IconBuildingCommunity, IconTrees, IconTree } from '@tabler/icons-react';
import { NavItem } from './types';

// constant
const icons = {
    IconBuildingCommunity,
    IconTrees,
    IconTree
};

// ==============================|| ENTITIES MENU ITEMS ||============================== //

const entities: NavItem = {
    id: 'entities',
    title: 'Management',
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
        {
            id: 'blocks',
            title: 'Blocks',
            type: 'item',
            url: '/blocks',
            icon: icons.IconTree,
            breadcrumbs: true
        }

    ]
};

export default entities;