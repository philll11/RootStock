import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from 'contexts/AuthContext';

// ==============================|| GUEST GUARD ||============================== //

/**
 * Guest guard for public routes (Login, etc.)
 * If authenticated, redirects to dashboard or returnTo path
 * @param {PropTypes.node} children children element/node
 */
const GuestGuard = ({ children }: { children: any }) => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isAuthenticated) {
            // Check for returnTo param in URL (standard behavior from useContextualNavigation)
            const params = new URLSearchParams(location.search);
            const returnTo = params.get('returnTo');

            if (returnTo) {
                 navigate(decodeURIComponent(returnTo), { replace: true });
            } else {
                 navigate('/dashboard', { replace: true });
            }
        }
    }, [isAuthenticated, navigate, location]);

    if (isAuthenticated) return null;

    return children;
};

export default GuestGuard;
