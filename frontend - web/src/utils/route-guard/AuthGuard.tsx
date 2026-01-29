import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from 'contexts/AuthContext';

// ==============================|| AUTH GUARD ||============================== //

/**
 * Authentication guard for routes
 * @param {PropTypes.node} children children element/node
 */
const AuthGuard = ({ children }: { children: any }) => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate(`/pages/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    if (!isAuthenticated) return null;

    return children;
};

export default AuthGuard;
