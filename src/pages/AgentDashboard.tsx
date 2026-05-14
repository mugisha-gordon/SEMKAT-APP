import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building, 
  MessageSquare, 
  Eye, 
  TrendingUp, 
  Plus,
  Users,
  Clock,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserDocument, subscribeToUserDocument } from "@/integrations/firebase/users";
import PropertyPostForm from "@/components/property/PropertyPostForm";
import VideoPostForm from "@/components/video/VideoPostForm";
import { getAgentPropertyCounts, getProperties, subscribeToProperties, updateProperty } from "@/integrations/firebase/properties";
import type { PropertyDocument } from "@/integrations/firebase/properties";
import { subscribeToConversations } from "@/integrations/firebase/messages";
import { toast } from "sonner";

interface AgentStats {
  totalListings: number;
  activeListings: number;
  totalViews: number;
  inquiries: number;
}

const AgentDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AgentStats>({
    totalListings: 0,
    activeListings: 0,
    totalViews: 0,
    inquiries: 0
  });
  const [profile, setProfile] = useState<{ full_name: string | null }>({ full_name: null });
  const [properties, setProperties] = useState<PropertyDocument[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [updatingPropertyId, setUpdatingPropertyId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    setPropertiesLoading(true);

    // Subscribe to agent profile
    const unsubProfile = subscribeToUserDocument(user.uid, (doc) => {
      if (doc?.profile) {
        setProfile({ full_name: doc.profile.fullName });
      }
    });

    // Subscribe to properties in real-time
    const unsubProps = subscribeToProperties({ agentId: user.uid, limit: 50 }, (props) => {
      setProperties(props);
      // Update stats derived from properties
      const total = props.length;
      const active = props.filter((p) => p.status === 'available').length;
      setStats((prev) => ({
        ...prev,
        totalListings: total,
        activeListings: active,
      }));
      setPropertiesLoading(false);
    });

    // Subscribe to conversations (inquiries) for this agent
    const unsubConvos = subscribeToConversations(user.uid, (convos) => {
      setConversations(convos);
      const inquiries = convos.reduce((acc, c) => {
        const unread = c.unreadCount?.[user.uid] || 0;
        return acc + (unread > 0 ? 1 : 0);
      }, 0);
      setStats((prev) => ({
        ...prev,
        inquiries,
      }));
    });

    return () => {
      try { unsubProps(); } catch {}
      try { unsubConvos(); } catch {}
      try { unsubProfile(); } catch {}
    };
  }, [user]);

  const refreshProperties = async () => {
    if (!user) return;
    setPropertiesLoading(true);
    try {
      const agentProperties = await getProperties({ agentId: user.uid, limit: 12 });
      setProperties(agentProperties);
      setStats((prev) => ({
        ...prev,
        totalListings: agentProperties.length,
        activeListings: agentProperties.filter((p) => p.status === 'available').length,
      }));
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setPropertiesLoading(false);
    }
  };

  const togglePropertyStatus = async (property: PropertyDocument) => {
    if (!user) return;
    const nextStatus = property.status === 'available' ? 'sold' : 'available';

    setUpdatingPropertyId(property.id);
    try {
      // Optimistic UI update
      setProperties((prev) => prev.map((p) => (p.id === property.id ? { ...p, status: nextStatus } : p)));

      await updateProperty(property.id, { status: nextStatus });
      toast.success(`Marked as ${nextStatus.replace('-', ' ')}`);

      // Refresh counts (and list ordering if any)
      const counts = await getAgentPropertyCounts(user.uid);
      setStats((prev) => ({
        ...prev,
        totalListings: counts.totalListings,
        activeListings: counts.activeListings,
      }));
    } catch (error: any) {
      // Revert on failure
      setProperties((prev) => prev.map((p) => (p.id === property.id ? property : p)));
      toast.error(error?.message || 'Failed to update property status');
    } finally {
      setUpdatingPropertyId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 py-8">
        <div className="container space-y-8">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-semkat-sky text-sm font-medium">Agent Portal</p>
              <h1 className="font-heading text-3xl font-bold">
                Welcome, {profile.full_name || 'Agent'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {user && <PropertyPostForm agentId={user.uid} postedByRole="agent" onSuccess={refreshProperties} />}
              {user && (
                <VideoPostForm 
                  onSuccess={() => {
                    // Navigate to Explore after successful upload
                    setTimeout(() => {
                      navigate('/explore', { state: { fromUpload: true } });
                    }, 500);
                  }} 
                />
              )}
              <Button variant="outline" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-semkat-orange/20 to-semkat-orange/5 border-semkat-orange/20 text-foreground p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-semkat-orange/20">
                  <Building className="h-5 w-5 text-semkat-orange" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Total Listings</p>
                  <p className="font-heading text-2xl font-bold">{stats.totalListings}</p>
                </div>
              </div>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/20 text-foreground p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Active</p>
                  <p className="font-heading text-2xl font-bold">{stats.activeListings}</p>
                </div>
              </div>
            </Card>
            
            <Card className="bg-gradient-to-br from-semkat-sky/20 to-semkat-sky/5 border-semkat-sky/20 text-foreground p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-semkat-sky/20">
                  <Eye className="h-5 w-5 text-semkat-sky" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Total Views</p>
                  <p className="font-heading text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/20 text-foreground p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <MessageSquare className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Inquiries</p>
                  <p className="font-heading text-2xl font-bold">{stats.inquiries}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Card className="bg-card border-border text-card-foreground p-6">
            <Tabs defaultValue="listings" className="w-full">
              <TabsList className="bg-muted border-border flex flex-wrap h-auto">
                <TabsTrigger value="listings" className="data-[state=active]:bg-semkat-orange">
                  <Building className="h-4 w-4 mr-2" />
                  My Listings
                </TabsTrigger>
                <TabsTrigger value="inquiries" className="data-[state=active]:bg-semkat-sky">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Inquiries
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="listings" className="mt-6">
                {propertiesLoading ? (
                  <p className="text-muted-foreground text-center py-8">Loading properties...</p>
                ) : properties.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No properties posted yet</p>
                    <p className="text-sm mt-1">Use "Post Property" button to add your first listing</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {properties.map((property) => (
                      <div key={property.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-muted border border-border">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold">{property.title}</h4>
                          <p className="text-muted-foreground text-sm">{property.currency} {property.price.toLocaleString()}</p>
                          <p className="text-muted-foreground text-xs mt-1">{property.location.district}, {property.location.region}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                          <Badge className={
                            property.status === 'available' ? 'bg-green-500/20 text-green-400' : 
                            property.status === 'sold' ? 'bg-red-500/20 text-red-400' :
                            property.status === 'under-offer' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }>
                            {property.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => togglePropertyStatus(property)}
                            disabled={updatingPropertyId === property.id}
                          >
                            {updatingPropertyId === property.id ? 'Updating...' : `Mark as ${property.status === 'available' ? 'sold' : 'available'}`}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="inquiries" className="mt-6">
                <div className="space-y-4">
                  {conversations.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No inquiries yet</p>
                  ) : (
                    conversations.map((c) => {
                      const otherId = c.participantIds.find((id: string) => id !== user?.uid);
                      const unread = c.unreadCount?.[user?.uid] || 0;
                      return (
                        <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-card border border-border">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-semkat-sky/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-semkat-sky" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold">Conversation with {otherId}</h4>
                              <p className="text-muted-foreground text-sm truncate">Last message: {c.lastMessage}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                            <span className="flex items-center gap-1 text-muted-foreground text-sm">
                              <Clock className="h-4 w-4" />
                              {c.lastMessageAt?.toDate?.().toLocaleString?.() || ""}
                            </span>
                            <Button size="sm" variant={unread > 0 ? "hero" : "outline"}>
                              {unread > 0 ? `Reply (${unread})` : "Open"}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Analytics dashboard coming soon</p>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AgentDashboard;
