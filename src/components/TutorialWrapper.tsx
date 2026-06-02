import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useLocation } from 'react-router-dom';
import JarvisTutorial from '@/components/JarvisTutorial';

const TutorialWrapper = () => {
  const { user, loading: authLoading } = useAuth();
  const { showTutorial, completeTutorial, showOnboarding } = useUserPreferences();
  const location = useLocation();

  // Don't show on auth page or while loading
  if (authLoading || !user || location.pathname === '/auth') return null;

  // Don't show tutorial while genre onboarding is active
  if (showOnboarding) return null;

  if (!showTutorial) return null;

  return <JarvisTutorial onComplete={completeTutorial} />;
};

export default TutorialWrapper;
