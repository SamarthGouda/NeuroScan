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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Technician Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-orange-950/40 border border-amber-500/20 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MRI Acquisition Portal
            </Badge>
            <span className="text-xs text-muted-foreground">Technician Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Operator Console — {user?.fullName || "Alex Martinez"}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Ingest patient brain MRI acquisitions, verify image tensor formatting, and trigger
            automated neural network screening for downstream radiologist review.
          </p>
        </div>

        <Link href="/upload">
          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-amber-500/20 h-11 px-5 rounded-xl" data-testid="button-technician-upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload New MRI Scan
          </Button>
        </Link>
      </div>

      {/* Technician Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Ingested Scans
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ScanLine className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{scans.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered in clinical storage
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Completed Processing
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-500">{completedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              AI analysis & XAI heatmaps generated
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending / In-Queue
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-500">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time inference queue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Protocol & Scan Ingestion Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-amber-500" />
              Standard Acquisition Protocol Checklist
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Ensure high-fidelity inputs before uploading for AI inference
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Slice Orientation:</strong> Axial brain acquisitions are optimal for the CNN-ViT classifier.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Resolution:</strong> Minimum 224x224 pixels (higher resolution scans auto-normalized).</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Contrast Sequences:</strong> T1 post-contrast, T2-weighted, and FLAIR slices fully supported.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Patient Metadata:</strong> Record institutional Patient ID to link previous imaging sessions.</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-500" />
              Technician Scope & Access Control
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Role-based security active
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              Your technician profile allows you to ingest brain MRI scans and view real-time processing status.
              Administrative settings, user role management, and audit configuration are restricted to Hospital Administrators.
            </p>
            <Link href="/upload" className="block pt-2">
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs h-9">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Go to Scan Ingestion Zone
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Uploads Table */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground">Recent Ingestion History</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Log of latest scans submitted through this workstation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scansLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading recent scans...</div>
          ) : scans.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No scans uploaded yet in this session.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/80 text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="pb-2.5 pl-2">Patient Code</th>
                    <th className="pb-2.5">Patient Name</th>
                    <th className="pb-2.5">Filename</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5">AI Result</th>
                    <th className="pb-2.5 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {scans.slice(0, 8).map((scan) => (
                    <tr key={scan.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-2.5 pl-2 font-mono text-muted-foreground">{scan.patientCode || scan.id.slice(0, 8)}</td>
                      <td className="py-2.5 font-semibold text-foreground">{scan.patientName}</td>
                      <td className="py-2.5 font-mono text-muted-foreground">{scan.fileName}</td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                          {scan.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2.5 font-medium text-foreground">
                        {scan.tumorType || "Processed"}
                      </td>
                      <td className="py-2.5 text-right pr-2">
                        <Link href={`/scan/${scan.id}`}>
                          <Button size="sm" variant="outline" className="h-6 text-[11px] px-2.5">
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
