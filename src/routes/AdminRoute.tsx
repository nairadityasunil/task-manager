import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import Loader from '@/components/Loader';
import { useAuth } from '@/context/AuthContext';

/** The platform admin console: signed-in platform admins only. Everyone else is sent to the admin sign-in. */
function AdminRoute({ children }: { children: ReactNode }): JSX.Element {
  const { user, loading } = useAuth();
  if (loading && user == null) return <Loader center />;
  if (user == null || !user.isSuperAdmin) return <Navigate replace to="/admin/login" />;
  return <>{children}</>;
}

export default AdminRoute;
