import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ChevronLeft, Home, FileText, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getNotification,
  markNotificationAsRead,
  type NotificationDocument,
} from "@/integrations/firebase/notifications";

const typeMeta: Record<string, { icon: any; badgeClass: string }> = {
  info: { icon: Home, badgeClass: "bg-semkat-sky/20 text-semkat-sky border border-semkat-sky/30" },
  success: { icon: FileText, badgeClass: "bg-semkat-success/20 text-semkat-success border border-semkat-success/30" },
  warning: { icon: AlertTriangle, badgeClass: "bg-semkat-warning/20 text-semkat-warning border border-semkat-warning/30" },
};

const NotificationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [item, setItem] = useState<NotificationDocument | null>(null);
  const [itemLoading, setItemLoading] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    setItemLoading(true);
    getNotification(id)
      .then(async (doc) => {
        setItem(doc);
        if (doc && !doc.readAt) {
          await markNotificationAsRead(doc.id);
          setItem({ ...doc, readAt: doc.readAt ?? (doc as any).readAt });
        }
      })
      .catch((e) => {
        console.error("Error loading notification", e);
        setItem(null);
      })
      .finally(() => setItemLoading(false));
  }, [user, id]);

  const getNotificationRoute = (notification: NotificationDocument): string => {
    if (notification.targetPath) return notification.targetPath;
    const text = `${notification.title} ${notification.description}`.toLowerCase();
    if (text.includes("message")) {
      return notification.actorId ? `/messages?user=${encodeURIComponent(notification.actorId)}` : "/messages";
    }
    if (text.includes("new agent application")) return "/admin";
    if (text.includes("approved")) return "/agent-dashboard";
    if (text.includes("rejected")) return "/dashboard";
    if (text.includes("like") || text.includes("comment") || text.includes("video")) return "/explore";
    if (text.includes("property")) return "/properties";
    return "/notifications";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pb-12">
        <section className="relative overflow-hidden py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--semkat-orange)/0.2),transparent_40%),radial-gradient(circle_at_80%_10%,hsl(var(--semkat-sky)/0.2),transparent_35%)]" />
          <div className="container relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-semkat-sky-light backdrop-blur flex items-center justify-center border border-semkat-sky/20">
                <Bell className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Notification</p>
                <h1 className="font-heading text-2xl font-bold text-foreground">Details</h1>
              </div>
            </div>

            <Button variant="outline" asChild>
              <Link to="/notifications" className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        </section>

        <section className="container pb-10">
          {!loading && !user ? (
            <Card className="bg-card border p-10 text-center space-y-4">
              <p className="text-muted-foreground">Sign in to view this notification.</p>
              <Button variant="hero" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            </Card>
          ) : itemLoading ? (
            <Card className="bg-card border p-10 text-center space-y-4">
              <div className="mx-auto w-12 h-12 border-4 border-semkat-sky border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Loading notification...</p>
            </Card>
          ) : !item ? (
            <Card className="bg-card border p-10 text-center space-y-4">
              <p className="text-muted-foreground">Notification not found.</p>
              <Button variant="outline" asChild>
                <Link to="/notifications">Go back</Link>
              </Button>
            </Card>
          ) : (
            <Card
              className="bg-card border p-6 space-y-3 cursor-pointer hover:bg-accent/40 transition-colors"
              onClick={() => navigate(getNotificationRoute(item))}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {(() => {
                    const meta = typeMeta[item.type] || typeMeta.info;
                    const Icon = meta.icon;
                    return (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-heading text-xl font-semibold text-foreground">{item.title}</h2>
                          <p className="text-muted-foreground text-sm">
                            {item.createdAt?.toDate?.().toLocaleString?.() || ""}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <Badge className={(typeMeta[item.type] || typeMeta.info).badgeClass}>{item.type}</Badge>
              </div>

              <p className="text-muted-foreground break-words whitespace-normal">{item.description}</p>

              {item.readAt ? (
                <p className="text-xs text-muted-foreground">
                  Read {item.readAt?.toDate?.().toLocaleString?.() || ""}
                </p>
              ) : null}
            </Card>
          )}
        </section>
      </main>
    </div>
  );
};

export default NotificationDetail;
