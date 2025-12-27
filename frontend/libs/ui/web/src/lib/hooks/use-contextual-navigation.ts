import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export interface ContextualNavigation {
  /** The captured return path (if any) */
  returnTo: string | null;

  /**
   * Generates a URL string for links (e.g., "Edit" buttons).
   * By default ('passthrough'), it forwards the existing 'returnTo' if present.
   * If 'stack' is used, it appends the CURRENT location (including its returnTo) as the new returnTo.
   */
  getLinkTo: (path: string, options?: { strategy?: 'passthrough' | 'stack' }) => string;

  /**
   * Handles the termination of the flow.
   * If 'returnTo' exists, navigates there.
   * Otherwise, navigates to the provided defaultRoute.
   */
  goBack: (defaultRoute?: string) => void;

  /**
   * Used in Form submissions (e.g., Success -> View).
   * Navigates to the next internal step, preserving the 'returnTo' param,
   * and uses 'replace: true' to keep history clean.
   */
  transitionTo: (path: string) => void;
}

export function useContextualNavigation(basePath?: string): ContextualNavigation {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const returnTo = searchParams.get('returnTo');

  const getLinkTo = useCallback(
    (path: string, options: { strategy?: 'passthrough' | 'stack' } = {}) => {
      const { strategy = 'passthrough' } = options;
      
      let nextReturnTo = '';

      if (strategy === 'stack') {
        // Stack: Current page becomes the return point (preserving its own returnTo context)
        nextReturnTo = encodeURIComponent(`${location.pathname}${location.search}`);
      } else {
        // Passthrough: Forward existing returnTo, or fallback to current page if none exists
        nextReturnTo = returnTo || encodeURIComponent(`${location.pathname}${location.search}`);
      }

      const separator = path.includes('?') ? '&' : '?';
      return `${path}${separator}returnTo=${nextReturnTo}`;
    },
    [location.pathname, location.search, returnTo]
  );

  const goBack = useCallback(
    (defaultRoute?: string) => {
      if (returnTo) {
        navigate(decodeURIComponent(returnTo));
      } else if (defaultRoute) {
        navigate(defaultRoute);
      } else if (basePath) {
        navigate(basePath);
      } else {
        // Fallback if no default provided
        navigate('..');
      }
    },
    [navigate, returnTo, basePath]
  );

  const transitionTo = useCallback(
    (path: string) => {
      // If the target path matches the returnTo path, we need to "pop" the stack
      // This prevents loops and restores the previous context
      const targetPath = path.split('?')[0];
      
      if (returnTo) {
        const decodedReturnTo = decodeURIComponent(returnTo);
        const returnPath = decodedReturnTo.split('?')[0];

        if (targetPath === returnPath) {
          // Loop detected!
          // Check if there is a nested returnTo inside the decoded URL
          // e.g. /blocks/1?returnTo=/orchards/1
          const innerMatch = decodedReturnTo.match(/[?&]returnTo=([^&]+)/);
          if (innerMatch) {
            // Found nested returnTo, use it
            const innerReturnTo = innerMatch[1];
            const separator = path.includes('?') ? '&' : '?';
            navigate(`${path}${separator}returnTo=${innerReturnTo}`, { replace: true });
          } else {
            // No nested returnTo, just go to target (clearing returnTo)
            navigate(path, { replace: true });
          }
          return;
        }
      }

      const separator = path.includes('?') ? '&' : '?';
      const nextUrl = returnTo
        ? `${path}${separator}returnTo=${returnTo}`
        : path;

      navigate(nextUrl, { replace: true });
    },
    [navigate, returnTo]
  );

  return {
    returnTo,
    getLinkTo,
    goBack,
    transitionTo,
  };
}
