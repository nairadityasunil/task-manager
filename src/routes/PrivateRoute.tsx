import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';

interface PrivateRouteProps {
  children: ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps): JSX.Element {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Only while we don't yet know who is signed in. A signed-in person saving
  // their profile also sets `loading`; replacing the page then would close
  // whatever they had open and lose what they typed.
  if (loading && user == null) {
    return <Loader center />;
  }

  if (user == null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default PrivateRoute;