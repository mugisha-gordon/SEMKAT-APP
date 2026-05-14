import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { subscribeToUserDocument, updateUserDocument } from "@/integrations/firebase/users";
import { uploadImage } from "@/integrations/firebase/storage";
import { applyForAgent, getAgentApplications } from "@/integrations/firebase/agentApplications";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ChevronLeft, Upload } from "lucide-react";
import MessageAgentButton from "@/components/messaging/MessageAgentButton";

const Profile = () => {
  const { userId } = useParams();
  const { user, loading } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [companyInput, setCompanyInput] = useState<string>("");
  const [phoneInput, setPhoneInput] = useState<string>(user?.phoneNumber || "");
  const [licenseInput, setLicenseInput] = useState<string>("");
  const [experienceInput, setExperienceInput] = useState<number | null>(null);
  const [notesInput, setNotesInput] = useState<string>("");

  const isOwnProfile = !!user && !!userId && user.uid === userId;

  useEffect(() => {
    if (!userId) return;

    const unsub = subscribeToUserDocument(userId, (doc) => {
      setAvatarUrl(doc?.profile?.avatarUrl || null);
      setFullName(doc?.profile?.fullName || null);
      setEmail(doc?.email || null);
      setRole((doc as any)?.role || null);
    });

    return () => {
      unsub();
    };
  }, [userId]);

  // fetch existing applications for current logged-in user (to show status)
  useEffect(() => {
    let mounted = true;
    const fetchApps = async () => {
      if (!user) return;
      try {
        const apps = await getAgentApplications(user.uid, undefined, 10);
        if (!mounted) return;
        if (!apps || apps.length === 0) {
          setApplicationStatus(null);
        } else {
          // take latest application
          const latest = apps.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)).pop();
          setApplicationStatus(latest?.status || null);
        }
      } catch (e) {
        console.error("Failed to fetch applications", e);
      }
    };
    fetchApps();
    return () => {
      mounted = false;
    };
  }, [user]);

  const initials = useMemo(() => {
    const s = (fullName || email || "U").trim();
    return s.slice(0, 1).toUpperCase();
  }, [fullName, email]);

  const handleAvatarFile = async (file: File) => {
    if (!user || !userId) return;
    if (user.uid !== userId) return;

    try {
      setUploading(true);
      const path = `avatars/${user.uid}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const url = await uploadImage(file, path);
      await updateUserDocument(user.uid, {
        profile: {
          avatarUrl: url,
        },
      } as any);
      toast.success("Profile picture updated");
    } catch (e: any) {
      console.error("Avatar upload failed", e);
      toast.error(e?.message || "Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 pb-12">
        <section className="relative overflow-hidden py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(249,115,22,0.2),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.2),transparent_35%)]" />
          <div className="container relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Badge variant="outline" className="border-border text-foreground mb-3">Profile</Badge>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold">User Profile</h1>
              <p className="text-muted-foreground text-sm mt-1">View details and manage your avatar.</p>
            </div>
            <Button variant="outline" asChild>
              <Link to={user ? (user.uid === userId ? "/dashboard" : "/explore") : "/"} className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        </section>

        <section className="container max-w-3xl">
          <Card className="bg-card border-border text-card-foreground p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  type="button"
                  className="shrink-0"
                  onClick={() => {
                    if (avatarUrl) setPreviewOpen(true);
                  }}
                  aria-label="View profile photo"
                >
                  <Avatar className="h-16 w-16 border border-border">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-muted text-foreground/80 text-xl">{initials}</AvatarFallback>
                  </Avatar>
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-xl font-semibold truncate">{fullName || "User"}</h2>
                    {role && (
                      <Badge variant="outline" className="border-border text-foreground">
                        {role}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm truncate">{email || ""}</p>
                </div>
              </div>

              {isOwnProfile && (
                <div className="shrink-0">
                  <div className="inline-flex">
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
                      disabled={!user || uploading || loading}
                      onClick={() => {
                        if (!user || uploading || loading) return;
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Change photo"}
                    </Button>
                  </div>
                </div>
              )}
              {!isOwnProfile && user && (
                <div className="shrink-0">
                  <MessageAgentButton agentId={userId!} agentName={fullName || undefined} label="Message" variant="outline" />
                </div>
              )}
            </div>

            {!user && (
              <div className="mt-4 text-sm text-muted-foreground">
                Please <Link className="underline" to="/auth">log in</Link> to view profiles.
              </div>
            )}
            
            {isOwnProfile && user && role === 'user' && (
              <div className="mt-4">
                {applicationStatus === 'pending' ? (
                  <div className="text-sm text-muted-foreground">Your application to become an agent is pending review.</div>
                ) : applicationStatus === 'approved' ? (
                  <div className="text-sm text-muted-foreground">Your application was approved. You're now an agent.</div>
                ) : applicationStatus === 'rejected' ? (
                  <div className="text-sm text-muted-foreground">Your application was rejected. You may apply again.</div>
                ) : (
                  <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
                    <DialogTrigger asChild>
                      <Button variant="hero" className="mt-2">Apply to become an agent</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-background border-border text-foreground max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="font-heading text-lg sm:text-xl">Agent Application</DialogTitle>
                      </DialogHeader>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!user) return;
                          setApplying(true);
                          try {
                            await applyForAgent(user.uid, {
                              fullName: fullName || user.email?.split('@')[0] || '',
                              phone: phoneInput || user.phoneNumber || '',
                              email: email || user.email || '',
                              company: companyInput || null,
                              licenseNumber: licenseInput || null,
                              experienceYears: experienceInput || null,
                            });
                            setApplyOpen(false);
                            setApplicationStatus('pending');
                            toast.success('Application submitted — an admin will review it shortly');
                          } catch (err: any) {
                            console.error('Error applying for agent:', err);
                            toast.error(err?.message || 'Failed to submit application');
                          } finally {
                            setApplying(false);
                          }
                        }}
                        className="space-y-4 mt-4"
                      >
                        <div className="space-y-2">
                          <Label>Full name</Label>
                          <Input value={fullName || ''} onChange={(e) => setFullName(e.target.value)} required className="bg-muted border-border text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} required className="bg-muted border-border text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label>Company (optional)</Label>
                          <Input value={companyInput} onChange={(e) => setCompanyInput(e.target.value)} className="bg-muted border-border text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label>License / Registration # (optional)</Label>
                          <Input value={licenseInput} onChange={(e) => setLicenseInput(e.target.value)} className="bg-muted border-border text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label>Years of experience (optional)</Label>
                          <Input type="number" value={experienceInput ?? ''} onChange={(e) => setExperienceInput(e.target.value ? parseInt(e.target.value, 10) : null)} className="bg-muted border-border text-sm" />
                        </div>
                        <div className="space-y-2">
                          <Label>Additional notes (optional)</Label>
                          <Textarea value={notesInput} onChange={(e) => setNotesInput(e.target.value)} className="bg-muted border-border text-sm" />
                        </div>
                        <Button type="submit" variant="hero" className="w-full" disabled={applying}>
                          {applying ? 'Submitting...' : 'Submit application'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}
          </Card>
        </section>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="bg-black/80 border-white/10 text-white max-w-3xl p-0 overflow-hidden">
            <div className="relative w-full h-[70vh] bg-black">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Profile;
