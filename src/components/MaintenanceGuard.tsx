import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { useAuth } from '@/hooks/useAuth';
import MaintenancePage from '@/pages/MaintenancePage';
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

  // If user is in the allowed list, let them through
  const userEmail = user?.email || '';
  const isAllowed = maintenance.allowed_emails.includes(userEmail);

  if (isAllowed) {
    return <>{children}</>;
  }

  // Show maintenance page
  return <MaintenancePage />;
};

export default MaintenanceGuard;
