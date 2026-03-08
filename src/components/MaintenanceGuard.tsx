import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { useAuth } from '@/hooks/useAuth';
import MaintenancePage from '@/pages/MaintenancePage';
import Auth from '@/pages/Auth';
import { Loader2 } from 'lucide-react';

interface MaintenanceGuardProps {
  children: ReactNode;
}

const MaintenanceGuard = ({ children }: MaintenanceGuardProps) => {
  const { maintenance, loading } = useMaintenanceMode();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  // Always allow admin route and auth route
  if (location.pathname === '/admin' || location.pathname === '/auth') {
    return <>{children}</>;
  }

  // Still loading
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If maintenance mode is off, show normal app
  if (!maintenance.enabled) {
    return <>{children}</>;
  }

  // If not logged in during maintenance, redirect to auth
  if (!user) {
    return <Auth />;
  }

  // Admins always bypass maintenance
  const userEmail = user?.email || '';
  const isAdmin = userEmail === 'admin@gmail.com';
  
  // If user is admin or in the allowed list, let them through
  const isAllowed = isAdmin || maintenance.allowed_emails.includes(userEmail);

  if (isAllowed) {
    return <>{children}</>;
  }

  // Show maintenance page
  return <MaintenancePage />;
};

export default MaintenanceGuard;
