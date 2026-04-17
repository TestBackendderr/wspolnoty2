import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '@/app/providers/authContext';

import AuthSplash from './AuthSplash';

export default function PublicOnlyRoute() {
  const { authResolved, isAuthenticated } = useAuth();

  if (!authResolved) return <AuthSplash />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
