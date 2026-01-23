import { createContext, useContext, useState, ReactNode } from 'react';

// ==============================|| MENU CONTEXT ||============================== //

export interface MenuContextValue {
  isDashboardDrawerOpened: boolean;
  toggleDashboardDrawer: () => void;
  openDashboardDrawer: () => void;
  closeDashboardDrawer: () => void;
}

const MenuContext = createContext<MenuContextValue | undefined>(undefined);

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}

// ==============================|| MENU PROVIDER ||============================== //

export const MenuProvider = ({ children }: { children: ReactNode }) => {
  const [isDashboardDrawerOpened, setDashboardDrawerOpened] = useState(true);

  const toggleDashboardDrawer = () => {
    setDashboardDrawerOpened((prev) => !prev);
  };

  const openDashboardDrawer = () => {
    setDashboardDrawerOpened(true);
  };
  
  const closeDashboardDrawer = () => {
    setDashboardDrawerOpened(false);
  };

  return (
    <MenuContext.Provider value={{ isDashboardDrawerOpened, toggleDashboardDrawer, openDashboardDrawer, closeDashboardDrawer }}>
      {children}
    </MenuContext.Provider>
  );
};
