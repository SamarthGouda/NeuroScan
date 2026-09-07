import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Brain, Stethoscope, Activity, ShieldCheck, Lock, User, ArrowRight, Loader2, AlertCircle } from "lucide-react";
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-4 text-slate-100">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                NEUROSCAN AI
              </h1>
              <p className="text-xs text-cyan-400 font-mono tracking-wider">CLINICAL AI WORKSPACE</p>
            </div>
          </Link>
          <p className="text-sm text-slate-400">
            Secure sign-in for authorized medical practitioners and administrators
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-white font-semibold">Sign In</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Select a clinical role preset or enter your institutional credentials.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Quick-fill Role Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Quick Role Presets
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill("doctor", "doctor123")}
                  className={`h-auto py-2.5 px-2 flex flex-col items-center gap-1 border-slate-700 bg-slate-800/60 hover:bg-cyan-950/50 hover:border-cyan-500/50 text-slate-200 transition-all ${
                    username === "doctor" ? "border-cyan-500 bg-cyan-950/60 ring-1 ring-cyan-500" : ""
                  }`}
                  data-testid="preset-doctor"
                >
                  <Stethoscope className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-semibold">Doctor</span>
                  <span className="text-[10px] text-slate-400">Dr. Chen</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill("tech", "tech123")}
                  className={`h-auto py-2.5 px-2 flex flex-col items-center gap-1 border-slate-700 bg-slate-800/60 hover:bg-amber-950/50 hover:border-amber-500/50 text-slate-200 transition-all ${
                    username === "tech" ? "border-amber-500 bg-amber-950/60 ring-1 ring-amber-500" : ""
                  }`}
                  data-testid="preset-tech"
                >
                  <Activity className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold">Technician</span>
                  <span className="text-[10px] text-slate-400">A. Martinez</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill("admin", "admin123")}
                  className={`h-auto py-2.5 px-2 flex flex-col items-center gap-1 border-slate-700 bg-slate-800/60 hover:bg-purple-950/50 hover:border-purple-500/50 text-slate-200 transition-all ${
                    username === "admin" ? "border-purple-500 bg-purple-950/60 ring-1 ring-purple-500" : ""
                  }`}
                  data-testid="preset-admin"
                >
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-semibold">Admin</span>
                  <span className="text-[10px] text-slate-400">Prof. Liu</span>
                </Button>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs text-slate-300">
                  Username or Institutional Email
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="e.g. doctor, tech, or admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500"
                    data-testid="input-username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500"
                    data-testid="input-password"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/25 h-10 transition-all"
                data-testid="button-submit-login"
              >
                {isLoggingIn ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating Session...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In to Workspace
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="border-t border-slate-800/80 pt-4 flex flex-col gap-2 text-center text-xs text-slate-500">
            <div className="flex items-center gap-1.5 justify-center">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              <span>Encrypted Session • Role-Enforced RBAC • Local SQLite Audit Trail</span>
            </div>
            <p className="text-[11px] text-slate-600">
              For research and clinical demonstration purposes only.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
