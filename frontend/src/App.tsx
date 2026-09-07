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
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "3.5rem",
  };

  const userRole = user?.role || "doctor";

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Top Clinical Header */}
          <header className="flex items-center justify-between px-6 py-3 border-b border-border/60 bg-card/40 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="h-4 w-px bg-border/80 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>Hospital Network:</span>
                <Badge variant="outline" className="text-[11px] font-mono text-cyan-500 border-cyan-500/20">
                  NeuroScan Medical Center
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>

          {/* Main Workspace Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <MainRouter role={userRole} />
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-400 font-mono">Initializing NEUROSCAN AI...</p>
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
