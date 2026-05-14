import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Home,
  FileText,
  LogIn,
  RefreshCcw,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserDocument } from "@/integrations/firebase/users";
import {
  getNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissAllNotificationsForUser,
  dismissNotificationForUser,
  type NotificationDocument,
  type NotificationType,
} from "@/integrations/firebase/notifications";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const Notifications = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationDocument[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [locallyDismissedIds, setLocallyDismissedIds] = useState<string[]>([]);

  const localDismissKey = user ? `semkat:dismissed_notifications:${user.uid}` : null;

  const readLocalDismissed = (): string[] => {
    if (!localDismissKey) return [];
    try {
      const raw = localStorage.getItem(localDismissKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeLocalDismissed = (ids: string[]) => {
    if (!localDismissKey) return;
    try {
      localStorage.setItem(localDismissKey, JSON.stringify(ids));
    } catch {
      // ignore local storage write failures
    }
  };

  const addLocallyDismissed = (ids: string[]) => {
    if (!ids.length) return;
    setLocallyDismissedIds((prev) => {
      const next = Array.from(new Set([...prev, ...ids]));
      writeLocalDismissed(next);
      return next;
    });
  };

  const iconByType = useMemo(
    () =>
      ({
        info: Home,
        success: FileText,
        warning: AlertTriangle,
      }) satisfies Record<NotificationType, any>,
    []
  );

  const refresh = async () => {
    if (!user) {
      setItems([]);
      return;
    }

    setItemsLoading(true);
    try {
      const next = await getNotificationsForUser(user.uid, { limit: 50 });
      const hidden = new Set(locallyDismissedIds.length ? locallyDismissedIds : readLocalDismissed());
      setItems(next.filter((n) => !hidden.has(n.id)));
    } catch (e) {
      console.error("Error loading notifications", e);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    setLocallyDismissedIds(readLocalDismissed());
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    const ids = Array.from(new Set(items.map((i) => i.actorId).filter(Boolean))) as string[];
    const missing = ids.filter((id) => !actorNames[id]);
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (id) => {
        try {
          const doc = await getUserDocument(id);
          const fullName = doc?.profile?.fullName || undefined;
          const email = (doc as any)?.email || undefined;
          const emailName = typeof email === 'string' && email.includes('@') ? email.split('@')[0] : undefined;
          const name = fullName || emailName || 'User';
          return { id, name };
        } catch {
          return { id, name: 'User' };
        }
      })
    )
      .then((rows) => {
        setActorNames((prev) => {
          const next = { ...prev };
          rows.forEach((r) => (next[r.id] = r.name));
          return next;
        });
      })
      .catch(() => {});
  }, [items, actorNames]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      await refresh();
    } catch (e) {
      console.error("Error marking notification as read", e);
    }
  };

  const unreadCount = useMemo(() => items.filter((n) => !n.readAt).length, [items]);

  const getNotificationRoute = (item: NotificationDocument): string => {
    if (item.targetPath) return item.targetPath;
    const text = `${item.title} ${item.description}`.toLowerCase();
    if (text.includes("message")) {
      return item.actorId ? `/messages?user=${encodeURIComponent(item.actorId)}` : "/messages";
    }
    if (text.includes("new agent application")) return "/admin";
    if (text.includes("approved")) return "/agent-dashboard";
    if (text.includes("rejected")) return "/dashboard";
    if (text.includes("like") || text.includes("comment") || text.includes("video")) return "/explore";
    if (text.includes("property")) return "/properties";
    return `/notifications/${item.id}`;
  };

  const openNotification = async (item: NotificationDocument) => {
    if (!item.readAt) {
      try {
        await markNotificationAsRead(item.id);
      } catch (e) {
        console.error("Error marking notification as read", e);
      }
    }
    navigate(getNotificationRoute(item));
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setBulkBusy(true);
    try {
      await markAllNotificationsAsRead(items);
      toast.success("All notifications marked as read");
      await refresh();
    } catch (e) {
      console.error("Error marking all notifications as read", e);
      toast.error("Failed to mark all as read");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!user || items.length === 0) return;
    setBulkBusy(true);
    try {
      await dismissAllNotificationsForUser(items, user.uid);
      toast.success("All notifications removed from your inbox");
      setDeleteAllOpen(false);
      await refresh();
    } catch (e) {
      const code = (e as any)?.code || "";
      if (String(code).includes("permission-denied")) {
        const ids = items.map((n) => n.id);
        addLocallyDismissed(ids);
        setItems([]);
        setDeleteAllOpen(false);
        toast.success("All notifications removed from your inbox");
      } else {
        console.error("Error deleting all notifications", e);
        toast.error("Failed to delete all notifications");
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDeleteOne = async (id: string) => {
    if (!user) return;
    try {
      await dismissNotificationForUser(id, user.uid);
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      const code = (e as any)?.code || "";
      if (String(code).includes("permission-denied")) {
        addLocallyDismissed([id]);
        setItems((prev) => prev.filter((n) => n.id !== id));
        toast.success("Notification deleted");
      } else {
        console.error("Error deleting notification", e);
        toast.error("Failed to delete notification");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pb-12">
        <section className="relative overflow-hidden py-10 sm:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--semkat-orange)/0.2),transparent_40%),radial-gradient(circle_at_80%_10%,hsl(var(--semkat-sky)/0.2),transparent_35%)]" />
          <div className="container relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-semkat-sky-light backdrop-blur flex items-center justify-center border border-semkat-sky/20">
                <Bell className="h-6 w-6 text-secondary" />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-sm">Stay in sync with your deals</p>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                  Notifications
                </h1>
              </div>
            </div>

            {user && (
              <div className="flex justify-start sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={refresh}
                  disabled={itemsLoading}
                  className="shrink-0"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  <span className="hidden xs:inline">Refresh</span>
                  <span className="inline xs:hidden">Reload</span>
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="container pb-10 space-y-4">
          {/* Show login prompt if not authenticated */}
          {!loading && !user ? (
            <Card className="bg-card border p-10 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-semkat-sky-light">
                <LogIn className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="font-heading text-2xl font-semibold text-foreground">Sign in to view notifications</h3>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Create an account or sign in to receive property alerts and updates.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="hero" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/properties">Browse Properties</Link>
                </Button>
              </div>
            </Card>
          ) : itemsLoading ? (
            <Card className="bg-card border p-10 text-center space-y-4">
              <div className="mx-auto w-12 h-12 border-4 border-semkat-sky border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading notifications...</p>
            </Card>
          ) : (
            <>
              {items.length === 0 ? (
                <Card className="bg-card border p-10 text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-semkat-sky-light">
                    <Bell className="h-8 w-8 text-secondary" />
                  </div>
                  <h3 className="font-heading text-2xl font-semibold text-foreground">No notifications yet</h3>
                  <p className="text-muted-foreground max-w-lg mx-auto">
                    When there are updates about properties, visits, or your account, you’ll see them here.
                  </p>
                </Card>
              ) : (
                <>
                  <Card className="bg-card border">
                    <div className="p-3 sm:p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-border text-muted-foreground">
                          {items.length} total
                        </Badge>
                        <Badge className="bg-semkat-orange/20 text-semkat-orange border border-semkat-orange/30">
                          {unreadCount} unread
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleMarkAllRead}
                          disabled={bulkBusy || unreadCount === 0}
                          className="w-full sm:w-auto"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark all as read
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteAllOpen(true)}
                          disabled={bulkBusy || items.length === 0}
                          className="w-full sm:w-auto text-red-500 border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete all
                        </Button>
                      </div>
                    </div>

                    <div className="divide-y divide-border">
                      {items.map((item) => {
                        const Icon = iconByType[item.type];
                        const timeLabel = item.createdAt?.toDate?.().toLocaleString?.() || "";
                        const isRead = Boolean(item.readAt);
                        const actorLabel =
                          item.actorId && actorNames[item.actorId] ? actorNames[item.actorId] : null;

                        return (
                          <div
                            key={item.id}
                            className={`group px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 transition-colors ${
                              isRead ? "bg-card" : "bg-muted/30"
                            } hover:bg-muted/50`}
                          >
                            <button
                              type="button"
                              onClick={() => openNotification(item)}
                              className="flex items-start gap-3 flex-1 text-left min-w-0 w-full"
                            >
                              <div className="mt-0.5 h-9 w-9 rounded-lg border border-border bg-background flex items-center justify-center shrink-0">
                                <Icon className="h-4 w-4 text-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <p className="font-medium text-sm text-foreground truncate">
                                    {actorLabel ? `${item.title} • ${actorLabel}` : item.title}
                                  </p>
                                  {!isRead && <span className="h-2 w-2 rounded-full bg-semkat-orange shrink-0" />}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {item.description}
                                </p>
                                <p className="text-[11px] text-muted-foreground/80 mt-1">{timeLabel}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                            </button>

                            <div className="flex items-center justify-end gap-1 shrink-0 self-end sm:self-auto">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleMarkRead(item.id)}
                                disabled={isRead}
                                title={isRead ? "Already read" : "Mark as read"}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                onClick={() => handleDeleteOne(item.id)}
                                title="Delete notification"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </>
              )}
            </>
          )}
        </section>
      </main>

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all notifications from your inbox. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteAll}
              disabled={bulkBusy}
            >
              {bulkBusy ? "Deleting..." : "Delete all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Notifications;

