import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Onboarding from "./Onboarding";
import WelcomeBack from "./WelcomeBack";
import LoadingScreen from "./LoadingScreen";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

// DEBUG: To see onboarding again, either:
// 1. Add ?onboarding=true to URL (e.g., http://localhost:5173/?onboarding=true)
// 2. Run in console: localStorage.removeItem('semkat_onboarding_completed'); location.reload()

const OnboardingWrapper = ({ children }: OnboardingWrapperProps) => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem('semkat_onboarding_completed');
    // Allow manual trigger via URL param: ?onboarding=true
    const urlParams = new URLSearchParams(window.location.search);
    const forceShow = urlParams.get('onboarding') === 'true';
    const shouldShow = forceShow || completed !== 'true';
    
    console.log('[Onboarding] Debug:', { completed, forceShow, shouldShow });
    
    setHasCompletedOnboarding(!shouldShow);
    setShowOnboarding(shouldShow);
  }, []);

  useEffect(() => {
    // If user is logged in and onboarding is completed, show welcome back
    if (user && hasCompletedOnboarding && !authLoading) {
      const lastLogin = localStorage.getItem('semkat_last_login');
      const now = new Date().toISOString();
      
      // Show welcome back if it's been more than 24 hours since last login
      if (lastLogin) {
        const hoursSinceLastLogin = (new Date(now).getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastLogin > 24) {
          setShowWelcomeBack(true);
        }
      }
      
      localStorage.setItem('semkat_last_login', now);
    }
  }, [user, hasCompletedOnboarding, authLoading]);

  const handleCompleteOnboarding = () => {
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
    localStorage.setItem('semkat_onboarding_completed', 'true');
  };

  const handleDismissWelcomeBack = () => {
    setShowWelcomeBack(false);
  };

  const handleNavigateHome = () => {
    setShowWelcomeBack(false);
    navigate('/home');
  };

  // Show loading screen only on initial app load while checking status
  if (hasCompletedOnboarding === null && authLoading) {
    return <LoadingScreen />;
  }

  // Show welcome back overlay and main app
  return (
    <>
      {/* App content always visible - children are never blocked */}
      {children}
      
      {/* Onboarding shown as non-blocking modal overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 pointer-events-auto">
          <Onboarding onComplete={handleCompleteOnboarding} />
        </div>
      )}
      
      {/* Welcome back notification - non blocking */}
      {showWelcomeBack && (
        <WelcomeBack 
          onDismiss={handleDismissWelcomeBack}
          onNavigateHome={handleNavigateHome}
        />
      )}
    </>
  );
};

export default OnboardingWrapper;
