import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import Services from "./pages/Services";
import Agents from "./pages/Agents";
import About from "./pages/About";
import Favorites from "./pages/Favorites";
import Notifications from "./pages/Notifications";
import NotificationDetail from "./pages/NotificationDetail";
import Messages from "./pages/Messages";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AgentDashboard from "./pages/AgentDashboard";
import UserDashboard from "./pages/UserDashboard";
import Explore from "./pages/Explore";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import StatusBar from "./components/layout/StatusBar";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./components/theme-provider";
import OnboardingWrapper from "./components/onboarding/OnboardingWrapper";
import BackButtonHandler from "./components/BackButtonHandler";
import AmbientGlow from "./components/AmbientGlow";
import MobileNotificationsBridge from "./components/MobileNotificationsBridge";
import Footer from "./components/layout/Footer";
import GoogleTranslate from "./components/layout/GoogleTranslate";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);

  return null;
};

const AppShell = () => {
  const location = useLocation();
  // Home is the landing page (path: "/")
  // Explore has its own special layout handling
  const isExplore = location.pathname.startsWith("/explore");

  return (
    <OnboardingWrapper>
      <ScrollToTop />
      <AmbientGlow />
      <MobileNotificationsBridge />
      <BackButtonHandler />
      <GoogleTranslate />
      <div
        className={isExplore ? "" : "pb-20 sm:pb-24"}
        style={
          isExplore
            ? undefined
            : { paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px) + 12px)" }
        }
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Index />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:serviceId" element={<Services />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/about" element={<About />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/notifications/:id" element={<NotificationDetail />} />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireRole="admin">
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agent-dashboard"
            element={
              <ProtectedRoute requireRole="agent">
                <AgentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {!isExplore && <Footer />}
      </div>
      <StatusBar />
    </OnboardingWrapper>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
