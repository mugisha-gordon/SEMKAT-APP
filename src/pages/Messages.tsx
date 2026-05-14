import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { subscribeToConversations, getConversations } from "@/integrations/firebase/messages";
import { getUserDocument } from "@/integrations/firebase/users";
import MessageDialog from "@/components/messaging/MessageDialog";
import { formatDistanceToNowStrict } from "date-fns";

const Messages = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialogFor, setOpenDialogFor] = useState<string | null>(null);
  const [otherNameMap, setOtherNameMap] = useState<Record<string, { name: string; avatar?: string }>>({});
  const [showJumpBanner, setShowJumpBanner] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsub = subscribeToConversations(user.uid, async (convos) => {
      setConversations(convos);
      // prefetch participant names for display
      const map: Record<string, { name: string; avatar?: string }> = {};
      await Promise.all(
        convos.map(async (c: any) => {
          const otherId = c.participantIds.find((id: string) => id !== user.uid);
          if (!otherId) return;
          try {
            const doc = await getUserDocument(otherId);
            map[otherId] = { name: doc?.profile?.fullName || doc?.email || "User", avatar: doc?.profile?.avatarUrl || undefined };
          } catch {
            map[otherId] = { name: "User" };
          }
        })
      );
      setOtherNameMap(map);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    const targetUserId = searchParams.get("user");
    if (!user || !targetUserId) return;
    if (targetUserId === user.uid) return;
    setOpenDialogFor(targetUserId);
    setShowJumpBanner(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("user");
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams, user]);

  useEffect(() => {
    if (!showJumpBanner) return;
    const timer = setTimeout(() => setShowJumpBanner(false), 2800);
    return () => clearTimeout(timer);
  }, [showJumpBanner]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pb-12">
        <section className="container py-10">
          {showJumpBanner && (
            <div className="mb-4 rounded-md border border-semkat-orange/40 bg-semkat-orange/10 px-3 py-2 text-xs text-semkat-orange">
              Jumped from notification
            </div>
          )}
          <h1 className="font-heading text-2xl mb-4">Messages</h1>

          <Card className="p-4">
            {loading ? (
              <p className="text-muted-foreground">Loading conversations...</p>
            ) : conversations.length === 0 ? (
              <p className="text-muted-foreground">No conversations yet. Message an agent or user from their profile.</p>
            ) : (
              <div className="space-y-3">
                {conversations.map((c) => {
                  const otherId = c.participantIds.find((id: string) => id !== user?.uid);
                  const other = otherId ? otherNameMap[otherId] : { name: "Unknown" };
                  const unread = (c.unreadCount && user ? c.unreadCount[user.uid] || 0 : 0) as number;
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={other?.avatar} />
                          <AvatarFallback className="bg-muted text-foreground">{(other?.name || "U").slice(0,1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold truncate">{other?.name}</div>
                            <div className="text-sm text-muted-foreground truncate">{c.lastMessage}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {c.lastMessageAt?.toDate ? formatDistanceToNowStrict(c.lastMessageAt.toDate(), { addSuffix: true }) : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {unread > 0 && <div className="bg-semkat-orange text-white rounded-full px-3 py-1 text-sm">{unread}</div>}
                        <Button onClick={() => setOpenDialogFor(otherId)} variant="outline">Open</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>
      </main>

      {openDialogFor && user && (
        <MessageDialog
          open={Boolean(openDialogFor)}
          onOpenChange={(v) => { if (!v) setOpenDialogFor(null); }}
          otherUserId={openDialogFor!}
          otherUserName={otherNameMap[openDialogFor!]?.name}
        />
      )}
    </div>
  );
};

export default Messages;

