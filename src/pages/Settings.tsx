import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, Globe2, ShieldCheck, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToUserDocument, updateUserDocument } from "@/integrations/firebase/users";
import { uploadImage } from "@/integrations/firebase/storage";
import { toast } from "sonner";
import ThemeToggle from "@/components/ui/theme-toggle";

const Settings = () => {
  const { user, loading } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      setFullName(null);
      return;
    }

    const unsub = subscribeToUserDocument(user.uid, (doc) => {
      setAvatarUrl(doc?.profile?.avatarUrl || null);
      setFullName(doc?.profile?.fullName || null);
    });

    return () => {
      unsub();
    };
  }, [user]);

  const initials = useMemo(() => {
    const s = (fullName || user?.email || 'U').trim();
    return s.slice(0, 1).toUpperCase();
  }, [fullName, user?.email]);

  const handleAvatarFile = async (file: File) => {
    if (!user) return;
    try {
      setUploading(true);
      const path = `avatars/${user.uid}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const url = await uploadImage(file, path);
      await updateUserDocument(user.uid, {
        profile: {
          avatarUrl: url,
        },
      } as any);
      toast.success('Profile picture updated');
    } catch (e: any) {
      console.error('Avatar upload failed', e);
      toast.error(e?.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 pb-12">
        <section className="relative overflow-hidden py-8 sm:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.2),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.2),transparent_35%)]" />
          <div className="container relative">
            <Badge variant="outline" className="border-border text-foreground mb-3">Control Center</Badge>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">Personalize your Semkat experience with theme, alerts, and locale.</p>
          </div>
        </section>

        <section className="container grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Card className="bg-card border-border text-card-foreground p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-muted text-foreground/80">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="font-heading text-xl font-semibold truncate">Profile</h2>
                  <p className="text-muted-foreground text-sm truncate">{user?.email || ''}</p>
                </div>
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                <div className="flex w-full sm:inline-flex">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!user || uploading || loading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarFile(file);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={!user || uploading || loading}
                    onClick={() => {
                      if (!user || uploading || loading) return;
                      fileInputRef.current?.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload photo"}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Your profile picture will appear across Explore, Agents, Messaging, and anywhere your avatar is shown.
            </p>
          </Card>

          <Card className="bg-card border-border text-card-foreground p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-sky-300" />
              <h2 className="font-heading text-xl font-semibold">Appearance</h2>
            </div>
            <p className="text-muted-foreground text-sm">Choose your preferred theme. Dark mode is the default.</p>
            <ThemeToggle />
          </Card>

          <Card className="bg-card border-border text-card-foreground p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-300" />
              <h2 className="font-heading text-xl font-semibold">Notifications</h2>
            </div>
            <p className="text-muted-foreground text-sm">Control alerts for price updates, documentation, and appointments.</p>
            <div className="flex flex-wrap gap-3">
              {["Price updates", "Docs & verification", "Messages", "Appointments"].map((label) => (
                <Toggle key={label} variant="outline" aria-label={label} pressed>
                  {label}
                </Toggle>
              ))}
            </div>
          </Card>

          <Card className="bg-card border-border text-card-foreground p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-sky-300" />
              <h2 className="font-heading text-xl font-semibold">Locale</h2>
            </div>
            <p className="text-muted-foreground text-sm">Prepare for international users: currency, language, and units.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-foreground/80">
              <div className="space-y-1">
                <div className="text-muted-foreground text-xs">Currency (coming soon)</div>
                <div className="px-3 py-2 rounded-lg bg-muted border border-border">UGX / USD</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground text-xs">Language (coming soon)</div>
                <div className="px-3 py-2 rounded-lg bg-muted border border-border">English</div>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Settings;

