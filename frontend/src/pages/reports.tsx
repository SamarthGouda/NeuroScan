import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Brain,
  Search,
  ScanLine,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { DiagnosticReport } from "@shared/schema";

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: reports = [], isLoading } = useQuery<DiagnosticReport[]>({
    queryKey: ["/api/reports"],
    queryFn: async () => {
      const res = await fetch("/api/reports", { credentials: "include" });
      if (!res.ok) return [];
      return await res.json();
    },
  });

  const filteredReports = reports.filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      r.title?.toLowerCase().includes(q) ||
      r.summary?.toLowerCase().includes(q) ||
      r.scanId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-card/75 backdrop-blur-2xl border border-white/[0.08] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl shadow-purple-950/20">
        <div className="absolute top-0 right-0 w-96 h-40 bg-gradient-to-bl from-purple-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="space-y-1.5 relative z-10">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <Badge className="bg-purple-500/15 text-purple-400 border border-purple-500/30 px-2.5 py-0.5">
              Radiology Document Repository
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-cyan-400 font-mono">{reports.length} Total Reports</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Diagnostic Reports Archive
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Access compiled clinical radiology diagnostic reports, review quantitative biomarkers, and export formal impressions.
          </p>
        </div>
      </div>

      {/* ─── Search Bar ───────────────────────────────────────────────── */}
      <Card className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports by title, patient, findings, scan ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 text-xs bg-background/60 border-border/70 rounded-xl"
              data-testid="input-search-reports"
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Reports Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 py-16 text-center text-xs text-muted-foreground font-mono">
            Loading diagnostic report records...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="col-span-2 py-16 text-center space-y-3 bg-card/40 rounded-2xl border border-border/60">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">No Diagnostic Reports Found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Reports are automatically generated when scans are analyzed in the workstation.
            </p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <Card key={report.id} className="border-border/70 bg-card/75 backdrop-blur-xl shadow-xl hover:border-cyan-500/40 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border-cyan-500/30 px-2 py-0.5">
                    Version {report.version}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {new Date(report.generatedAt || report.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <CardTitle className="text-base font-bold text-foreground mt-2">{report.title}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {report.summary || "Clinical diagnostic evaluation generated from AI inference pipeline."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex items-center justify-between gap-3 text-xs">
                <span className="font-mono text-muted-foreground text-[11px] truncate">
                  SCAN: {report.scanId?.slice(0, 8)}
                </span>
                <div className="flex items-center gap-2">
                  <a href={`/api/reports/${report.id}/download`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-8 text-xs hover:bg-muted rounded-lg">
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Export
                    </Button>
                  </a>
                  <Link href={`/report/${report.scanId}`}>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 rounded-lg">
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View Report
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
