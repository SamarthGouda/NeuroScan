import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, isLoggingIn, register, isRegistering, verifyEmail, isVerifyingEmail, googleVerify, isGoogleVerifying } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"login" | "register" | "verify" | "forgot">("login");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registration form state
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<"doctor" | "technician">("doctor");

  // Email verification state
  const [verifyEmailAddress, setVerifyEmailAddress] = useState("");
  const [verifyOtpCode, setVerifyOtpCode] = useState("");
  const [isResending, setIsResending] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<"request" | "confirm">("request");
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // Check URL parameters for Google OAuth callback or errors
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const error = urlParams.get("error");

    if (error) {
      setErrorMessage(`Google authentication error: ${error}`);
    } else if (code) {
      // Complete authorization code exchange
      (async () => {
        try {
          const user = await googleVerify({ code, state: state || undefined });
          toast({
            title: `Welcome, ${user.fullName}`,
            description: `Signed in via Google OAuth with active role: ${user.role.toUpperCase()}`,
          });
          setLocation("/");
        } catch (err: any) {
          setErrorMessage(err.message || "Google OAuth token exchange failed.");
        }
      })();
    }
  }, []);

  // ─── 1. Login Handler ───────────────────────────────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMessage("Please enter both username/email and password.");
      return;
    }

    try {
      const user = await login({ username: loginIdentifier.trim(), password: loginPassword });
      toast({
        title: `Welcome back, ${user.fullName || user.username}`,
        description: `Authenticated as ${user.role.toUpperCase()} with active clinical session.`,
      });
      setLocation("/");
    } catch (err: any) {
      if (err.isUnverified) {
        setVerifyEmailAddress(loginIdentifier.includes("@") ? loginIdentifier.trim() : "");
        setActiveTab("verify");
        setErrorMessage("Your email address is not verified. A verification code has been dispatched to your email.");
      } else {
        setErrorMessage(err.message || "Invalid credentials. Please verify username and password.");
      }
    }
  };

  // ─── 2. Registration Handler ───────────────────────────────────────────────
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!regEmail.includes("@")) {
      setErrorMessage("Please enter a valid institutional email address.");
      return;
    }
    if (regPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    try {
      const res = await register({
        username: regUsername.trim() || regEmail.split("@")[0].toLowerCase(),
        email: regEmail.trim().toLowerCase(),
        full_name: regFullName.trim(),
        password: regPassword,
        role: regRole,
      });

      setVerifyEmailAddress(regEmail.trim().toLowerCase());
      setActiveTab("verify");
      setSuccessMessage(res.message || "Registration successful! Please enter the 6-digit code sent to your email.");
      toast({
        title: "Registration Initiated",
        description: "Please enter your 6-digit verification code to activate your account.",
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Registration failed. Please check your inputs.");
    }
  };

  // ─── 3. Email Verification Handler ─────────────────────────────────────────
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!verifyEmailAddress.trim() || !verifyOtpCode.trim()) {
      setErrorMessage("Please enter both your email address and 6-digit code.");
      return;
    }

    try {
      const user = await verifyEmail({
        email: verifyEmailAddress.trim().toLowerCase(),
        otp: verifyOtpCode.trim(),
      });
      toast({
        title: "Email Verified Successfully",
        description: `Account verified! Welcome to NeuroVision, ${user.fullName}`,
      });
      setLocation("/");
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid or expired verification code. Please request a new code.");
    }
  };

  const handleResendCode = async () => {
    if (!verifyEmailAddress.trim()) {
      setErrorMessage("Please enter your email address to resend code.");
      return;
    }
    setIsResending(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmailAddress.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to resend code");
      setSuccessMessage("A fresh 6-digit verification code has been dispatched to your email.");
      toast({ title: "Code Dispatched", description: "Please check your inbox." });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to resend code. Please wait 3 minutes.");
    } finally {
      setIsResending(false);
    }
  };

  // ─── 4. Google Sign-In Handler ─────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    try {
      const res = await fetch("/api/auth/google/url");
      const data = await res.json();
      if (!data.configured || !data.auth_url) {
        setErrorMessage(data.message || "Google OAuth is not configured on this server. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.");
        return;
      }
      // Redirect to Google Consent
      window.location.href = data.auth_url;
    } catch (err: any) {
      setErrorMessage("Failed to initiate Google Sign-In: " + (err.message || "Network error"));
    }
  };

  // ─── 5. Forgot Password Handler ───────────────────────────────────────────
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!forgotEmail.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    setIsForgotLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Password reset request failed");
      setForgotStep("confirm");
      setSuccessMessage("If an account exists with this email, a 6-digit reset code has been sent.");
      toast({ title: "Reset Code Sent", description: "Check your email for the code." });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to request password reset.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleForgotConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!forgotOtp.trim() || forgotNewPassword.length < 8) {
      setErrorMessage("Enter the 6-digit code and a new password with at least 8 characters.");
      return;
    }
    setIsForgotLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          otp: forgotOtp.trim(),
          new_password: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Password reset failed");
      setActiveTab("login");
      setLoginIdentifier(forgotEmail);
      setSuccessMessage("Password successfully reset! You can now log in with your new credentials.");
      toast({ title: "Password Reset Complete", description: "Please sign in." });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reset password.");
    } finally {
      setIsForgotLoading(false);
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
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Logo size="lg" href="/" />
          </div>
          <div className="flex items-center justify-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Secure Authentication Hub
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-200/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-300/60 dark:border-slate-700/60">
              Multi-Role RBAC v3.0.4
            </span>
          </div>
        </div>

        {/* Authentication Card */}
        <Card className="border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#0c121d]/95 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden relative">
          <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600" />

          <CardHeader className="space-y-1 pb-2 pt-5 px-6 sm:px-8">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-slate-900 dark:text-white font-bold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                Clinical Portal Access
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/5">
                Bcrypt + OIDC
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Authorized medical personnel, radiologist, and clinical administrator sign-in.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 px-6 sm:px-8 pt-2">
            
            {/* Status alerts */}
            {errorMessage && (
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={(val: any) => { setActiveTab(val); setErrorMessage(""); setSuccessMessage(""); }} className="w-full">
              <TabsList className="grid grid-cols-4 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-4">
                <TabsTrigger value="login" className="text-xs rounded-lg font-medium">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="text-xs rounded-lg font-medium">Register</TabsTrigger>
                <TabsTrigger value="verify" className="text-xs rounded-lg font-medium">Verify</TabsTrigger>
                <TabsTrigger value="forgot" className="text-xs rounded-lg font-medium">Reset</TabsTrigger>
              </TabsList>

              {/* ─── TAB 1: SIGN IN ───────────────────────────────────────── */}
              <TabsContent value="login" className="space-y-4 m-0">
                
                {/* Google Sign-In Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  disabled={isLoggingIn || isGoogleVerifying}
                  className="w-full h-11 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
                  data-testid="button-google-signin"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Sign in with Google</span>
                </Button>

                <div className="relative flex py-1 items-center justify-center">
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                  <span className="flex-shrink mx-3 text-[10px] uppercase font-mono text-slate-400">or sign in with password</span>
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label htmlFor="login-username" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Username or Institutional Email
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="login-username"
                        type="text"
                        placeholder="doctor@hospital.org or username"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className="pl-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl text-xs h-10 focus:border-cyan-500"
                        data-testid="input-username"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => { setActiveTab("forgot"); setForgotEmail(loginIdentifier); }}
                        className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
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
                        Authenticating...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Sign In to Clinical Workspace
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* ─── TAB 2: REGISTER ──────────────────────────────────────── */}
              <TabsContent value="register" className="space-y-3.5 m-0">
                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Full Professional Name</Label>
                    <Input
                      type="text"
                      placeholder="Dr. Jane Doe, MD"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl text-xs h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Institutional Email</Label>
                    <Input
                      type="email"
                      placeholder="jane.doe@hospital.org"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl text-xs h-9"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Username</Label>
                      <Input
                        type="text"
                        placeholder="jdoe"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        className="bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Initial Role</Label>
                      <select
                        value={regRole}
                        onChange={(e: any) => setRegRole(e.target.value)}
                        className="w-full bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs h-9 px-2 text-foreground focus:border-cyan-500"
                      >
                        <option value="doctor">Doctor (Radiologist)</option>
                        <option value="technician">MRI Technologist</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Password (Min. 8 characters)</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl text-xs h-9 font-mono"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold h-10 rounded-xl shadow-md text-xs mt-2"
                  >
                    {isRegistering ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating Account...
                      </span>
                    ) : (
                      "Register Account & Send Verification Code"
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* ─── TAB 3: VERIFY EMAIL ──────────────────────────────────── */}
              <TabsContent value="verify" className="space-y-3.5 m-0">
                <form onSubmit={handleVerifySubmit} className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter the 6-digit verification code sent to your email address:
                  </p>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Email Address</Label>
                    <Input
                      type="email"
                      placeholder="user@hospital.org"
                      value={verifyEmailAddress}
                      onChange={(e) => setVerifyEmailAddress(e.target.value)}
                      className="bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl text-xs h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">6-Digit Verification Code</Label>
                    <Input
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={verifyOtpCode}
                      onChange={(e) => setVerifyOtpCode(e.target.value.replace(/\D/g, ""))}
                      className="bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl text-center font-mono text-lg tracking-widest h-11"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleResendCode}
                      disabled={isResending}
                      className="text-xs text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 h-8 px-2"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isResending ? "animate-spin" : ""}`} />
                      Resend Code
                    </Button>
                    
                    <Button
                      type="submit"
                      disabled={isVerifyingEmail}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold h-9 px-4 rounded-xl text-xs"
                    >
                      {isVerifyingEmail ? "Verifying..." : "Verify & Sign In"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* ─── TAB 4: FORGOT / RESET PASSWORD ────────────────────────── */}
              <TabsContent value="forgot" className="space-y-3.5 m-0">
                {forgotStep === "request" ? (
                  <form onSubmit={handleForgotRequest} className="space-y-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enter your account email to receive a password recovery verification code:
                    </p>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Account Email</Label>
                      <Input
                        type="email"
                        placeholder="user@hospital.org"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl text-xs h-9"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isForgotLoading}
                      className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold h-10 rounded-xl shadow-md text-xs"
                    >
                      {isForgotLoading ? "Sending Code..." : "Send Password Reset Code"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleForgotConfirm} className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">6-Digit Reset Code</Label>
                      <Input
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                        className="bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl text-center font-mono text-base tracking-widest h-10"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">New Password</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        className="bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl text-xs h-10 font-mono"
                        required
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setForgotStep("request")}
                        className="w-1/3 text-xs"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={isForgotLoading}
                        className="w-2/3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold h-10 rounded-xl text-xs"
                      >
                        {isForgotLoading ? "Updating..." : "Update Password"}
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="border-t border-slate-100 dark:border-slate-800/80 pt-3 pb-4 px-6 sm:px-8 flex flex-col gap-1.5 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-1.5 justify-center text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>HIPAA Compliant • End-to-End Encrypted Sessions • Audit Trail</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Initial administrator access is provisioned securely via CLI.
            </p>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
