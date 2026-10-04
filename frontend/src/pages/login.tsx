import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Brain,
  Stethoscope,
  Activity,
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  KeyRound,
  Server,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, isLoggingIn } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!username.trim() || !password.trim()) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    try {
      const user = await login({ username: username.trim(), password });
      toast({
        title: `Welcome back, ${user.fullName || user.username}`,
        description: `Logged in as ${user.role.toUpperCase()} with active clinical session.`,
      });
      setLocation("/");
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid credentials. Please verify username and password.");
      toast({
        title: "Login Failed",
        description: err.message || "Invalid username or password.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f3f6f4] dark:bg-[#070b12] p-4 text-foreground relative overflow-hidden transition-colors duration-300">
      
      {/* Ambient background soft glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-transparent blur-[120px] rounded-full" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full" />
      </div>

      {/* Top Bar with Return Home & Theme Toggle */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 z-10 px-1">
        <Link href="/" className="inline-flex items-center text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Return to Home
        </Link>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Header Branding with Official Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Logo size="lg" href="/" />
          </div>
          <div className="flex items-center justify-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Inference Engine Online
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-200/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-300/60 dark:border-slate-700/60">
              v3.0.4 Clinical
            </span>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-[#0c121d]/90 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden relative">
          <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600" />
          
          <CardHeader className="space-y-1 pb-4 pt-6 px-6 sm:px-8">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-slate-900 dark:text-white font-bold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                Workstation Authentication
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/5">
                PBKDF2-SHA256
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Select a clinical role preset or enter your institutional credentials.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 px-6 sm:px-8">
            {/* Quick-fill Role Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                  Quick Role Presets
                </Label>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-semibold">1-Click Test Login</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                
                <button
                  type="button"
                  onClick={() => handleQuickFill("doctor", "doctor123")}
                  className={`py-2.5 px-2 flex flex-col items-center gap-1 rounded-2xl border transition-all text-left ${
                    username === "doctor"
                      ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 hover:border-cyan-300 text-slate-700 dark:text-slate-300"
                  }`}
                  data-testid="preset-doctor"
                >
                  <Stethoscope className="h-4 w-4 text-cyan-500" />
                  <span className="text-xs font-bold leading-tight">Doctor</span>
                  <span className="text-[10px] text-slate-400">Dr. Chen</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill("tech", "tech123")}
                  className={`py-2.5 px-2 flex flex-col items-center gap-1 rounded-2xl border transition-all text-left ${
                    username === "tech"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 hover:border-amber-300 text-slate-700 dark:text-slate-300"
                  }`}
                  data-testid="preset-tech"
                >
                  <Activity className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold leading-tight">Technician</span>
                  <span className="text-[10px] text-slate-400">A. Martinez</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill("admin", "admin123")}
                  className={`py-2.5 px-2 flex flex-col items-center gap-1 rounded-2xl border transition-all text-left ${
                    username === "admin"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 hover:border-purple-300 text-slate-700 dark:text-slate-300"
                  }`}
                  data-testid="preset-admin"
                >
                  <ShieldCheck className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-bold leading-tight">Admin</span>
                  <span className="text-[10px] text-slate-400">Prof. Liu</span>
                </button>

              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Username or Institutional Email
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="e.g. doctor, tech, or admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl text-xs h-10 focus:border-cyan-500"
                    data-testid="input-username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl text-xs h-10 font-mono focus:border-cyan-500"
                    data-testid="input-password"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold h-11 rounded-xl shadow-md transition-all text-xs"
                data-testid="button-submit-login"
              >
                {isLoggingIn ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating Session...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In to Clinical Workspace
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="border-t border-slate-100 dark:border-slate-800/80 pt-4 pb-5 px-6 sm:px-8 flex flex-col gap-2 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-1.5 justify-center text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Encrypted Session • Role-Enforced RBAC • Audit Trail</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Authorized clinical personnel only. All access is logged.
            </p>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
