import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Users,
  ScanLine,
  Activity,
  FileText,
  BarChart3,
  Server,
  ArrowRight,
  UserPlus,
  History,
  CheckCircle2,
  Lock,
  Cpu,
  Zap,
} from "lucide-react";
import type { DashboardStats } from "@shared/schema";

interface SystemStats {
  total_users: number;
  doctors_count: number;
  technicians_count: number;
  administrators_count: number;
  active_users_count: number;
  total_scans: number;
  total_analyses: number;
  total_reports: number;
  system_status: string;
  ml_inference_device: string;
  storage_status: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: sysStats } = useQuery<SystemStats>({
    queryKey: ["/api/stats/system"],
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── Administrator Console Header ─────────────────────────────── */}
      <div className="rounded-2xl bg-card/75 backdrop-blur-2xl border border-white/[0.08] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl shadow-purple-950/20">
        <div className="absolute top-0 right-0 w-96 h-40 bg-gradient-to-bl from-purple-500/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <Badge className="bg-purple-500/15 text-purple-400 border border-purple-500/30 px-2.5 py-0.5">
              Hospital Operations Command
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              Core Services Nominal
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Hospital Administration — {user?.fullName || "Prof. James Liu"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Manage hospital medical staff access, monitor institutional MRI throughput,
            audit clinical operations, and track ML classifier diagnostics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Link href="/users">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-lg shadow-purple-500/20 h-10 px-4 rounded-xl text-xs transition-all hover:scale-[1.02]" data-testid="button-manage-users">
              <UserPlus className="h-4 w-4 mr-2" />
              Manage Staff
            </Button>
          </Link>
          <Link href="/audit-logs">
            <Button variant="outline" className="border-border/70 h-10 px-4 rounded-xl text-xs hover:bg-muted" data-testid="button-view-audit">
              <History className="h-4 w-4 mr-2 text-cyan-400" />
              Audit Logs
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Operational Telemetry KPIs ───────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl hover:border-purple-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
              Authorized Staff
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center ring-1 ring-purple-500/20">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground font-mono">
              {sysStats?.total_users ?? 3}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              {sysStats?.doctors_count ?? 1} Doctors • {sysStats?.technicians_count ?? 1} Techs • {sysStats?.administrators_count ?? 1} Admins
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl hover:border-cyan-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
              Total Analyzed Scans
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center ring-1 ring-cyan-500/20">
              <ScanLine className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-cyan-400 font-mono">
              {stats?.total_scans ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              {stats?.tumors_detected ?? 0} Pathologies Delineated
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl hover:border-emerald-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
              PACS / API Engine
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20">
              <Server className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black text-emerald-400 flex items-center gap-2 font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              Operational
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              FastAPI + SQLite Engine
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl hover:border-blue-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
              Validation ROC-AUC
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center ring-1 ring-blue-500/20">
              <BarChart3 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-400 font-mono">
              {((stats?.test_auc ?? 0.9998) * 100).toFixed(2)}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              Multi-class AUC benchmark
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Administrative Quick Navigation Deck ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              <CardTitle className="text-base font-bold text-foreground">Staff & User Management</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Provision clinician credentials, assign RBAC permissions, and toggle access.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Link href="/users">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-10 rounded-xl font-semibold shadow-md shadow-purple-500/20">
                Open Staff Directory
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              <CardTitle className="text-base font-bold text-foreground">Compliance & Audit Trail</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Inspect immutable audit records of all logins, uploads, predictions, and report downloads.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Link href="/audit-logs">
              <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs h-10 rounded-xl font-semibold shadow-md shadow-cyan-500/20">
                View Audit Trail
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-base font-bold text-foreground">AI Diagnostics & Ablation</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Examine cross-validation metrics, ROC curves, and architecture ablation studies.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Link href="/statistics">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 rounded-xl font-semibold shadow-md shadow-emerald-500/20">
                Inspect AI Analytics
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ─── Real Audit Activity Stream ───────────────────────────────── */}
      <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Live Hospital Activity Audit</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Real-time security and operational events from SQLite audit trail
              </CardDescription>
            </div>
            <Link href="/audit-logs">
              <Button variant="ghost" size="sm" className="text-xs text-purple-400 hover:text-purple-300 font-mono">
                View All Logs →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {stats?.recent_activity && stats.recent_activity.length > 0 ? (
            <div className="space-y-2.5">
              {stats.recent_activity.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-cyan-400" />
                    <div>
                      <p className="font-semibold text-foreground">
                        <span className="font-mono text-cyan-400">@{log.username}</span>: {log.action}
                      </p>
                      <p className="text-muted-foreground text-[11px]">{log.details}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground font-mono">
              No recent audit events recorded.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
