import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import AuthGuard from 'utils/route-guard/AuthGuard';

// dashboard routing
const DashboardDefault = Loadable(lazy(() => import('views/dashboard')));

// iam routing
const ClientList = Loadable(lazy(() => import('views/iam/clients/ClientList')));
const ClientCreatePage = Loadable(lazy(() => import('views/iam/clients/pages/ClientCreatePage')));
const ClientEditPage = Loadable(lazy(() => import('views/iam/clients/pages/ClientEditPage')));
const ClientViewPage = Loadable(lazy(() => import('views/iam/clients/pages/ClientViewPage')));

const RoleList = Loadable(lazy(() => import('views/iam/roles/RoleList')));
const RoleCreatePage = Loadable(lazy(() => import('views/iam/roles/pages/RoleCreatePage')));
const RoleEditPage = Loadable(lazy(() => import('views/iam/roles/pages/RoleEditPage')));
const RoleViewPage = Loadable(lazy(() => import('views/iam/roles/pages/RoleViewPage')));

const UserList = Loadable(lazy(() => import('views/iam/users/UserList')));
const UserCreatePage = Loadable(lazy(() => import('views/iam/users/pages/UserCreatePage')));
const UserEditPage = Loadable(lazy(() => import('views/iam/users/pages/UserEditPage')));
const UserViewPage = Loadable(lazy(() => import('views/iam/users/pages/UserViewPage')));

// assets routing
const OrchardList = Loadable(lazy(() => import('views/assets/orchards/OrchardList')));
const OrchardCreatePage = Loadable(lazy(() => import('views/assets/orchards/pages/OrchardCreatePage')));
const OrchardEditPage = Loadable(lazy(() => import('views/assets/orchards/pages/OrchardEditPage')));
const OrchardViewPage = Loadable(lazy(() => import('views/assets/orchards/pages/OrchardViewPage')));

const BlockList = Loadable(lazy(() => import('views/assets/blocks/BlockList')));
const BlockCreatePage = Loadable(lazy(() => import('views/assets/blocks/pages/BlockCreatePage')));
const BlockEditPage = Loadable(lazy(() => import('views/assets/blocks/pages/BlockEditPage')));
const BlockViewPage = Loadable(lazy(() => import('views/assets/blocks/pages/BlockViewPage')));

// master-data routing
const VarietyList = Loadable(lazy(() => import('views/master-data/varieties/VarietyList')));
const VarietyCreatePage = Loadable(lazy(() => import('views/master-data/varieties/pages/VarietyCreatePage')));
const VarietyEditPage = Loadable(lazy(() => import('views/master-data/varieties/pages/VarietyEditPage')));
const VarietyViewPage = Loadable(lazy(() => import('views/master-data/varieties/pages/VarietyViewPage')));

// operations routing
const AssessmentList = Loadable(lazy(() => import('views/operations/AssessmentList')));
const AssessmentCreatePage = Loadable(lazy(() => import('views/operations/pages/AssessmentCreatePage')));
const AssessmentEditPage = Loadable(lazy(() => import('views/operations/pages/AssessmentEditPage')));
const AssessmentViewPage = Loadable(lazy(() => import('views/operations/pages/AssessmentViewPage')));

// system routing
const SystemSettingsPage = Loadable(lazy(() => import('views/system/config/SystemSettingsPage')));

// user routing
const AccountProfile = Loadable(lazy(() => import('views/iam/users/pages/account-profile/AccountProfile')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes: RouteObject = {
  path: '/',
  element: (
    <AuthGuard>
      <MainLayout />
    </AuthGuard>
  ),
  children: [
    {
      path: '/',
      element: <DashboardDefault />
    },
    {
      path: 'dashboard',
      element: <DashboardDefault />
    },
    {
      path: 'user',
      children: [
        {
          path: 'account',
          element: <AccountProfile />
        }
      ]
    },
    {
      path: 'clients',
      children: [
        {
          path: '',
          element: <ClientList />
        },
        {
          path: 'create',
          element: <ClientCreatePage />
        },
        {
          path: ':id',
          element: <ClientViewPage />
        },
        {
          path: ':id/edit',
          element: <ClientEditPage />
        }
      ]
    },
    {
      path: 'roles',
      children: [
        {
          path: '',
          element: <RoleList />
        },
        {
          path: 'create',
          element: <RoleCreatePage />
        },
        {
          path: ':id',
          element: <RoleViewPage />
        },
        {
          path: ':id/edit',
          element: <RoleEditPage />
        }
      ]
    },
    {
      path: 'users',
      children: [
        {
          path: '',
          element: <UserList />
        },
        {
          path: 'create',
          element: <UserCreatePage />
        },
        {
          path: ':id',
          element: <UserViewPage />
        },
        {
          path: ':id/edit',
          element: <UserEditPage />
        }
      ]
    },
    {
      path: 'orchards',
      children: [
        {
          path: '',
          element: <OrchardList />
        },
        {
          path: 'create',
          element: <OrchardCreatePage />
        },
        {
          path: ':id',
          element: <OrchardViewPage />
        },
        {
          path: ':id/edit',
          element: <OrchardEditPage />
        }
      ]
    },
    {
      path: 'blocks',
      children: [
        {
          path: '',
          element: <BlockList />
        },
        {
          path: 'create',
          element: <BlockCreatePage />
        },
        {
          path: ':id',
          element: <BlockViewPage />
        },
        {
          path: ':id/edit',
          element: <BlockEditPage />
        }
      ]
    },
    {
      path: 'assessments',
      children: [
        {
          path: '',
          element: <AssessmentList />
        },
        {
          path: 'create',
          element: <AssessmentCreatePage />
        },
        {
          path: ':id',
          element: <AssessmentViewPage />
        },
        {
          path: ':id/edit',
          element: <AssessmentEditPage />
        },
      ]
    },
    {
      path: 'varieties',
      children: [
        {
          path: '',
          element: <VarietyList />
        },
        {
          path: 'create',
          element: <VarietyCreatePage />
        },
        {
          path: ':id',
          element: <VarietyViewPage />
        },
        {
          path: ':id/edit',
          element: <VarietyEditPage />
        }
      ]
    },
    {
      path: 'system',
      children: [
        {
          path: 'settings',
          element: <SystemSettingsPage />
        }
      ]
    }
  ]
};

export default MainRoutes;
