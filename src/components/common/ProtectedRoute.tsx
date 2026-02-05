import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store';

export function ProtectedRoute() {
    const { isAuthenticated, isLoading } = useAuthStore();

    // If still loading auth state, we don't redirect yet
    // The AuthInitializer handles the initial load screen
    if (isLoading) {
        return null;
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
