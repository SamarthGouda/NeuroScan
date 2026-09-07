import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Brain, Stethoscope, Activity, ShieldCheck, Lock, User, ArrowRight, Loader2, AlertCircle, KeyRound, Server } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-foreground relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.04)_0%,transparent_70%)]" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/30 group-hover:scale-105 transition-transform">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                NEUROSCAN AI
              </h1>
              <p className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">PACS Clinical Intelligence</p>
            </div>
          </Link>
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Inference Server Online
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800/60 text-slate-400 border border-slate-700/60">
              <Server className="h-3 w-3 text-cyan-400" />
              v3.0.4-prod
            </span>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-border/80 bg-card/85 backdrop-blur-xl shadow-2xl overflow-hidden relative">
          <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-foreground font-semibold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-cyan-400" />
                Workstation Authentication
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 border-cyan-500/30 bg-cyan-950/20">
                PBKDF2-SHA256
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Select a clinical role preset or enter your institutional credentials.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Quick-fill Role Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Quick Role Presets
                </Label>
                <span className="text-[10px] text-cyan-400 font-mono">1-Click Auth</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill("doctor", "doctor123")}
                  className={`h-auto py-2.5 px-2 flex flex-col items-center gap-1 border-border/80 bg-background/60 hover:bg-cyan-950/40 hover:border-cyan-500/50 text-foreground transition-all ${
                    username === "doctor" ? "border-cyan-500 bg-cyan-950/50 ring-1 ring-cyan-500" : ""
                  }`}
                  data-testid="preset-doctor"
                >
                  <Stethoscope className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-semibold">Doctor</span>
                  <span className="text-[10px] text-muted-foreground">Dr. Chen</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill("tech", "tech123")}
                  className={`h-auto py-2.5 px-2 flex flex-col items-center gap-1 border-border/80 bg-background/60 hover:bg-amber-950/40 hover:border-amber-500/50 text-foreground transition-all ${
                    username === "tech" ? "border-amber-500 bg-amber-950/50 ring-1 ring-amber-500" : ""
                  }`}
                  data-testid="preset-tech"
                >
                  <Activity className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold">Technician</span>
                  <span className="text-[10px] text-muted-foreground">A. Martinez</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill("admin", "admin123")}
                  className={`h-auto py-2.5 px-2 flex flex-col items-center gap-1 border-border/80 bg-background/60 hover:bg-purple-950/40 hover:border-purple-500/50 text-foreground transition-all ${
                    username === "admin" ? "border-purple-500 bg-purple-950/50 ring-1 ring-purple-500" : ""
                  }`}
                  data-testid="preset-admin"
                >
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-semibold">Admin</span>
                  <span className="text-[10px] text-muted-foreground">Prof. Liu</span>
                </Button>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs text-foreground font-medium">
                  Username or Institutional Email
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="e.g. doctor, tech, or admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 bg-background/60 border-border text-foreground placeholder:text-muted-foreground/60 focus:border-cyan-500 text-xs h-10"
                    data-testid="input-username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-foreground font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-background/60 border-border text-foreground placeholder:text-muted-foreground/60 focus:border-cyan-500 text-xs h-10 font-mono"
                    data-testid="input-password"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/25 h-10 transition-all text-xs"
                data-testid="button-submit-login"
              >
                {isLoggingIn ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating Institutional Session...
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

          <CardFooter className="border-t border-border/70 pt-4 flex flex-col gap-2 text-center text-xs text-muted-foreground bg-background/30">
            <div className="flex items-center gap-1.5 justify-center text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              <span>Encrypted Session • Role-Enforced RBAC • Audit Trail</span>
            </div>
            <p className="text-[10px] text-muted-foreground/70 font-mono">
              Authorized clinical personnel only. All access is logged.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
