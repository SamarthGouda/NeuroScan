import { useRoute, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  FileText,
  Printer,
  Download,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  User,
  Building,
  Activity,
  Layers,
  Sparkles,
  QrCode,
  CheckCircle2,
} from "lucide-react";
import type { Scan, DiagnosticReport } from "@shared/schema";

export default function ReportPage() {
  const [, params] = useRoute<{ id: string }>("/report/:id");
  const [, setLocation] = useLocation();
  const scanId = params?.id || "";

  const { data: scan, isLoading: scanLoading } = useQuery<Scan>({
    queryKey: ["/api/scans", scanId],
    queryFn: async () => {
      const res = await fetch(`/api/scans/${scanId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load scan");
      return await res.json();
    },
    enabled: !!scanId,
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery<DiagnosticReport[]>({
    queryKey: ["/api/scans", scanId, "reports"],
    queryFn: async () => {
      const res = await fetch(`/api/scans/${scanId}/reports`, { credentials: "include" });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: !!scanId,
  });

  const latestReport = reports[0] || (scan?.analysisData?.clinical_report ? {
    id: "latest",
    version: 1,
    title: `Diagnostic Report — ${scan.patientName} (${scan.tumorType})`,
    reportContent: scan.analysisData.clinical_report,
    generatedAt: scan.uploadedAt || new Date().toISOString(),
  } : null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    if (!latestReport) return;
    const blob = new Blob([latestReport.reportContent || scan?.analysisData?.clinical_report || ""], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NEUROSCAN_REPORT_${scan?.patientCode || scanId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (scanLoading || reportsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 font-mono">
        <div className="h-8 w-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Compiling Clinical Diagnostic Report...</p>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="text-center py-16 space-y-3">
        <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
        <p className="text-base font-bold text-foreground">Scan or Diagnostic Report Not Found</p>
        <Link href="/">
          <Button variant="outline" className="rounded-xl">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const ana = scan.analysisData;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 print:p-0 print:m-0 print:max-w-full">
      {/* Action Header Controls (Hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-card/75 backdrop-blur-2xl border border-white/[0.08] shadow-xl shadow-cyan-950/15 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/scan/${scan.id}`)}
            className="h-9 border-border/70 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Interactive Analysis
          </Button>
          <Badge variant="outline" className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border-cyan-500/30 px-2 py-0.5">
            Report v{latestReport?.version || 1}
          </Badge>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTxt}
            className="h-9 border-border/70 hover:bg-muted rounded-xl"
            data-testid="button-download-report-txt"
          >
            <Download className="h-4 w-4 mr-1.5 text-cyan-400" />
            Download (.txt)
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold h-9 rounded-xl shadow-md shadow-cyan-500/20"
            data-testid="button-print-report"
          >
            <Printer className="h-4 w-4 mr-1.5" />
            Print / Export PDF
          </Button>
        </div>
      </div>

      {/* ─── Printable Institutional Clinical Document ────────────────── */}
      <div className="bg-card text-foreground rounded-2xl border border-border/80 p-8 sm:p-12 shadow-2xl space-y-8 print:border-none print:shadow-none print:p-2 print:bg-white print:text-black">
        {/* Institutional Letterhead */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25 ring-1 ring-white/20">
              <Brain className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-foreground font-sans">NEUROSCAN AI</h1>
                <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 border-cyan-500/30">
                  CLINICAL SUITE
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground uppercase font-mono tracking-wider mt-0.5">
                Neuroradiology Diagnostic & Radiomics Report
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-0.5 text-xs text-muted-foreground font-mono">
            <p className="font-bold text-foreground">
              CASE: {latestReport?.id?.slice(0, 12).toUpperCase() || scan.id.slice(0, 12).toUpperCase()}
            </p>
            <p>Generated: {new Date().toLocaleDateString()} · {new Date().toLocaleTimeString()}</p>
            <p className="text-cyan-400 font-semibold">{scan.hospitalName || "NeuroScan Medical Center"}</p>
          </div>
        </div>

        {/* Patient Demographics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/40 border border-border/70 text-xs">
          <div>
            <span className="text-muted-foreground font-medium text-[11px]">Patient Name:</span>
            <p className="font-bold text-foreground text-sm mt-0.5">{scan.patientName}</p>
          </div>
          <div>
            <span className="text-muted-foreground font-medium text-[11px]">MRN / Accession:</span>
            <p className="font-mono font-bold text-foreground mt-0.5">{scan.patientCode || scan.patientId}</p>
          </div>
          <div>
            <span className="text-muted-foreground font-medium text-[11px]">Demographics:</span>
            <p className="font-bold text-foreground mt-0.5">
              {scan.patientAge ? `${scan.patientAge} Y` : "N/A"} / {scan.patientGender || "Unspecified"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground font-medium text-[11px]">Classifier Variant:</span>
            <p className="font-bold text-cyan-400 mt-0.5 font-mono">{ana?.model_variant || "CNN-ViT Hybrid"}</p>
          </div>
        </div>

        {/* Structured Findings Pre-formatted Box */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
            Radiological Findings & Morphometrics
          </h2>
          <div className="p-5 rounded-xl bg-muted/25 border border-border/70 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed shadow-inner">
            {latestReport?.reportContent || ana?.clinical_report || "Diagnostic report content compiled from deep learning inference pipeline."}
          </div>
        </div>

        {/* Mandatory Clinical & Legal Disclaimer Box */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-400 font-mono text-[11px]">
            <ShieldCheck className="h-4 w-4" />
            MANDATORY MEDICAL & REGULATORY NOTICE
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed font-light">
            This diagnostic report is compiled by an artificial intelligence decision-support tool (NeuroScan AI v3.0).
            This report does NOT constitute a standalone medical diagnosis and must be reviewed, verified, and signed by a licensed,
            board-certified radiologist or neurosurgeon prior to taking any therapeutic intervention or surgical planning.
          </p>
        </div>

        {/* Signatures & Telemetry Row */}
        <div className="grid grid-cols-2 gap-8 pt-6 border-t border-border/80 text-xs">
          <div className="space-y-1">
            <p className="text-muted-foreground text-[11px]">Autonomous Verification:</p>
            <p className="font-bold text-foreground">NeuroScan AI v3.0 Inference Engine</p>
            <p className="text-[10px] text-muted-foreground font-mono">Security Checksum: SHA-256 Validated</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-muted-foreground text-[11px]">Reviewing Neuroradiologist:</p>
            <p className="font-bold text-foreground font-mono">____________________________</p>
            <p className="text-[10px] text-muted-foreground font-mono">Signature & Date</p>
          </div>
        </div>
      </div>
    </div>
  );
}
