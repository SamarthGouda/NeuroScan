import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Stethoscope, Activity, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/logo";

// Pages
import Landing from "@/pages/landing";
import LoginPage from "@/pages/login";
import DoctorDashboard from "@/pages/doctor-dashboard";
import TechnicianDashboard from "@/pages/technician-dashboard";
import AdminDashboard from "@/pages/dashboard";
import UploadPage from "@/pages/upload";
import ScanAnalysis from "@/pages/scan-analysis";
import CasesPage from "@/pages/cases";
import ReportPage from "@/pages/report-page";
import ReportsPage from "@/pages/reports";
import UsersPage from "@/pages/users";
import AuditLogsPage from "@/pages/audit-logs";
import StatisticsPage from "@/pages/statistics";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function DashboardDispatcher({ role }: { role: string }) {
  if (role === "admin") return <AdminDashboard />;
  if (role === "technician") return <TechnicianDashboard />;
  return <DoctorDashboard />;
}

function MainRouter({ role }: { role: string }) {
  return (
    <Switch>
      <Route path="/">
        {() => <DashboardDispatcher role={role} />}
      </Route>
      <Route path="/doctor" component={DoctorDashboard} />
      <Route path="/technician" component={TechnicianDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      
      <Route path="/upload" component={UploadPage} />
      <Route path="/doctor/upload" component={UploadPage} />
      <Route path="/technician/upload" component={UploadPage} />

      <Route path="/cases" component={CasesPage} />
      <Route path="/doctor/cases" component={CasesPage} />
      <Route path="/technician/uploads" component={CasesPage} />

      <Route path="/scan/:id" component={ScanAnalysis} />
      <Route path="/report/:id" component={ReportPage} />
      <Route path="/reports" component={ReportsPage} />

      <Route path="/users">
        {() => (role === "admin" ? <UsersPage /> : <DoctorDashboard />)}
      </Route>
      <Route path="/admin/users">
        {() => (role === "admin" ? <UsersPage /> : <DoctorDashboard />)}
      </Route>

      <Route path="/audit-logs">
        {() => (role === "admin" ? <AuditLogsPage /> : <DoctorDashboard />)}
      </Route>
      <Route path="/admin/audit-logs">
        {() => (role === "admin" ? <AuditLogsPage /> : <DoctorDashboard />)}
      </Route>

      <Route path="/statistics" component={StatisticsPage} />
      <Route path="/admin/statistics" component={StatisticsPage} />
      
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={LoginPage} />
      <Route component={Landing} />
    </Switch>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const initials = user.avatar || `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "DR";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-1 ring-border p-0" data-testid="button-user-menu">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.profileImageUrl || undefined} alt={user.fullName} />
            <AvatarFallback className="bg-cyan-500/10 text-cyan-400 font-bold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card text-foreground">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none">{user.fullName}</p>
            <p className="text-xs text-muted-foreground leading-none">{user.email}</p>
            <Badge variant="outline" className="w-fit text-[10px] mt-1 font-mono uppercase">
              {user.role}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer text-xs">
            Settings & Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-xs text-destructive">
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AuthenticatedContent() {
  const { user } = useAuth();
  const style = {
    "--sidebar-width": "17.5rem",
    "--sidebar-width-icon": "3.75rem",
  };

  const userRole = user?.role || "doctor";

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-cyan-500 selection:text-white">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-background">
          {/* Top Clinical Radiology HUD Header */}
          <header className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-border/70 bg-card/60 backdrop-blur-xl shrink-0 z-20 relative">
            {/* Subtle gradient accent line at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors" />
              <div className="h-4 w-px bg-border/80 hidden sm:block" />
              
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium">
                <span className="text-muted-foreground">Workstation:</span>
                <Badge variant="outline" className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 border-cyan-500/30 flex items-center gap-1.5 px-2 py-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  NeuroScan Medical Center
                </Badge>
              </div>

              <div className="hidden md:flex items-center gap-2 pl-2">
                <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border-emerald-500/20 px-2 py-0.5 shimmer">
                  AI Pipeline Online (CNN-ViT + Attention U-Net)
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md border border-border/50">
                <Activity className="h-3 w-3 text-cyan-400" />
                <span>PACS DICOM Sync: Active</span>
              </div>
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>

          {/* Main Workspace Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-background via-background to-card/20 relative">
            {/* Ambient glow orbs — purely decorative */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
              <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/[0.04] rounded-full blur-3xl animate-float" />
              <div className="absolute top-1/3 -right-24 w-80 h-80 bg-purple-500/[0.04] rounded-full blur-3xl animate-float-delayed" />
              <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-blue-500/[0.03] rounded-full blur-3xl animate-float" />
            </div>
            <div className="relative z-10 animate-in fade-in slide-in-from-bottom-1 duration-300">
              <MainRouter role={userRole} />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f6f4] dark:bg-[#070b12] text-foreground transition-colors duration-300">
        <div className="flex flex-col items-center gap-6 p-8 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl max-w-sm w-full mx-4 text-center">
          <Logo size="lg" />
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono">
              Initializing Clinical Workstation...
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">PACS DICOM • CNN-ViT Engine v3.0.4</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <PublicRouter />;
  }

  return <AuthenticatedContent />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="dark">
          <AppContent />
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
