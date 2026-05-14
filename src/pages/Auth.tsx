import { useEffect, useState } from "react";
import { useNavigate, useLocation, type Location } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PasswordInput } from "@/components/ui/password-input";
import FirebaseDomainError from "@/components/ui/FirebaseDomainError";
import { Sparkles, Lock, UserPlus, Info, Mail, Phone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, user, role, loading: authLoading, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as Location & { state?: { from?: string } };
  const [pendingRedirect, setPendingRedirect] = useState(false);

  // Hard-coded admin email check
  const ADMIN_EMAIL = "adminsemkat@gmail.com";

  const getRoleHome = (r: typeof role, userEmail?: string | null) => {
    // Direct email check for admin (most reliable)
    if (userEmail === ADMIN_EMAIL) return '/admin';
    if (r === 'admin') return '/admin';
    if (r === 'agent') return '/agent-dashboard';
    return '/dashboard';
  };

  const from = location.state?.from;

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (pendingRedirect) return;

    const isAdminEmail = user.email === ADMIN_EMAIL;
    const effectiveRole = isAdminEmail ? 'admin' : role;
    if (!isAdminEmail && !effectiveRole) return;

    const target = getRoleHome(effectiveRole, user.email);
    if (location.pathname === '/auth') {
      navigate(target, { replace: true });
    }
  }, [authLoading, user, role, pendingRedirect, navigate, location.pathname]);

  useEffect(() => {
    if (!pendingRedirect) return;
    if (authLoading) return;
    if (!user) return;

    // Check admin email directly for immediate redirect
    const isAdminEmail = user.email === ADMIN_EMAIL;
    const effectiveRole = isAdminEmail ? 'admin' : role;

    // Non-admin accounts must wait until role is resolved
    if (!isAdminEmail && !effectiveRole) return;
    
    const roleHome = getRoleHome(effectiveRole, user.email);
    const safeFrom = from && from !== '/auth' ? from : null;

    // Determine redirect target
    let target: string;
    if (effectiveRole === 'admin' || isAdminEmail) {
      // Admins always go to /admin
      target = '/admin';
    } else if (effectiveRole === 'agent') {
      // Agents always go to /agent-dashboard
      target = '/agent-dashboard';
    } else {
      // Regular users go to dashboard or safeFrom
      target = safeFrom || roleHome;
    }
    
    console.log('Redirecting:', { email: user.email, role, effectiveRole, target });
    navigate(target, { replace: true });
    setPendingRedirect(false);
  }, [pendingRedirect, authLoading, user, role, from, navigate]);

  useEffect(() => {
    if (!authError) return;
    setError(authError);
  }, [authError]);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setPendingRedirect(true);
  };

  const handleRegister = async () => {
    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await signUp(email, password, fullName);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    toast.success("Account created successfully!");
    // Wait for auth state to update, then redirect to user dashboard
    setPendingRedirect(true);
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error);
      } else {
        setPendingRedirect(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main className="flex-1 py-12">
        <div className="container max-w-4xl">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div>
              {/* SK Logo */}
              <div className="mb-6">
                <img 
                  src="/semkat-logo.png" 
                  alt="Semkat Group Uganda Limited" 
                  className="h-20 w-20 sm:h-24 sm:w-24 object-contain"
                />
              </div>
              <p className="text-muted-foreground mb-3">Welcome to Semkat</p>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
                Sign in or create an account
              </h1>
              <p className="text-muted-foreground">
                Create an account to browse properties, save favorites, and contact agents.
              </p>
              <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-orange-300" /> Secure email & Google login
                </span>
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-300" /> Save your favorite properties
                </span>
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-green-300" /> Connect with verified agents via in-app chat
                </span>
              </div>
              
              {/* Agent registration notice */}
              <div className="mt-8 p-4 bg-semkat-orange/10 border border-semkat-orange/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-semkat-orange mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Want to become an agent?</h4>
                    <p className="text-muted-foreground text-sm">
                      Create a normal account first, then go to your Dashboard and use “Apply to be Agent”. Admin will review and approve.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="bg-card border-border text-card-foreground p-6">
              <Tabs defaultValue="login">
                <TabsList className="grid grid-cols-2 w-full bg-muted">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4 pt-4">
                  <FirebaseDomainError />
                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
                      {error}
                    </div>
                  )}
                  {/* Google Sign In */}
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 relative"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                        Connecting to Google...
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="bg-muted border-border w-full"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <PasswordInput
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••"
                      className="bg-muted border-border w-full"
                      autoComplete="current-password"
                    />
                  </div>
                  {error && (
                    <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">
                      {error}
                    </div>
                  )}
                  <Button variant="hero" className="w-full" onClick={handleLogin} disabled={loading}>
                    {loading ? "Signing in..." : "Login"}
                  </Button>
                </TabsContent>

                <TabsContent value="register" className="space-y-4 pt-4">
                  <FirebaseDomainError />
                  {/* Google Sign Up */}
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 relative"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                        Connecting to Google...
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Sign up with Google
                      </>
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or register with email</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-register" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email-register"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="bg-muted border-border w-full"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName-register" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="fullName-register"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="bg-muted border-border w-full"
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">Phone Number (optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+256 7XX XXX XXX"
                      className="bg-muted border-border w-full"
                      autoComplete="tel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-register" className="text-sm font-medium">Password</Label>
                    <PasswordInput
                      id="password-register"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••"
                      minLength={6}
                      className="bg-muted border-border w-full"
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                  </div>
                  {error && (
                    <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">
                      {error}
                    </div>
                  )}
                  <Button variant="hero" className="w-full" onClick={handleRegister} disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
