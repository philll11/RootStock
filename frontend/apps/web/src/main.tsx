// frontend/apps/web/src/main.tsx
import { StrictMode } from 'react';
import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import { configureAuth } from '@rootstock/iam/auth/auth-data-access';
import { notify, appControl } from '@rootstock/shared/util';
import { webNotificationAdapter, webAppControl } from '@rootstock/ui/web';

notify.setAdapter(webNotificationAdapter);
appControl.setAdapter(webAppControl);
configureAuth(localStorage, 'web');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/*" element={<App />} />
  )
);

root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
