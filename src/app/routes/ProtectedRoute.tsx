import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/app/providers/authContext';

import AuthSplash from './AuthSplash';

export default function ProtectedRoute() {
  const { authResolved, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!authResolved) return <AuthSplash />;
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return <Outlet />;
}
