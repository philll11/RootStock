import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export function useContextualNavigation(defaultParentPath: string) {
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

  const goBack = useCallback((defaultRouteOverride?: string) => {
    if (returnTo) {
      navigate(decodeURIComponent(returnTo));
    } else {
      navigate(defaultRouteOverride || defaultParentPath);
    }
  }, [navigate, returnTo, defaultParentPath]);

  const transitionTo = useCallback(
    (path: string) => {
      // If the target path matches the returnTo path, we need to "pop" the stack
      // This prevents loops and restores the previous context (e.g. Edit -> View)
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
      
      // If not popping, just navigate to target
      // We wrap it in getLinkTo to ensure the current context (returnTo) is passed forward
      // e.g. Create (returnTo=List) -> View (returnTo=List)
      navigate(getLinkTo(path), { replace: true });
    },
    [navigate, returnTo, getLinkTo]
  );

  return { getLinkTo, goBack, transitionTo, returnTo };
}
