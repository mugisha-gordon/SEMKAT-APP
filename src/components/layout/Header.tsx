import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, MapPin, Phone, User, Heart, Bell, LayoutDashboard, LogOut, ChevronLeft, MessageCircle, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { subscribeToUserDocument } from '@/integrations/firebase/users';
import { subscribeToConversations } from '@/integrations/firebase/messages';
import { subscribeToNotificationsForUser } from '@/integrations/firebase/notifications';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [tagline, setTagline] = useState("to the end...");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const userId = user?.uid || null;

  useEffect(() => {
    if (!userId) {
      setAvatarUrl(null);
      setFullName(null);
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return;
    }

    const unsub = subscribeToUserDocument(userId, (doc) => {
      const nextAvatar = doc?.profile?.avatarUrl || null;
      const nextName = doc?.profile?.fullName || null;
      setAvatarUrl((prev) => (prev === nextAvatar ? prev : nextAvatar));
      setFullName((prev) => (prev === nextName ? prev : nextName));
    });

    return () => {
      unsub();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const unsubConvos = subscribeToConversations(userId, (convos) => {
      const total = (convos || []).reduce((acc: number, c: any) => {
        const unread = c?.unreadCount?.[userId] || 0;
        return acc + (unread > 0 ? unread : 0);
      }, 0);
      setUnreadMessages((prev) => (prev === total ? prev : total));
    });

    const unsubNotifs = subscribeToNotificationsForUser(userId, (items) => {
      // Only count user-targeted notifications as "unread" to avoid global notifications
      // showing as permanently unread (global docs cannot be marked read per current rules).
      const total = (items || []).filter((n: any) => n?.audience === 'user' && !n?.readAt).length;
      setUnreadNotifications((prev) => (prev === total ? prev : total));
    }, { limit: 50 });

    return () => {
      try { unsubConvos(); } catch {}
      try { unsubNotifs(); } catch {}
    };
  }, [userId]);

  const initials = useMemo(() => {
    const s = (fullName || user?.email || 'U').trim();
    return s.slice(0, 1).toUpperCase();
  }, [fullName, user?.email]);

  const navLinks = [
    { label: 'Explore', href: '/explore' },
    { label: 'Properties', href: '/properties' },
    { label: 'Services', href: '/services' },
    { label: 'Agents', href: '/agents' },
    { label: 'Settings', href: '/settings' },
    { label: 'About', href: '/about' },
  ];

  const getDashboardLink = () => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'agent':
        return '/agent-dashboard';
      default:
        return '/dashboard';
    }
  };

  const handleBack = () => {
    // Try to go back within SPA history.
    // If there is no previous entry, fallback to a sensible landing.
    if (window.history.state?.idx != null && window.history.state.idx > 0) {
      navigate(-1);
      return;
    }

    if (user) {
      navigate(getDashboardLink());
      return;
    }

    navigate('/explore');
  };

  const cycleTagline = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      navigator.vibrate?.(15);
    } catch {
      // ignore
    }
    const options = [
      "to the end...",
      "glass mode: on",
      "shimmering routes",
      "tap again for magic",
      "semkat sparkle",
    ];
    setTagline((prev) => {
      const idx = options.indexOf(prev);
      return options[(idx + 1) % options.length];
    });
  };

  const actions = (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        title="Toggle theme"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      >
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </Button>
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Avatar className="h-9 w-9">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-muted text-foreground text-xs">{initials}</AvatarFallback>
              </Avatar>
              {role && (
                <span className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background",
                  role === 'admin' ? 'bg-red-500' : role === 'agent' ? 'bg-semkat-orange' : 'bg-semkat-sky'
                )} />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to={`/profile/${user.uid}`} className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/messages" className="flex items-center gap-2 cursor-pointer">
                <MessageCircle className="h-4 w-4" />
                Messages
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={getDashboardLink()} className="flex items-center gap-2 cursor-pointer">
                <LayoutDashboard className="h-4 w-4" />
                {role === 'admin' ? 'Admin Panel' : role === 'agent' ? 'Agent Dashboard' : 'My Dashboard'}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/favorites" className="flex items-center gap-2 cursor-pointer">
                <Heart className="h-4 w-4" />
                Saved Properties
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 cursor-pointer text-destructive">
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <Button variant="ghost" size="icon" className="hidden md:flex" asChild>
            <Link to="/auth">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="hero" className="hidden sm:flex" asChild>
            <Link to="/auth">Login</Link>
          </Button>
        </>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
    </>
  );

  return (
    <header className="sticky top-0 z-[80] w-full glass-strong glass-border">
      {/* Top bar */}
      <div className="hidden border-b bg-muted/50 md:block">
        <div className="container flex h-10 items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <a href="tel:+256772336754" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <Phone className="h-3.5 w-3.5" />
              +256 772336754
            </a>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              Kampala, Uganda
            </span>
          </div>
          {/* Only show Saved and Alerts when logged in */}
          {user && (
            <div className="flex items-center gap-4">
              <Link to="/favorites" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <Heart className="h-3.5 w-3.5" />
                Saved
              </Link>
              <Link to="/messages" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <span className="relative inline-flex items-center">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-semkat-orange text-white text-[10px] leading-4 text-center">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </span>
                Messages
              </Link>
              <Link to="/notifications" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <span className="relative inline-flex items-center">
                  <Bell className="h-3.5 w-3.5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-semkat-orange text-white text-[10px] leading-4 text-center">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </span>
                Alerts
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main header */}
      <div className="container relative overflow-x-hidden overflow-y-visible py-2 lg:py-0">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-24 h-56 w-56 rounded-full bg-semkat-sky/15 blur-3xl" />
          <div className="absolute -top-16 -right-24 h-56 w-56 rounded-full bg-semkat-orange/15 blur-3xl" />
        </div>

        {/* Mobile / tablet: two rows so the company name gets full width (no letter-by-letter wrap) */}
        <div className="relative z-10 flex flex-col gap-1 lg:hidden">
          <div className="flex w-full min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={handleBack}
                aria-label="Back"
                title="Back"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Link to="/home" className="shrink-0" onDoubleClick={cycleTagline}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl glass glass-border shadow-md sm:h-12 sm:w-12">
                  <img
                    src="/semkat-logo.png"
                    alt=""
                    className="h-9 w-9 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">{actions}</div>
          </div>
          <Link
            to="/home"
            onDoubleClick={cycleTagline}
            className="block w-full min-w-0 px-0.5 text-center"
          >
            <span className="font-heading text-[0.8125rem] font-bold leading-tight tracking-tight text-foreground text-balance sm:text-sm">
              Semkat Group Uganda Ltd
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground text-balance line-clamp-1">
              {tagline}
            </span>
          </Link>
        </div>

        {/* Desktop: single row */}
        <div className="relative z-10 hidden min-h-16 items-center justify-between gap-3 lg:flex">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={handleBack}
              aria-label="Back"
              title="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <Link
              to="/home"
              className="flex min-w-0 flex-1 items-center gap-3"
              onDoubleClick={cycleTagline}
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl glass glass-border shadow-md">
                <img
                  src="/semkat-logo.png"
                  alt="Semkat Group Uganda Limited"
                  className="h-10 w-10 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="font-heading text-lg font-bold leading-tight text-foreground md:text-xl">
                  Semkat Group Uganda Ltd
                </span>
                <span className="text-xs text-muted-foreground">{tagline}</span>
              </div>
            </Link>
          </div>

          <nav className="flex shrink-0 items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">{actions}</div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div
        className={cn(
          "lg:hidden fixed left-0 right-0 top-[5.75rem] z-[90] glass-strong glass-border shadow-lg transition-all duration-300 overflow-y-auto sm:top-24",
          isMenuOpen ? "max-h-[calc(100dvh-4rem)] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        )}
      >
        <nav className="container py-4 pb-28 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t my-2" />
          {user ? (
            <>
              <Link
                to="/messages"
                className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors flex items-center gap-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <MessageCircle className="h-4 w-4" />
                Messages
              </Link>
              <Link
                to={getDashboardLink()}
                className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors flex items-center gap-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4" />
                {role === 'admin' ? 'Admin Panel' : role === 'agent' ? 'Agent Dashboard' : 'My Dashboard'}
              </Link>
              <Button variant="outline" className="w-full mt-2" onClick={() => { signOut(); setIsMenuOpen(false); }}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </>
          ) : (
            <Button variant="hero" className="w-full mt-2" asChild>
              <Link to="/auth" onClick={() => setIsMenuOpen(false)}>Login</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
