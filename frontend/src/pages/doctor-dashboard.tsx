import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  ScanLine,
  FolderOpen,
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowRight,
  Upload,
  Activity,
  ShieldAlert,
  Search,
  Sparkles,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import type { DashboardStats, Scan } from "@shared/schema";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: scans = [], isLoading: scansLoading } = useQuery<Scan[]>({
    queryKey: ["/api/scans"],
  });

  const filteredScans = scans.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      s.patientName?.toLowerCase().includes(q) ||
      s.patientCode?.toLowerCase().includes(q) ||
      s.tumorType?.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  });

  const tumorCount = stats?.tumors_detected ?? scans.filter((s) => s.tumorDetected).length;
  const highRiskCount = stats?.high_risk_count ?? scans.filter((s) => s.riskLevel === "HIGH").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── Neuroradiology Command Console Welcome ──────────────────────── */}
      <div className="rounded-2xl bg-card/75 backdrop-blur-2xl border border-white/[0.08] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl shadow-cyan-950/20">
        <div className="absolute top-0 right-0 w-96 h-40 bg-gradient-to-bl from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 font-mono">
              Neuroradiology Diagnostic Station
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">NeuroScan AI v3.0 CLINICAL</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Welcome, {user?.fullName || "Dr. Sarah Chen"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {user?.title || "Lead Neuroradiologist"} — Review patient MRI series, inspect Attention U-Net
            delineations, evaluate Bayesian uncertainty tiers, and validate AI-generated clinical findings.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Link href="/upload">
            <Button className="bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/25 h-11 px-5 rounded-xl transition-all hover:scale-[1.02]" data-testid="button-new-analysis">
              <Upload className="h-4 w-4 mr-2" />
              New Scan Analysis
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Primary Diagnostic KPIs ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Scans */}
        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl hover:border-cyan-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
              Total Patient Scans
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center ring-1 ring-cyan-500/20">
              <ScanLine className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-foreground font-mono">
              {statsLoading ? "..." : stats?.total_scans ?? scans.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-mono">
              <span className="text-cyan-400 font-semibold">100% Processed</span> via Hybrid CNN-ViT
            </p>
          </CardContent>
        </Card>

        {/* Tumors Detected */}
        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl hover:border-amber-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
              Tumors Delineated
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center ring-1 ring-amber-500/20">
              <Brain className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {statsLoading ? "..." : tumorCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Glioma, Meningioma & Pituitary
            </p>
          </CardContent>
        </Card>

        {/* High-Risk Alerts */}
        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl hover:border-rose-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
              High-Risk Alerts
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center ring-1 ring-rose-500/20">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
              {statsLoading ? "..." : highRiskCount}
            </div>
            <p className="text-[11px] text-rose-400/80 mt-1 font-mono">
              Requires immediate surgical triage
            </p>
          </CardContent>
        </Card>

        {/* Active Cases */}
        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl hover:border-blue-500/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
              Active Cases
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center ring-1 ring-blue-500/20">
              <FolderOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-foreground font-mono">
              {statsLoading ? "..." : stats?.active_cases ?? scans.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Tracked in neuroradiology workflow
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Pathology Distribution & Workflow Deck ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl lg:col-span-2">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Pathology Classification Distribution
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Intracranial findings breakdown from continuous CNN-ViT inference
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border-cyan-500/30">
                4 Pathology Classes
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: "Glioma", key: "glioma", color: "text-rose-400 border-rose-500/30 bg-rose-500/10", count: stats?.class_distribution?.glioma ?? 0 },
                { name: "Meningioma", key: "meningioma", color: "text-amber-400 border-amber-500/30 bg-amber-500/10", count: stats?.class_distribution?.meningioma ?? 0 },
                { name: "Pituitary", key: "pituitary", color: "text-sky-400 border-sky-500/30 bg-sky-500/10", count: stats?.class_distribution?.pituitary ?? 0 },
                { name: "No Tumor", key: "notumor", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", count: stats?.class_distribution?.notumor ?? 0 },
              ].map((item) => (
                <div key={item.key} className={`p-4 rounded-xl border ${item.color} space-y-1`}>
                  <p className="text-xs font-semibold text-muted-foreground">{item.name}</p>
                  <p className="text-2xl font-black font-mono">{statsLoading ? "..." : item.count}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">Cases Indexed</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Review / Workflow Action Box */}
        <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              Quick Diagnosis Triage
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Direct access to unprocessed or flagged patient MRI acquisitions
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI Model Variant:</span>
                <span className="text-cyan-400 font-bold">Hybrid Dual-Branch</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Segmentation Engine:</span>
                <span className="text-purple-400 font-bold">Attention U-Net</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Explainability:</span>
                <span className="text-emerald-400 font-bold">Grad-CAM++ & IG</span>
              </div>
            </div>

            <Link href="/upload">
              <Button variant="outline" className="w-full h-10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 font-semibold rounded-xl text-xs">
                Initiate New MRI Scan Upload
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ─── Recent Patient Scans Table ──────────────────────────────────── */}
      <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-border/60">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Patient Scans Registry</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Continuous real-time registry of multi-sequence MRI brain scans
              </CardDescription>
            </div>
            <div className="w-full sm:w-72 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patient, MRN, tumor type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-background/60 border-border/70 rounded-xl"
                data-testid="input-search-scans"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {scansLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground font-mono">Loading patient scan registry...</div>
          ) : filteredScans.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ScanLine className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">No patient scans found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Upload a brain MRI scan to trigger the automatic AI classification, segmentation, and XAI pipeline.
              </p>
              <Link href="/upload">
                <Button size="sm" className="mt-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Upload First Scan
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground font-semibold uppercase tracking-wider font-mono text-[10px]">
                  <tr>
                    <th className="py-3.5 pl-6">Patient</th>
                    <th className="py-3.5">AI Diagnosis</th>
                    <th className="py-3.5">Confidence</th>
                    <th className="py-3.5">Uncertainty</th>
                    <th className="py-3.5">Risk Stratum</th>
                    <th className="py-3.5">Date</th>
                    <th className="py-3.5 text-right pr-6">Clinical Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredScans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-cyan-500/[0.03] transition-colors">
                      <td className="py-3.5 pl-6">
                        <div>
                          <p className="font-bold text-foreground">{scan.patientName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">MRN: {scan.patientCode || scan.id.slice(0, 8)}</p>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[11px] px-2 py-0.5 font-semibold ${
                            scan.tumorDetected
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          }`}
                        >
                          {scan.tumorType || "Processing"}
                        </Badge>
                      </td>
                      <td className="py-3.5 font-bold text-foreground font-mono">
                        {scan.confidence ? `${(scan.confidence * 100).toFixed(1)}%` : "N/A"}
                      </td>
                      <td className="py-3.5">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] px-2 py-0.5 ${
                            scan.uncertaintyTier === "LOW"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : scan.uncertaintyTier === "HIGH"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {scan.uncertaintyTier || "LOW"}
                        </Badge>
                      </td>
                      <td className="py-3.5">
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] px-2 py-0.5 font-bold ${
                            scan.riskLevel === "HIGH"
                              ? "bg-rose-500 text-white border-transparent"
                              : scan.riskLevel === "MEDIUM"
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          }`}
                        >
                          {scan.riskLevel || "LOW"}
                        </Badge>
                      </td>
                      <td className="py-3.5 text-muted-foreground font-mono text-[11px]">
                        {scan.createdAt ? new Date(scan.createdAt).toLocaleDateString() : "Today"}
                      </td>
                      <td className="py-3.5 text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/scan/${scan.id}`}>
                            <Button size="sm" variant="outline" className="h-8 text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 rounded-lg">
                              View Analysis
                            </Button>
                          </Link>
                          <Link href={`/report/${scan.id}`}>
                            <Button size="sm" variant="ghost" className="h-8 text-xs hover:bg-muted rounded-lg">
                              Report
                            </Button>
                          </Link>
                        </div>
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
