import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface WelcomeBackProps {
  onDismiss: () => void;
  onNavigateHome?: () => void;
}

const WelcomeBack = ({ onDismiss, onNavigateHome }: WelcomeBackProps) => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const handleGetStarted = () => {
    handleDismiss();
    onNavigateHome?.();
  };

  if (!visible) return null;

  const userName = user?.displayName || user?.email?.split("@")[0] || "there";

  return (
    <div className="fixed top-16 left-4 right-4 z-[300] animate-slide-down isolate sm:top-20">
      <div className="max-w-md mx-auto bg-gradient-to-r from-semkat-orange to-semkat-sky rounded-2xl shadow-2xl p-4 sm:p-6 relative overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-white/10 animate-pulse" />
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        <div className="relative flex items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 p-3 bg-white/20 rounded-xl">
            <Sparkles className="h-6 w-6 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-lg font-bold text-white">
              Welcome Back, {userName}!
            </h3>
            <p className="text-sm text-white/80 mt-1">
              Ready to find your dream property?
            </p>
          </div>

          {/* Action button */}
          <Button
            onClick={handleGetStarted}
            size="sm"
            className="flex-shrink-0 bg-white text-semkat-orange hover:bg-white/90 font-semibold"
          >
            Explore
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes slide-down {
          from { 
            opacity: 0; 
            transform: translateY(-100%); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        .animate-slide-down {
          animation: slide-down 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default WelcomeBack;
