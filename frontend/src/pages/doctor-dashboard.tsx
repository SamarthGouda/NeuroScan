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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 border border-cyan-500/20 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              Neuroradiology Workspace
            </Badge>
            <span className="text-xs text-muted-foreground">NeuroScan AI v3.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Welcome, {user?.fullName || "Dr. Sarah Chen"}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {user?.title || "Lead Neuroradiologist"} — Review incoming patient MRI scans, analyze Attention U-Net
            segmentations, inspect Explainable AI heatmaps, and generate clinical reports.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Link href="/upload">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/20 h-11 px-5 rounded-xl" data-testid="button-new-analysis">
              <Upload className="h-4 w-4 mr-2" />
              New Scan Analysis
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Statistics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-cyan-500/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Scans
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <ScanLine className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {statsLoading ? "..." : stats?.total_scans ?? scans.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-cyan-500 font-medium">100% Analyzed</span> with hybrid CNN-ViT
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-amber-500/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tumors Detected
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Brain className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-500">
              {statsLoading ? "..." : tumorCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Glioma, Meningioma & Pituitary
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-red-500/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              High-Risk Alerts
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-500">
              {statsLoading ? "..." : highRiskCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires urgent clinical escalation
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm hover:border-blue-500/30 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Cases
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FolderOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {statsLoading ? "..." : stats?.active_cases ?? scans.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tracked in case management
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tumor Distribution & Quick Action Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Tumor Classification Distribution
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Breakdown across patient scans processed in this facility
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs text-cyan-500 border-cyan-500/30">
                4 Pathology Classes
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[
                { name: "Glioma", key: "glioma", count: stats?.class_distribution?.glioma ?? 0, color: "from-red-500 to-orange-500", text: "text-red-500" },
                { name: "Meningioma", key: "meningioma", count: stats?.class_distribution?.meningioma ?? 0, color: "from-amber-500 to-yellow-500", text: "text-amber-500" },
                { name: "Pituitary Tumor", key: "pituitary", count: stats?.class_distribution?.pituitary ?? 0, color: "from-blue-500 to-cyan-500", text: "text-blue-500" },
                { name: "No Tumor (Normal)", key: "notumor", count: stats?.class_distribution?.notumor ?? 0, color: "from-emerald-500 to-teal-500", text: "text-emerald-500" },
              ].map((item) => (
                <div key={item.key} className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">{item.name}</span>
                  </div>
                  <p className={`text-xl font-extrabold ${item.text}`}>{item.count}</p>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                      style={{
                        width: stats?.total_scans ? `${Math.max(10, (item.count / stats.total_scans) * 100)}%` : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Tools */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground">Clinical Quick Tools</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Fast access to core modules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Link href="/upload" className="block">
              <Button variant="outline" className="w-full justify-between h-11 border-border/80 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <Upload className="h-4 w-4 text-cyan-500" />
                  Analyze New Brain MRI
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </Link>

            <Link href="/cases" className="block">
              <Button variant="outline" className="w-full justify-between h-11 border-border/80 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <FolderOpen className="h-4 w-4 text-blue-500" />
                  Manage Clinical Cases
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </Link>

            <Link href="/reports" className="block">
              <Button variant="outline" className="w-full justify-between h-11 border-border/80 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <FileText className="h-4 w-4 text-purple-500" />
                  Diagnostic Reports Archive
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Patient Scans Table */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Recent Patient Scans</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Live registry of analyzed MRI brain acquisitions
              </CardDescription>
            </div>
            <div className="w-full sm:w-64 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patient, ID, tumor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-background/60"
                data-testid="input-search-scans"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {scansLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading patient scans...</div>
          ) : filteredScans.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ScanLine className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">No patient scans found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Upload a brain MRI scan to trigger the automatic AI classification, segmentation, and XAI pipeline.
              </p>
              <Link href="/upload">
                <Button size="sm" className="mt-2 bg-cyan-500 hover:bg-cyan-600 text-white">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Upload First Scan
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/80 text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="pb-3 pl-2">Patient</th>
                    <th className="pb-3">Diagnosis</th>
                    <th className="pb-3">Confidence</th>
                    <th className="pb-3">Uncertainty</th>
                    <th className="pb-3">Risk Tier</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredScans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 pl-2">
                        <div>
                          <p className="font-semibold text-foreground">{scan.patientName}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{scan.patientCode || scan.id.slice(0, 8)}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={
                            scan.tumorDetected
                              ? "bg-red-500/10 text-red-500 border-red-500/30 font-semibold"
                              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-semibold"
                          }
                        >
                          {scan.tumorType || "Processing"}
                        </Badge>
                      </td>
                      <td className="py-3 font-medium text-foreground">
                        {scan.confidence ? `${(scan.confidence * 100).toFixed(1)}%` : "N/A"}
                      </td>
                      <td className="py-3 font-medium">
                        <Badge
                          variant="outline"
                          className={
                            scan.uncertaintyTier === "LOW"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]"
                              : scan.uncertaintyTier === "HIGH"
                              ? "bg-red-500/10 text-red-500 border-red-500/20 text-[10px]"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]"
                          }
                        >
                          {scan.uncertaintyTier || "LOW"}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={
                            scan.riskLevel === "HIGH"
                              ? "bg-red-500 text-white border-transparent"
                              : scan.riskLevel === "MEDIUM"
                              ? "bg-amber-500/20 text-amber-500 border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                          }
                        >
                          {scan.riskLevel || "LOW"}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {scan.createdAt ? new Date(scan.createdAt).toLocaleDateString() : "Today"}
                      </td>
                      <td className="py-3 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/scan/${scan.id}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-cyan-500/40 text-cyan-500 hover:bg-cyan-500/10">
                              View Analysis
                            </Button>
                          </Link>
                          <Link href={`/report/${scan.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs">
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
