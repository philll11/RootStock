// Placeholder type for Permission strings - to be replaced with actual Enums later
export type PermissionConfig = string;

export interface MenuItem {
    id: string;
    label: string;
    route: string;
    icon: string;
    permission?: PermissionConfig;
    children?: MenuItem[];
}

export const MENU_ITEMS: MenuItem[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        route: '/(root)/dashboard',
        icon: 'view-dashboard',
    },
    {
        id: 'horticulture',
        label: 'Horticulture',
        route: '', // Parent item, no route
        icon: 'sprout',
        children: [
            {
                id: 'orchards',
                label: 'Orchards',
                route: '/(root)/orchards',
                icon: 'tree',
            },
            {
                id: 'blocks',
                label: 'Blocks',
                route: '/(root)/blocks',
                icon: 'grid',
            },
            {
                id: 'varieties',
                label: 'Varieties',
                route: '/(root)/varieties',
                icon: 'seed',
            }
        ],
    },
    {
        id: 'operations',
        label: 'Operations',
        route: '',
        icon: 'tractor',
        children: [
            {
                id: 'assessments',
                label: 'Assessments',
                route: '/(root)/assessments',
                icon: 'clipboard-check',
            }
        ]
    },
    {
        id: 'settings',
        label: 'Settings',
        route: '/(root)/settings',
        icon: 'cog',
    },
];

export const getFilteredMenu = (items: MenuItem[], permissions: string[] = []): MenuItem[] => {
    // TODO: Implement actual RBAC filtering
    // For now, return all items
    return items;
};
