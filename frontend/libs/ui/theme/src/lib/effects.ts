// frontend/libs/ui/theme/src/lib/layout.ts

export const shadows = {
  // Maps to React Native Paper Elevation and Mantine Shadows
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // Card border-like
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', // Cards
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // Dropdowns
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // Modals
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', // Drawers
  
  // Semantic Usage
  card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  drawer: '-5px 0 25px -5px rgba(0, 0, 0, 0.1)', // Shadow on the left edge
  stickyHeader: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
};

export const transitions = {
  duration: {
    fast: '150ms',   // Hover effects
    normal: '250ms', // Drawer/Modal open
    slow: '400ms',   // Complex layout shifts
  },
  timing: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};