import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Search, Sparkles, MessageCircle, ArrowRight, ArrowLeft, Check } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    {
      icon: Home,
      title: "Welcome to Semkat",
      description: "Your trusted partner for real estate in Uganda. Discover, buy, rent, or sell properties with ease.",
      gradient: "from-semkat-orange to-semkat-orange-dark",
      bgGradient: "from-orange-500/20 to-sky-500/20",
    },
    {
      icon: Search,
      title: "Find Your Dream Property",
      description: "Browse through thousands of properties including residential, commercial, agricultural land, and more.",
      gradient: "from-semkat-sky to-semkat-sky-dark",
      bgGradient: "from-sky-500/20 to-orange-500/20",
    },
    {
      icon: Sparkles,
      title: "Flexible Payment Options",
      description: "Pay for agricultural land in convenient installments. We make property ownership accessible to everyone.",
      gradient: "from-semkat-orange to-semkat-sky",
      bgGradient: "from-orange-500/20 via-purple-500/20 to-sky-500/20",
    },
    {
      icon: MessageCircle,
      title: "Connect with Agents",
      description: "Message agents directly, get instant responses, and receive expert guidance throughout your property journey.",
      gradient: "from-semkat-sky to-semkat-orange",
      bgGradient: "from-sky-500/20 to-orange-500/20",
    },
  ];

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("semkat_onboarding_completed", "true");
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const Icon = pages[currentPage].icon;

  return (
    <div className="fixed inset-0 z-[300] overflow-hidden isolate">
      {/* Semi-transparent backdrop - app content is visible behind */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      
      {/* Animated background effects */}
      <div className={`absolute inset-0 bg-gradient-to-br ${pages[currentPage].bgGradient} animate-pulse opacity-50`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.2),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.2),transparent_50%)]" />

      {/* Centered modal content - doesn't cover full screen */}
      <div className="relative h-full flex flex-col items-center justify-center p-4">
        {/* Skip button */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-white/70 hover:text-white hover:bg-white/10 text-sm sm:text-base px-3 py-1.5 sm:px-4 sm:py-2"
          >
            Skip
          </Button>
        </div>

        {/* Main content - modal card */}
        <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto">
          <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 text-center space-y-4 sm:space-y-6">
            {/* Logo and Icon */}
            <div className="flex justify-center space-y-4">
              {/* SK Logo */}
              <div className="flex justify-center mb-4">
                <img 
                  src="/semkat-logo.png" 
                  alt="Semkat Group Uganda Limited" 
                  className="h-16 w-16 sm:h-20 sm:w-20 object-contain"
                />
              </div>
              {/* Icon with gradient background - smaller on mobile */}
              <div className={`relative p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${pages[currentPage].gradient} shadow-2xl animate-bounce-subtle`}>
                <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-white/20 blur-xl" />
                <Icon className="relative h-10 w-10 sm:h-16 sm:w-16 text-white" />
              </div>
            </div>

            {/* Title - responsive font size */}
            <h1 className="font-heading text-2xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
              {pages[currentPage].title}
            </h1>

            {/* Description - responsive font size */}
            <p className="text-sm sm:text-lg md:text-xl text-white/80 leading-relaxed px-2">
              {pages[currentPage].description}
            </p>

            {/* Page indicators */}
            <div className="flex items-center gap-3 sm:gap-2">
              {pages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                    index === currentPage
                      ? "w-6 sm:w-8 bg-white"
                      : "w-1.5 sm:w-2 bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
              {currentPage < pages.length - 1 && (
                <button
                  onClick={onComplete}
                  className="text-sm text-white/60 hover:text-white transition-colors underline"
                >
                  Skip Tour
                </button>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3 sm:gap-4">
              {currentPage > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex-1 border-white/20 text-white hover:bg-white/10 hover:border-white/30 text-sm sm:text-base py-2 sm:py-3"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Previous
                </Button>
              )}
              <Button
                onClick={handleNext}
                variant="hero"
                size="lg"
                className={`flex-1 text-sm sm:text-base px-4 sm:px-8 ${currentPage === 0 ? "ml-auto" : ""}`}
              >
                {currentPage === pages.length - 1 ? (
                  <>
                    Get Started
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Onboarding;
