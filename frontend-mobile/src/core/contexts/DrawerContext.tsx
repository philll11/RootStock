import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * Interface defining the shape of the Drawer Context
 */
interface DrawerContextType {
    isOpen: boolean;
    openDrawer: () => void;
    closeDrawer: () => void;
    toggleDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export const DrawerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);

    const openDrawer = useCallback(() => setIsOpen(true), []);
    const closeDrawer = useCallback(() => setIsOpen(false), []);
    const toggleDrawer = useCallback(() => setIsOpen((prev) => !prev), []);

    const value = useMemo(
        () => ({
            isOpen,
            openDrawer,
            closeDrawer,
            toggleDrawer,
        }),
        [isOpen, openDrawer, closeDrawer, toggleDrawer]
    );

    return (
        <DrawerContext.Provider value={value}>
            {children}
        </DrawerContext.Provider>
    );
};

export const useDrawer = () => {
    const context = useContext(DrawerContext);
    if (context === undefined) {
        throw new Error('useDrawer must be used within a DrawerProvider');
    }
    return context;
};
