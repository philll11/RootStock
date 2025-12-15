// frontend/libs/ui/theme/src/lib/layout.ts

export const layout = {
  // Architectural Dimensions
  headerHeight: 60,
  mobileHeaderHeight: 56,
  sidebarWidth: 240,
  sidebarCollapsedWidth: 80,
  
  // Content Widths (for centralized consistency)
  container: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  
  // Drawer Sizes - Decouple intent from pixels
  drawers: {
    form: 500,  // Standard width for Create/Edit forms
    detail: 700, // Wide view for complex read-only details
    filter: 320, // Narrow view for filters
  },
};

// The Stacking Context Source of Truth
export const zIndex = {
  base: 0,
  card: 10,
  header: 100,      // Sticky headers
  drawer: 200,      // Slide-overs
  modal: 300,       // Dialogs (Must be > drawer)
  popover: 400,     // Dropdowns/Tooltips (Must be > modal)
  overlay: 500,     // Loading spinners / Full screen masks
  toast: 600,       // Notifications (Must be visible over everything)
};