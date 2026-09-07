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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-950/30 via-slate-900 to-cyan-950/30 border border-purple-500/20 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs">
              Radiology Document Repository
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">{reports.length} Total Reports</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Diagnostic Reports Archive
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Access compiled clinical radiology diagnostic reports, view quantitative summaries, and export clinical findings.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports by title, patient, findings, scan ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs bg-background/60"
              data-testid="input-search-reports"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 py-12 text-center text-xs text-muted-foreground">Loading diagnostic reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="col-span-2 py-16 text-center space-y-3">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">No Diagnostic Reports Found</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <Card key={report.id} className="border-border/60 bg-card/60 backdrop-blur-sm hover:border-cyan-500/40 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-mono text-cyan-400 border-cyan-500/30">
                    Version {report.version}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {new Date(report.generatedAt || report.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <CardTitle className="text-base font-bold text-foreground mt-2">{report.title}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                  {report.summary || "Clinical diagnostic evaluation generated from AI inference pipeline."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex items-center justify-between border-t border-border/40 p-4">
                <span className="text-[11px] font-mono text-muted-foreground">Scan: {report.scanId?.slice(0, 8)}</span>
                <div className="flex items-center gap-2">
                  <Link href={`/report/${report.scanId}`}>
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      <Eye className="h-3.5 w-3.5 mr-1" /> View Full
                    </Button>
                  </Link>
                  <a href={`/api/reports/${report.id}/download`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-8 text-xs">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
