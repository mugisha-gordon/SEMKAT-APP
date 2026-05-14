import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Heart, 
  Search, 
  Bell, 
  Home,
  MessageSquare,
  Clock,
  MapPin,
  Settings,
  Video,
  Play,
  UserPlus
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserDocument } from "@/integrations/firebase/users";
import { Link, useNavigate } from "react-router-dom";
import VideoPostForm from "@/components/video/VideoPostForm";
import { subscribeToFavoriteProperties } from "@/integrations/firebase/favorites";
import { subscribeToRecentSearches } from "@/integrations/firebase/recentSearches";
import { applyForAgent as createAgentApplication, getAgentApplications } from "@/integrations/firebase/agentApplications";
import { toast } from "sonner";
import type { AgentApplicationDocument } from "@/integrations/firebase/types";

const UserDashboard = () => {
  const { user, signOut, role } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null }>({ full_name: null });
  const [savedProperties, setSavedProperties] = useState<Array<{ title: string; price: string; location: string }>>([]);
  const [recentSearches, setRecentSearches] = useState<Array<{ query: string; date: string }>>([]);

  useEffect(() => {
    if (role === 'agent') {
      navigate('/agent-dashboard', { replace: true });
    }
  }, [role, navigate]);

  const [agentApp, setAgentApp] = useState<AgentApplicationDocument | null>(null);
  const [agentAppLoading, setAgentAppLoading] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyForm, setApplyForm] = useState({
    fullName: "",
    phone: "",
    company: "",
    licenseNumber: "",
    experienceYears: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const userDoc = await getUserDocument(user.uid);
        if (userDoc?.profile) {
          setProfile({ full_name: userDoc.profile.fullName });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setAgentApp(null);
      return;
    }

    setAgentAppLoading(true);
    getAgentApplications(user.uid, undefined, 5)
      .then((apps) => {
        setAgentApp(apps[0] || null);
      })
      .catch((e) => {
        console.error('Error fetching agent application:', e);
      })
      .finally(() => setAgentAppLoading(false));
  }, [user]);

  const canApply = !!user && role !== 'agent' && agentApp?.status !== 'pending' && agentApp?.status !== 'approved';

  const submitAgentApplication = async () => {
    if (!user) return;
    const fullName = applyForm.fullName.trim() || profile.full_name || "";
    const phone = applyForm.phone.trim();
    if (!fullName) {
      toast.error('Please enter your full name');
      return;
    }
    if (!phone) {
      toast.error('Please enter your phone number');
      return;
    }

    const yearsRaw = applyForm.experienceYears.trim();
    const years = yearsRaw ? Number(yearsRaw) : null;
    if (yearsRaw && (!Number.isFinite(years) || years < 0)) {
      toast.error('Experience years must be a valid number');
      return;
    }

    setApplySubmitting(true);
    try {
      await createAgentApplication(user.uid, {
        fullName,
        phone,
        email: user.email || '',
        company: applyForm.company.trim() || null,
        licenseNumber: applyForm.licenseNumber.trim() || null,
        experienceYears: years === null ? null : years,
      });

      toast.success('Application submitted');
      setApplyOpen(false);
      setApplyForm({ fullName: "", phone: "", company: "", licenseNumber: "", experienceYears: "" });

      const apps = await getAgentApplications(user.uid, undefined, 5);
      setAgentApp(apps[0] || null);
    } catch (e: any) {
      console.error('Error submitting agent application:', e);
      toast.error(e?.message || 'Failed to submit application');
    } finally {
      setApplySubmitting(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setSavedProperties([]);
      setRecentSearches([]);
      return;
    }

    const unsubFavorites = subscribeToFavoriteProperties(user.uid, (items) => {
      setSavedProperties(
        items.slice(0, 3).map((f) => ({
          title: f.property.title,
          price: `${f.property.currency} ${f.property.price.toLocaleString()}`,
          location: `${f.property.location.district}, ${f.property.location.region}`,
        }))
      );
    });

    const unsubSearches = subscribeToRecentSearches(user.uid, (items) => {
      setRecentSearches(
        items.map((s) => ({
          query: s.queryText,
          date: s.createdAt?.toDate?.().toLocaleString?.() || '',
        }))
      );
    });

    return () => {
      unsubFavorites();
      unsubSearches();
    };
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 py-4 sm:py-8">
        <div className="container space-y-4 sm:space-y-8">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-semkat-sky text-xs sm:text-sm font-medium">My Dashboard</p>
              <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold truncate">
                Welcome, {profile.full_name || 'User'}
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1 truncate">{user?.email}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {user && (
                <Link to={`/profile/${user.uid}`}>
                  <Button variant="outline" className="gap-2 text-xs sm:text-sm">
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                    Profile
                  </Button>
                </Link>
              )}

              <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="hero"
                    className="gap-2 text-xs sm:text-sm"
                    disabled={!canApply || agentAppLoading}
                  >
                    <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                    {agentApp?.status === 'approved'
                      ? 'Agent approved'
                      : agentApp?.status === 'pending'
                        ? 'Application pending'
                        : 'Apply to be Agent'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-border text-foreground max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-lg sm:text-xl">Agent Application</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3">
                    {agentApp?.status && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground text-sm">Current status</span>
                        <Badge variant="outline" className="border-border text-foreground">
                          {agentApp.status}
                        </Badge>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">Full Name</div>
                      <Input
                        value={applyForm.fullName}
                        onChange={(e) => setApplyForm((p) => ({ ...p, fullName: e.target.value }))}
                        placeholder={profile.full_name || 'Your full name'}
                        className="bg-muted border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">Phone</div>
                      <Input
                        value={applyForm.phone}
                        onChange={(e) => setApplyForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="+256..."
                        className="bg-muted border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">Company (optional)</div>
                      <Input
                        value={applyForm.company}
                        onChange={(e) => setApplyForm((p) => ({ ...p, company: e.target.value }))}
                        placeholder="Company name"
                        className="bg-muted border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">License Number (optional)</div>
                      <Input
                        value={applyForm.licenseNumber}
                        onChange={(e) => setApplyForm((p) => ({ ...p, licenseNumber: e.target.value }))}
                        placeholder="License/registration number"
                        className="bg-muted border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">Experience Years (optional)</div>
                      <Input
                        value={applyForm.experienceYears}
                        onChange={(e) => setApplyForm((p) => ({ ...p, experienceYears: e.target.value }))}
                        placeholder="e.g. 3"
                        className="bg-muted border-border"
                      />
                    </div>

                    <Button
                      variant="hero"
                      className="w-full"
                      onClick={submitAgentApplication}
                      disabled={!canApply || applySubmitting}
                    >
                      {applySubmitting ? 'Submitting...' : 'Submit Application'}
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      After admin approval, your account will become an Agent. Next time you log in, you will see the Agent Dashboard.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <VideoPostForm 
                onSuccess={() => {
                  // Navigate to Explore after successful upload
                  setTimeout(() => {
                    navigate('/explore', { state: { fromUpload: true } });
                  }, 500);
                }}
                triggerLabel="Post Video"
                triggerClassName="text-xs sm:text-sm"
              />
              <Link to="/explore">
                <Button variant="outline" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Watch</span> Videos
                </Button>
              </Link>
              <Link to="/properties">
                <Button variant="outline" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Browse</span> Properties
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="text-muted-foreground hover:bg-muted text-xs sm:text-sm" 
                onClick={signOut}
              >
                Sign out
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
            <Link to="/explore">
              <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20 text-card-foreground p-3 sm:p-5 hover:border-purple-500/40 transition-colors cursor-pointer h-full">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/20">
                    <Video className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">Explore</p>
                    <p className="text-muted-foreground text-[10px] sm:text-sm hidden xs:block">Watch videos</p>
                  </div>
                </div>
              </Card>
            </Link>
            
            <Link to="/properties">
              <Card className="bg-gradient-to-br from-semkat-orange/20 to-semkat-orange/5 border-semkat-orange/20 text-card-foreground p-3 sm:p-5 hover:border-semkat-orange/40 transition-colors cursor-pointer h-full">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-semkat-orange/20">
                    <Home className="h-4 w-4 sm:h-5 sm:w-5 text-semkat-orange" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">Properties</p>
                    <p className="text-muted-foreground text-[10px] sm:text-sm hidden xs:block">Browse listings</p>
                  </div>
                </div>
              </Card>
            </Link>
            
            <Link to="/favorites">
              <Card className="bg-gradient-to-br from-red-500/20 to-red-500/5 border-red-500/20 text-card-foreground p-3 sm:p-5 hover:border-red-500/40 transition-colors cursor-pointer h-full">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-red-500/20">
                    <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">Favorites</p>
                    <p className="text-muted-foreground text-[10px] sm:text-sm hidden xs:block">{savedProperties.length} saved</p>
                  </div>
                </div>
              </Card>
            </Link>
            
            <Link to="/settings">
              <Card className="bg-gradient-to-br from-semkat-sky/20 to-semkat-sky/5 border-semkat-sky/20 text-card-foreground p-3 sm:p-5 hover:border-semkat-sky/40 transition-colors cursor-pointer h-full">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-semkat-sky/20">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-semkat-sky" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">Settings</p>
                    <p className="text-muted-foreground text-[10px] sm:text-sm hidden xs:block">Preferences</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>

          {/* Video CTA Card */}
          <Card className="bg-gradient-to-r from-semkat-orange/20 via-purple-500/10 to-semkat-sky/20 border-border text-card-foreground p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-left">
                <div className="p-2 sm:p-3 rounded-full bg-white/10">
                  <Video className="h-6 w-6 sm:h-8 sm:w-8 text-semkat-orange" />
                </div>
                <div>
                  <h3 className="font-heading text-base sm:text-lg font-semibold">Share Your Experience</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">Post videos to explore and connect with the community</p>
                </div>
              </div>
              <VideoPostForm 
                onSuccess={() => {
                  // Navigate to Explore after successful upload
                  setTimeout(() => {
                    navigate('/explore', { state: { fromUpload: true } });
                  }, 500);
                }}
                triggerLabel="Post a Video"
                triggerClassName="whitespace-nowrap"
              />
            </div>
          </Card>

          {/* Main Content */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Saved Properties */}
            <Card className="bg-card border-border text-card-foreground p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-heading text-base sm:text-xl font-semibold flex items-center gap-2">
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                  Saved Properties
                </h3>
                <Link to="/favorites">
                  <Button variant="ghost" size="sm" className="text-semkat-sky hover:text-semkat-sky/80 text-xs sm:text-sm">
                    View all
                  </Button>
                </Link>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {savedProperties.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm">No saved properties yet</p>
                ) : (
                  savedProperties.map((property, i) => (
                    <div key={i} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted border border-border">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm sm:text-base truncate">{property.title}</h4>
                        <p className="text-semkat-orange text-xs sm:text-sm font-semibold">{property.price}</p>
                        <p className="text-muted-foreground text-[10px] sm:text-xs flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {property.location}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs ml-2">
                        View
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Recent Searches */}
            <Card className="bg-card border-border text-card-foreground p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="font-heading text-base sm:text-xl font-semibold flex items-center gap-2">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-semkat-sky" />
                  Recent Searches
                </h3>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {recentSearches.map((search, i) => (
                  <div key={i} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted border border-border">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">{search.query}</p>
                      <p className="text-muted-foreground text-[10px] sm:text-xs flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {search.date}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-semkat-orange hover:text-semkat-orange/80 text-xs ml-2">
                      Search
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Messages Section */}
          <Card className="bg-card border-border text-card-foreground p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-heading text-base sm:text-xl font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                Recent Conversations
              </h3>
            </div>
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No conversations yet</p>
              <p className="text-xs sm:text-sm mt-1">Contact an agent to start a conversation</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
