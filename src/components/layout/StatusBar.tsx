import { Link, useLocation } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { Search, Sparkles, Bell, LogIn, LayoutDashboard, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { subscribeToConversations } from "@/integrations/firebase/messages";
import { subscribeToNotificationsForUser } from "@/integrations/firebase/notifications";

const StatusBar = () => {
  const location = useLocation();
  const { user, role } = useAuth();
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [visible, setVisible] = useState(true);
  const userId = user?.uid || null;

  const isExplore = location.pathname.startsWith("/explore");

  useEffect(() => {
    // Explore manages the status bar visibility via custom events.
    if (!isExplore) return;

    const onToggle = (e: any) => {
      const next = Boolean(e?.detail?.visible);
      setVisible(next);
    };

    window.addEventListener("semkat:exploreStatusBar", onToggle as EventListener);
    return () => {
      window.removeEventListener("semkat:exploreStatusBar", onToggle as EventListener);
      setVisible(true);
    };
  }, [isExplore]);

  useEffect(() => {
    // On non-Explore pages, hide the status bar when the user scrolls up.
    if (isExplore) return;

    let lastY = window.scrollY ?? 0;
    let raf = 0;

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY ?? 0;
        const delta = y - lastY;
        lastY = y;

        // Always show near the top.
        if (y < 10) {
          setVisible(true);
          return;
        }

        // If scrolling up, hide; if scrolling down, show.
        if (Math.abs(delta) < 8) return;
        setVisible(delta > 0);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [isExplore]);

  useEffect(() => {
    if (!userId) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return;
    }

    const unsubConvos = subscribeToConversations(userId, (convos) => {
      const total = (convos || []).reduce((acc: number, c: { unreadCount?: Record<string, number> }) => {
        const unread = c?.unreadCount?.[userId] || 0;
        return acc + (unread > 0 ? unread : 0);
      }, 0);
      setUnreadMessages((prev) => (prev === total ? prev : total));
    });

    const unsubNotifs = subscribeToNotificationsForUser(userId, (items) => {
      const total = (items || []).filter((n: { audience?: string; readAt?: unknown }) => n?.audience === "user" && !n?.readAt).length;
      setUnreadNotifications((prev) => (prev === total ? prev : total));
    }, { limit: 50 });

    return () => {
      try {
        unsubConvos();
      } catch {
        // ignore
      }
      try {
        unsubNotifs();
      } catch {
        // ignore
      }
    };
  }, [userId]);

  const dashboardHref = role === 'admin' ? '/admin' : role === 'agent' ? '/agent-dashboard' : '/dashboard';

  const navItems = [
    { label: "Search", href: "/properties", icon: Search },      // Properties first (left)
    { label: "Explore", href: "/explore", icon: Sparkles },     // Explore in middle
    { label: "Messages", href: "/messages", icon: MessageCircle },
    { label: "Alerts", href: "/notifications", icon: Bell },
    user
      ? { label: "Dashboard", href: dashboardHref, icon: LayoutDashboard }
      : { label: "Sign In", href: "/auth", icon: LogIn },
  ];

  return (
    <div
      className={cn(
        // Keep full behavior on Explore; mobile-only elsewhere.
        "fixed inset-x-0 bottom-0 z-[60] flex justify-center px-2 sm:px-3 pb-2 sm:pb-3 transition-transform duration-300",
        !isExplore && "sm:hidden",
        !visible ? "translate-y-[110%] pointer-events-none" : "translate-y-0"
      )}
      // On Android, env(safe-area-inset-bottom) can be 0 even with a gesture bar.
      // Add a small minimum inset so the bar stays tappable.
      style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      <div
        ref={dockRef}
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl glass-strong glass-border shadow-[0_10px_40px_rgba(14,165,233,0.28)]"
        // Keep internal padding consistent (outer wrapper handles safe-area + minimum inset)
        style={{ paddingBottom: "0.5rem" }}
      >
        <div className="absolute inset-0 opacity-60 blur-3xl bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.35),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.35),transparent_40%)]" />
        <div className="relative grid grid-cols-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
            const badgeCount =
              item.href === "/messages"
                ? unreadMessages
                : item.href === "/notifications"
                  ? unreadNotifications
                  : 0;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "text-foreground dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.35)]"
                    : "text-foreground/80 hover:text-foreground dark:text-white/80 dark:hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "magnetic relative flex h-10 w-10 sm:h-10 sm:w-10 items-center justify-center rounded-2xl border border-black/10 bg-black/5 backdrop-blur transition-all dark:border-white/15 dark:bg-white/10",
                    isActive
                      ? "scale-105 shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_12px_30px_rgba(249,115,22,0.22)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.25),0_12px_30px_rgba(249,115,22,0.35)]"
                      : "hover:scale-105 hover:border-black/20 dark:hover:border-white/25"
                  )}
                  onPointerMove={(e) => {
                    const el = e.currentTarget;
                    const r = el.getBoundingClientRect();
                    const dx = (e.clientX - (r.left + r.width / 2)) * 0.08;
                    const dy = (e.clientY - (r.top + r.height / 2)) * 0.08;
                    el.style.setProperty("--mx", `${dx}px`);
                    el.style.setProperty("--my", `${dy}px`);
                  }}
                  onPointerLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.setProperty("--mx", "0px");
                    el.style.setProperty("--my", "0px");
                  }}
                >
                  <Icon className="h-5 w-5" />
                  {badgeCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-semkat-orange text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;

