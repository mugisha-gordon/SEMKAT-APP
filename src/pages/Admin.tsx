import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShieldCheck, Users, FileText, Bell, UserPlus, Check, X, Clock, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getAgentApplications, approveAgentApplication, rejectAgentApplication, subscribeToAgentApplications } from "@/integrations/firebase/agentApplications";
import { updateUserRole, getAllAgents, deleteUserAndData, updateUserDocument, subscribeToAgents } from "@/integrations/firebase/users";
import { createNotification } from "@/integrations/firebase/notifications";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { createUserDocument } from "@/integrations/firebase/users";
import type { AgentApplicationDocument } from "@/integrations/firebase/types";
import type { UserDocument } from "@/integrations/firebase/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "@/integrations/firebase/config";
import PropertyPostForm from "@/components/property/PropertyPostForm";
import VideoPostForm from "@/components/video/VideoPostForm";

interface AgentApplication {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  company: string | null;
  licenseNumber: string | null;
  experienceYears: number | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any; // Timestamp from Firestore
}

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    company: '',
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [agents, setAgents] = useState<UserDocument[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<UserDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAgents = async () => {
    setAgentsLoading(true);
    try {
      const allAgents = await getAllAgents(100);
      setAgents(allAgents.filter(a => a.role === 'agent'));
    } catch (error: any) {
      console.error('Error fetching agents:', error);
      toast.error(error.message || 'Failed to fetch agents');
    } finally {
      setAgentsLoading(false);
    }
  };

  useEffect(() => {
    // Subscribe to applications and agents in real-time
    const unsubApps = subscribeToAgentApplications((apps) => {
      const transformedApps: AgentApplication[] = apps.map(app => ({
        id: app.id,
        userId: app.userId,
        fullName: app.fullName,
        phone: app.phone,
        email: app.email,
        company: app.company,
        licenseNumber: app.licenseNumber,
        experienceYears: app.experienceYears,
        status: app.status,
        createdAt: app.createdAt,
      }));
      setApplications(transformedApps);
      setLoading(false);
    }, undefined, 50);

    setAgentsLoading(true);
    const unsubAgents = subscribeToAgents((agentsList) => {
      setAgents(agentsList.filter(a => a.role === 'agent'));
      setAgentsLoading(false);
    }, 100);

    return () => {
      try { unsubApps(); } catch {}
      try { unsubAgents(); } catch {}
    };
  }, []);

  // fetchAgents removed - real-time subscription handles agent list

  const handleDeleteAgent = (agent: UserDocument) => {
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAgent = async () => {
    if (!agentToDelete || !user?.uid) return;

    setDeleting(true);
    try {
      // Delete user data (properties, videos, user document)
      await deleteUserAndData(agentToDelete.userId);
      
      // Note: To delete Firebase Auth user, you need Admin SDK on backend
      // For now, we'll just delete the Firestore data
      // In production, create a Cloud Function to handle auth user deletion
      
      toast.success('Agent and all associated data deleted successfully');
      setDeleteDialogOpen(false);
      setAgents((prev) => prev.filter((a) => a.userId !== agentToDelete.userId));
      setApplications((prev) => prev.filter((a) => a.userId !== agentToDelete.userId));
      setAgentToDelete(null);
      fetchApplications();
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      toast.error(error.message || 'Failed to delete agent');
    } finally {
      setDeleting(false);
    }
  };

  const fetchApplications = async () => {
    // kept for manual refresh if needed
    try {
      const apps = await getAgentApplications(undefined, undefined, 50);
      const transformedApps: AgentApplication[] = apps.map(app => ({
        id: app.id,
        userId: app.userId,
        fullName: app.fullName,
        phone: app.phone,
        email: app.email,
        company: app.company,
        licenseNumber: app.licenseNumber,
        experienceYears: app.experienceYears,
        status: app.status,
        createdAt: app.createdAt,
      }));
      setApplications(transformedApps);
    } catch (err) {
      console.error('Error fetching applications:', err);
      toast.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAction = async (applicationId: string, userId: string, action: 'approved' | 'rejected') => {
    try {
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      if (action === 'approved') {
        // Approve application and update user role
        await approveAgentApplication(applicationId, user.uid, null);
        await updateUserRole(userId, 'agent', user.uid);
        try {
          await createNotification({
            audience: 'user',
            userId,
            type: 'success',
            title: 'Agent application approved',
            description: 'Your agent application has been approved. Please sign out and sign in again to access the Agent Dashboard.',
            targetPath: '/agent-dashboard',
          });
        } catch {}
      } else {
        // Reject application
        await rejectAgentApplication(applicationId, user.uid, null);
        try {
          await createNotification({
            audience: 'user',
            userId,
            type: 'warning',
            title: 'Agent application rejected',
            description: 'Your agent application was rejected. You can review your details and apply again.',
            targetPath: '/dashboard',
          });
        } catch {}
      }

      toast.success(`Application ${action}`);
      fetchApplications();
    } catch (err: any) {
      console.error('Error updating application:', err);
      toast.error(err.message || 'Failed to update application');
    }
  };

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);

    try {
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const secondaryApp = getApps().find((a) => a.name === 'secondary') || initializeApp(firebaseConfig, 'secondary');
      const secondaryAuth = getAuth(secondaryApp);

      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        registerForm.email,
        registerForm.password
      );

      // Create user document with agent role
      await createUserDocument(userCredential.user.uid, registerForm.email, registerForm.fullName);

      if (registerForm.phone || registerForm.company) {
        await updateUserDocument(userCredential.user.uid, {
          profile: {
            phone: registerForm.phone || null,
          },
        });
      }
      
      // Update role to agent (admin is registering)
      await updateUserRole(userCredential.user.uid, 'agent', user.uid);

      await secondaryAuth.signOut();

      // Show success message with credentials
      const successMessage = `Agent account created successfully!\n\nCredentials:\nEmail: ${registerForm.email}\nPassword: ${registerForm.password}\n\nPlease provide these credentials to the agent.`;
      toast.success(successMessage, {
        duration: 8000,
        description: `Agent: ${registerForm.fullName} can now login with the provided credentials.`,
      });
      
      setIsRegisterOpen(false);
      setRegisterForm({ email: '', password: '', fullName: '', phone: '', company: '' });

      // Refresh agents list to show newly registered agent
      await fetchAgents();
      fetchApplications();
    } catch (err: any) {
      console.error('Error registering agent:', err);
      toast.error(err.message || 'Failed to register agent');
    } finally {
      setRegisterLoading(false);
    }
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 py-8 sm:py-12">
        <div className="container space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-xs sm:text-sm">
                {user?.email === "adminsemkat@gmail.com" ? "Welcome admin" : "Admin Control"}
              </p>
              <h1 className="font-heading text-xl sm:text-3xl font-bold">
                {user?.email === "adminsemkat@gmail.com" ? "Admin Dashboard" : "Semkat Command Center"}
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">Signed in as {user?.email}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {user && <PropertyPostForm agentId={user.uid} postedByRole="admin" onSuccess={() => {}} />}
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
              <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" className="gap-2 text-xs sm:text-sm">
                    <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Register Agent</span>
                    <span className="sm:hidden">Agent</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-border text-foreground max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-lg sm:text-xl">Register New Agent</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleRegisterAgent} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Full Name</Label>
                      <Input
                        value={registerForm.fullName}
                        onChange={(e) => setRegisterForm(p => ({ ...p, fullName: e.target.value }))}
                        placeholder="Agent full name"
                        required
                        className="bg-muted border-border text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Email</Label>
                      <Input
                        type="email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="agent@email.com"
                        required
                        className="bg-muted border-border text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Password</Label>
                      <PasswordInput
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="Create a password"
                        required
                        minLength={6}
                        className="bg-muted border-border text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Phone</Label>
                      <Input
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+256..."
                        className="bg-muted border-border text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Company (optional)</Label>
                      <Input
                        value={registerForm.company}
                        onChange={(e) => setRegisterForm(p => ({ ...p, company: e.target.value }))}
                        placeholder="Company name"
                        className="bg-muted border-border text-sm"
                      />
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={registerLoading}>
                      {registerLoading ? 'Registering...' : 'Register Agent'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" className="text-xs sm:text-sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-card border-border text-card-foreground p-5">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-5 w-5 text-orange-300" />
                <h3 className="font-semibold text-lg">Verify documents</h3>
              </div>
              <p className="text-muted-foreground text-sm">Review titles, surveys, and legal uploads.</p>
              <Button variant="outline" className="mt-4">
                Open
              </Button>
            </Card>
            
            <Card className="bg-card border-border text-card-foreground p-5">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-orange-300" />
                <h3 className="font-semibold text-lg">Manage agents</h3>
                {pendingCount > 0 && (
                  <Badge className="bg-semkat-orange text-white">{pendingCount} pending</Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">Approve new agents and their listings.</p>
              <Button variant="outline" className="mt-4">
                Open
              </Button>
            </Card>
            
            <Card className="bg-card border-border text-card-foreground p-5">
              <div className="flex items-center gap-3 mb-2">
                <Bell className="h-5 w-5 text-orange-300" />
                <h3 className="font-semibold text-lg">Platform alerts</h3>
              </div>
              <p className="text-muted-foreground text-sm">Broadcast updates and monitor system status.</p>
              <Button variant="outline" className="mt-4">
                Open
              </Button>
            </Card>
          </div>

          {/* Registered Agents Section */}
          <Card className="bg-card border-border text-card-foreground p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <Users className="h-5 w-5 text-sky-300" />
                <h3 className="font-heading text-xl font-semibold">Registered Agents</h3>
                {agents.length > 0 && (
                  <Badge className="bg-semkat-orange text-white">{agents.length}</Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAgents}
                disabled={agentsLoading}
                className=""
              >
                Refresh
              </Button>
            </div>
            
            {agentsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-semkat-orange border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading agents...</p>
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No registered agents yet</p>
                <p className="text-muted-foreground/80 text-sm mt-1">Register an agent using the "Register Agent" button above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {agents.map((agent) => (
                  <div
                    key={agent.userId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-muted border border-border hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold">{agent.profile.fullName || agent.email || 'Unknown'}</h4>
                        <Badge variant="outline" className="border-green-500/50 text-green-400 bg-green-500/10">
                          <Check className="h-3 w-3 mr-1" />
                          Active Agent
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">{agent.email}</p>
                      {agent.profile.phone && (
                        <p className="text-muted-foreground text-xs mt-1">Phone: {agent.profile.phone}</p>
                      )}
                      {(agent.profile as any).company && (
                        <p className="text-muted-foreground text-xs mt-1">Company: {(agent.profile as any).company}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/20 sm:shrink-0"
                      onClick={() => handleDeleteAgent(agent)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Agent Applications Section */}
          <Card className="bg-card border-border text-card-foreground p-6">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="h-5 w-5 text-sky-300" />
              <h3 className="font-heading text-xl font-semibold">Agent Applications</h3>
            </div>
            
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="bg-muted border-border flex flex-wrap h-auto">
                <TabsTrigger value="pending" className="data-[state=active]:bg-semkat-orange">
                  Pending ({applications.filter(a => a.status === 'pending').length})
                </TabsTrigger>
                <TabsTrigger value="approved" className="data-[state=active]:bg-green-600">
                  Approved ({applications.filter(a => a.status === 'approved').length})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="data-[state=active]:bg-red-600">
                  Rejected ({applications.filter(a => a.status === 'rejected').length})
                </TabsTrigger>
              </TabsList>

              {['pending', 'approved', 'rejected'].map(status => (
                <TabsContent key={status} value={status} className="mt-4">
                  {loading ? (
                    <p className="text-muted-foreground text-center py-8">Loading applications...</p>
                  ) : applications.filter(a => a.status === status).length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No {status} applications</p>
                  ) : (
                    <div className="space-y-3">
                      {applications
                        .filter(a => a.status === status)
                        .map(app => (
                          <div
                            key={app.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-muted border border-border"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="font-semibold">{app.fullName}</h4>
                                <Badge 
                                  variant="outline" 
                                  className={
                                    status === 'pending' ? 'border-yellow-500/50 text-yellow-400' :
                                    status === 'approved' ? 'border-green-500/50 text-green-400' :
                                    'border-red-500/50 text-red-400'
                                  }
                                >
                                  {status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                  {status === 'approved' && <Check className="h-3 w-3 mr-1" />}
                                  {status === 'rejected' && <X className="h-3 w-3 mr-1" />}
                                  {status}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-sm">{app.email} • {app.phone}</p>
                              {app.company && (
                                <p className="text-muted-foreground text-xs mt-1">Company: {app.company}</p>
                              )}
                            </div>
                            {status === 'pending' && (
                              <div className="flex flex-wrap gap-2 sm:justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                                  onClick={() => handleApplicationAction(app.id, app.userId, 'approved')}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                                  onClick={() => handleApplicationAction(app.id, app.userId, 'rejected')}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </Card>
        </div>
      </main>

      {/* Delete Agent Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-background border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete Agent
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete {agentToDelete?.profile.fullName || agentToDelete?.email}? 
              This will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All properties posted by this agent</li>
                <li>All videos posted by this agent</li>
                <li>The agent's account and profile</li>
              </ul>
              <strong className="text-red-400">This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAgent}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete Agent'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
