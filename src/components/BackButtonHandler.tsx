import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";

/**
 * Component to handle Android back button behavior for PWA/APK
 * - Uses Capacitor App backButton listener when available
 * - Navigates to previous route instead of closing the app
 * - If there is no history, it will navigate to root ("/") instead of exiting
 */
const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHandlingRef = useRef(false);

  useEffect(() => {
    const handler = async (ev?: { canGoBack?: boolean }) => {
      try {
        if (isHandlingRef.current) {
          return;
        }

        // Prefer Capacitor's canGoBack when available.
        if (ev?.canGoBack) {
          navigate(-1);
          return;
        }

        // Fallback heuristic for SPA history.
        const canGoBack = window.history.state?.idx != null && window.history.state.idx > 0;
        if (canGoBack) {
          navigate(-1);
          return;
        }

        // If we're not on home, go home. If we're already home, ask to exit.
        if (location.pathname !== "/") {
          navigate("/", { replace: true });
          return;
        }

        isHandlingRef.current = true;
        const shouldExit = window.confirm("Do you want to leave the app?");
        if (!shouldExit) {
          return;
        }

        try {
          await CapacitorApp.exitApp();
          return;
        } catch {
          // ignore
        }

        // Web fallback: browsers may block window.close() unless opened by script.
        try {
          window.close();
        } catch {
          // ignore
        }
      } catch (e) {
        if (location.pathname !== "/") {
          navigate("/", { replace: true });
        }
      } finally {
        isHandlingRef.current = false;
      }
    };

    // Capacitor App back button (Android hardware)
    let isActive = true;
    let handleRef: { remove: () => Promise<void> } | null = null;

    (async () => {
      try {
        const h = await CapacitorApp.addListener("backButton", handler);
        if (!isActive) {
          await h.remove();
          return;
        }
        handleRef = h;
      } catch {
        // ignore
      }
    })();

    return () => {
      isActive = false;
      if (handleRef) {
        void handleRef.remove();
      }
    };
  }, [navigate, location.pathname]);

  return null;
};

export default BackButtonHandler;

