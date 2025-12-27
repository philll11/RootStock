import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export interface ContextualNavigation {
  /** The captured return path (if any) */
  returnTo: string | null;

  /**
   * Generates a URL string for links (e.g., "Edit" buttons),
   * automatically appending the current 'returnTo' param.
   * If no returnTo exists, it appends the current location as the returnTo.
   */
  getLinkTo: (path: string) => string;

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
    (path: string) => {
      // If we already have a returnTo, pass it along.
      // If not, we ARE the returnTo context (e.g. Orchard View -> Block Create)
      const currentReturnTo =
        returnTo ||
        encodeURIComponent(`${location.pathname}${location.search}`);

      const separator = path.includes('?') ? '&' : '?';
      return `${path}${separator}returnTo=${currentReturnTo}`;
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
