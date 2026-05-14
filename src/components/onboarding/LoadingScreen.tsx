import { useEffect, useState } from "react";

const LoadingScreen = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show loading screen if it takes more than 500ms
    const timer = setTimeout(() => setShow(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950 flex items-center justify-center isolate">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-sky-500/20 to-orange-500/20 animate-pulse" />
      
      {/* Logo and spinner */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-semkat-orange to-semkat-sky rounded-2xl blur-xl opacity-50 animate-ping" />
          <img 
            src="/semkat-logo.png" 
            alt="Semkat" 
            className="relative h-20 w-20 object-contain animate-bounce-subtle"
          />
        </div>
        
        {/* Loading text */}
        <div className="text-center space-y-2">
          <p className="text-white/80 text-lg font-semibold">Loading...</p>
          <div className="flex items-center gap-2 justify-center">
            <div className="w-2 h-2 rounded-full bg-semkat-orange animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-semkat-sky animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-semkat-orange animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
