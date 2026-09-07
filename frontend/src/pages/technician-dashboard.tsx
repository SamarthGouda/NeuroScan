import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Activity,
  CheckCircle2,
  Clock,
  ScanLine,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Cpu,
} from "lucide-react";
import type { DashboardStats, Scan } from "@shared/schema";

export default function TechnicianDashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: scans = [], isLoading: scansLoading } = useQuery<Scan[]>({
    queryKey: ["/api/scans"],
  });

  const completedCount = stats?.completed_scans ?? scans.filter((s) => s.status === "completed").length;
  const pendingCount = stats?.pending_scans ?? scans.filter((s) => s.status === "pending" || s.status === "analyzing").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── Technician Banner ────────────────────────────────────────── */}
      <div className="rounded-2xl bg-card/75 backdrop-blur-2xl border border-white/[0.08] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl shadow-amber-950/20">
        <div className="absolute top-0 right-0 w-96 h-40 bg-gradient-to-bl from-amber-500/10 via-orange-500/5 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-0.5">
              MRI Acquisition & Tensor Portal
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">Operator Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Operator Console — {user?.fullName || "Alex Martinez"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Ingest patient brain MRI acquisitions, verify image tensor formatting, and trigger
            automated neural network screening for downstream radiologist review.
          </p>
        </div>

        <Link href="/upload" className="relative z-10">
          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-amber-500/25 h-11 px-5 rounded-xl transition-all hover:scale-[1.02]" data-testid="button-technician-upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload New MRI Scan
          </Button>
        </Link>
      </div>

      {/* ─── Technician Statistics Cards ─────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl hover:border-amber-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
              Total Ingested Scans
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center ring-1 ring-amber-500/20">
              <ScanLine className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground font-mono">{scans.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              Registered in clinical storage
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl hover:border-emerald-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
              Completed Inference
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-400 font-mono">{completedCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              AI analysis & XAI heatmaps generated
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl hover:border-blue-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
              Pending / In-Queue
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center ring-1 ring-blue-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-400 font-mono">{pendingCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              Real-time inference queue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Protocol & Scan Ingestion Guide ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-amber-400" />
              Standard Acquisition Protocol Checklist
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Ensure high-fidelity inputs before uploading for AI inference
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground pt-4">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Slice Orientation:</strong> Axial brain acquisitions are optimal for the CNN-ViT classifier.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Resolution:</strong> Minimum 224x224 pixels (higher resolution scans auto-normalized).</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Contrast Sequences:</strong> T1 post-contrast, T2-weighted, and FLAIR slices fully supported.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Patient Metadata:</strong> Record institutional Patient ID to link previous imaging sessions.</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              Technician Scope & Access Control
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Role-based security active
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground pt-4">
            <p className="leading-relaxed">
              Your technician profile allows you to ingest brain MRI scans and view real-time processing status.
              Administrative settings, user role management, and audit configuration are restricted to Hospital Administrators.
            </p>
            <Link href="/upload" className="block pt-2">
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-10 rounded-xl shadow-md shadow-amber-500/20">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Go to Scan Ingestion Zone
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ─── Recent Ingestion Registry Table ─────────────────────────── */}
      <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-border/60">
          <CardTitle className="text-lg font-bold text-foreground">Recent Ingestion History</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Log of latest scans submitted through this workstation
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {scansLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground font-mono">Loading recent scans...</div>
          ) : scans.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No scans uploaded yet in this session.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground font-semibold uppercase tracking-wider font-mono text-[10px]">
                  <tr>
                    <th className="py-3 pl-6">Patient Code</th>
                    <th className="py-3">Patient Name</th>
                    <th className="py-3">Filename</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">AI Result</th>
                    <th className="py-3 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {scans.slice(0, 8).map((scan) => (
                    <tr key={scan.id} className="hover:bg-cyan-500/[0.03] transition-colors">
                      <td className="py-3 pl-6 font-mono text-muted-foreground">{scan.patientCode || scan.id.slice(0, 8)}</td>
                      <td className="py-3 font-bold text-foreground">{scan.patientName}</td>
                      <td className="py-3 font-mono text-muted-foreground">{scan.fileName}</td>
                      <td className="py-3">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-mono">
                          {scan.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 font-medium text-foreground">
                        {scan.tumorType || "Processed"}
                      </td>
                      <td className="py-3 text-right pr-6">
                        <Link href={`/scan/${scan.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-3 border-border/70 rounded-lg hover:border-cyan-500/40 hover:text-cyan-400">
                            Inspect
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
