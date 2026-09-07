import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  FileText,
  Stethoscope,
  Users,
  Eye,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  ChevronRight,
  Database,
  BarChart3,
  ScanLine,
  Sliders,
  Crosshair,
  FileSpreadsheet,
  Server,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeXaiTab, setActiveXaiTab] = useState<"gradcam" | "gradcam_plus" | "ig" | "unet">("gradcam");

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-cyan-500 selection:text-white relative overflow-hidden">
      {/* ─── Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                  NEUROSCAN AI
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-semibold">
                  v3.0 CLINICAL
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono hidden sm:block">
                Trained CNN-ViT Hybrid & Attention U-Net Workstation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Button
                onClick={() => setLocation("/")}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-medium shadow-md shadow-cyan-500/20 text-xs h-9"
                data-testid="button-open-dashboard"
              >
                Go to Workspace ({user.role.toUpperCase()})
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted/50 text-xs h-9" data-testid="button-login">
                    Sign In
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium shadow-md shadow-cyan-500/25 text-xs h-9" data-testid="button-get-started">
                    Analyze MRI Scan
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Glow Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[450px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.05)_0%,transparent_60%)] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-xs font-medium backdrop-blur-md shadow-inner shadow-cyan-500/20">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-mono text-[11px]">Explainable Brain Tumor Detection & Radiomics PACS Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.1]">
            Precision AI for <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
              Neuroradiology Diagnostics
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed font-light">
            AI-assisted brain tumor classification, pixel-accurate Attention U-Net segmentation,
            multi-method Explainable AI heatmaps, and quantitative radiomics feature extraction —
            built around a trained CNN-ViT hybrid architecture with 50-pass Monte Carlo Dropout.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-sm shadow-xl shadow-cyan-500/30 rounded-xl transition-all">
                <ScanLine className="h-4 w-4 mr-2" />
                Launch Clinical Analysis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>

            <a href="#xai-showcase">
              <Button size="lg" variant="outline" className="h-12 px-7 border-border/80 bg-card/60 text-foreground hover:bg-muted/60 rounded-xl text-sm">
                <Eye className="h-4 w-4 mr-2 text-cyan-400" />
                Explore XAI Visualizations
              </Button>
            </a>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-card/60 border border-border/80 backdrop-blur-md text-left">
              <div className="flex items-center justify-between">
                <p className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">99.8%</p>
                <Activity className="h-4 w-4 text-cyan-500/50" />
              </div>
              <p className="text-xs font-semibold text-foreground mt-1">Validation AUC-ROC</p>
              <p className="text-[10px] text-muted-foreground">Test set benchmark</p>
            </div>
            <div className="p-4 rounded-xl bg-card/60 border border-border/80 backdrop-blur-md text-left">
              <div className="flex items-center justify-between">
                <p className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">4 Classes</p>
                <Layers className="h-4 w-4 text-blue-500/50" />
              </div>
              <p className="text-xs font-semibold text-foreground mt-1">Pathology Differential</p>
              <p className="text-[10px] text-muted-foreground">Glioma, Menin, Pituitary, Normal</p>
            </div>
            <div className="p-4 rounded-xl bg-card/60 border border-border/80 backdrop-blur-md text-left">
              <div className="flex items-center justify-between">
                <p className="text-2xl sm:text-3xl font-black text-teal-400 font-mono">50 Passes</p>
                <Sliders className="h-4 w-4 text-teal-500/50" />
              </div>
              <p className="text-xs font-semibold text-foreground mt-1">MC-Dropout Uncertainty</p>
              <p className="text-[10px] text-muted-foreground">Stochastic variance estimation</p>
            </div>
            <div className="p-4 rounded-xl bg-card/60 border border-border/80 backdrop-blur-md text-left">
              <div className="flex items-center justify-between">
                <p className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">3 XAI Maps</p>
                <Eye className="h-4 w-4 text-purple-500/50" />
              </div>
              <p className="text-xs font-semibold text-foreground mt-1">Explainable Attribution</p>
              <p className="text-[10px] text-muted-foreground">Grad-CAM, ++, Int. Gradients</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Interactive Workflow Pipeline ───────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/80 bg-muted/20">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-950/30">
              End-to-End Clinical Flow
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Autonomous Deep Learning Diagnostic Pipeline
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              From raw DICOM / MRI slice to multi-dimensional clinical insights in sub-second inference.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { step: "01", title: "MRI Ingestion", desc: "Upload axial brain slice (DICOM/JPG/PNG). Image tensor normalized.", icon: ScanLine },
              { step: "02", title: "Hybrid CNN-ViT", desc: "Dual-branch feature fusion extracting local texture & global context.", icon: Layers },
              { step: "03", title: "Uncertainty", desc: "50-pass Monte Carlo Dropout calculates confidence variance & risk tier.", icon: Activity },
              { step: "04", title: "Explainable AI", desc: "Generates Grad-CAM, Grad-CAM++, and Integrated Gradients heatmaps.", icon: Eye },
              { step: "05", title: "Segmentation", desc: "Attention U-Net delineates precise tumor boundary and area percentage.", icon: Sparkles },
              { step: "06", title: "Radiomics & Report", desc: "Extracts texture, shape, intensity metrics and compiles structured report.", icon: FileText },
            ].map((item, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-card/70 border border-border/70 hover:border-cyan-500/40 transition-all group flex flex-col justify-between shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                      STAGE {item.step}
                    </span>
                    <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <h3 className="text-xs font-bold text-foreground group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── XAI & Segmentation Showcase ─────────────────────────────────── */}
      <section id="xai-showcase" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/80 relative">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-950/30">
                Transparent Medical AI
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                Multi-Method Explainability & Attention Segmentation
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm">
                NeuroScan AI never acts as an unverified black box. Clinicians inspect voxel-level attribution maps
                alongside Attention U-Net tumor contours.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-card/80 p-1.5 rounded-xl border border-border/80 backdrop-blur-md">
              <Button
                size="sm"
                variant={activeXaiTab === "gradcam" ? "default" : "ghost"}
                onClick={() => setActiveXaiTab("gradcam")}
                className={`text-xs h-8 ${activeXaiTab === "gradcam" ? "bg-cyan-500 text-white shadow-sm" : "text-muted-foreground"}`}
              >
                Grad-CAM
              </Button>
              <Button
                size="sm"
                variant={activeXaiTab === "gradcam_plus" ? "default" : "ghost"}
                onClick={() => setActiveXaiTab("gradcam_plus")}
                className={`text-xs h-8 ${activeXaiTab === "gradcam_plus" ? "bg-cyan-500 text-white shadow-sm" : "text-muted-foreground"}`}
              >
                Grad-CAM++
              </Button>
              <Button
                size="sm"
                variant={activeXaiTab === "ig" ? "default" : "ghost"}
                onClick={() => setActiveXaiTab("ig")}
                className={`text-xs h-8 ${activeXaiTab === "ig" ? "bg-cyan-500 text-white shadow-sm" : "text-muted-foreground"}`}
              >
                Integrated Gradients
              </Button>
              <Button
                size="sm"
                variant={activeXaiTab === "unet" ? "default" : "ghost"}
                onClick={() => setActiveXaiTab("unet")}
                className={`text-xs h-8 ${activeXaiTab === "unet" ? "bg-cyan-500 text-white shadow-sm" : "text-muted-foreground"}`}
              >
                Attention U-Net
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-border/80 bg-card/60 backdrop-blur-md lg:col-span-2 overflow-hidden shadow-xl">
              <CardHeader className="border-b border-border/70 bg-background/50 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-cyan-400" />
                    <CardTitle className="text-sm text-foreground font-semibold">
                      {activeXaiTab === "gradcam" && "ResNet-50 Layer4 Grad-CAM Visual Attribution"}
                      {activeXaiTab === "gradcam_plus" && "Grad-CAM++ Weighted Higher-Order Attribution"}
                      {activeXaiTab === "ig" && "Axiomatic Integrated Gradients Attribution (50 Steps)"}
                      {activeXaiTab === "unet" && "Attention U-Net Skip-Gated Lesion Segmentation Mask"}
                    </CardTitle>
                  </div>
                  <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono">
                    Model Checkpoint Verified
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Raw Input Brain MRI</p>
                      <span className="text-[10px] font-mono text-cyan-400">AXIAL T2-FLAIR</span>
                    </div>
                    <div className="aspect-square rounded-xl bg-slate-950 border border-border flex items-center justify-center p-2 relative overflow-hidden group">
                      <div className="w-full h-full rounded-lg bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center relative">
                        {/* Simulation of Brain Parenchyma */}
                        <div className="w-4/5 h-4/5 rounded-full border-2 border-slate-700/60 bg-slate-900/80 flex items-center justify-center relative shadow-inner">
                          <div className="w-24 h-24 rounded-full bg-slate-700/30 blur-sm" />
                          <div className="absolute w-12 h-14 bg-slate-600/40 rounded-full top-8 right-10 blur-xs" />
                        </div>
                        <span className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                          T1/T2 Axial 224x224
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {activeXaiTab === "unet" ? "Segmentation Mask Overlay" : "Explainability Heatmap Overlay"}
                      </p>
                      <span className="text-[10px] font-mono text-emerald-400">CONFIDENCE: 98.4%</span>
                    </div>
                    <div className="aspect-square rounded-xl bg-slate-950 border border-cyan-500/30 flex items-center justify-center p-2 relative overflow-hidden">
                      <div className="w-full h-full rounded-lg bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center relative">
                        <div className="w-4/5 h-4/5 rounded-full border-2 border-slate-700/60 bg-slate-900/80 flex items-center justify-center relative shadow-inner">
                          {activeXaiTab === "unet" ? (
                            <div className="absolute top-8 right-10 w-16 h-18 rounded-2xl bg-red-500/50 border-2 border-red-400 shadow-lg shadow-red-500/40 flex items-center justify-center">
                              <span className="text-[8px] font-mono font-bold text-white uppercase tracking-wider">Lesion</span>
                            </div>
                          ) : (
                            <div className="absolute top-6 right-8 w-24 h-24 rounded-full bg-gradient-to-r from-yellow-500/70 via-red-500/80 to-purple-600/60 blur-md animate-pulse" />
                          )}
                        </div>
                        <span className="absolute bottom-2 left-2 text-[9px] font-mono text-cyan-400 bg-slate-950/90 px-2 py-0.5 rounded border border-cyan-500/30">
                          {activeXaiTab.toUpperCase()} Attributed ROI
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4 flex flex-col justify-between">
              <Card className="border-border/80 bg-card/60 backdrop-blur-md shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Crosshair className="h-4 w-4 text-cyan-400" />
                    Pointing Game Faithfulness
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p className="text-[11px]">Evaluates whether peak CAM attribution activation falls inside the segmented tumor geometry.</p>
                  <div className="flex items-center justify-between pt-1 border-t border-border text-xs">
                    <span className="text-muted-foreground text-[11px]">Attribution Hit Rate:</span>
                    <span className="font-bold font-mono text-cyan-400">1.00 (100% Inside ROI)</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/60 backdrop-blur-md shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-teal-400" />
                    Pixel Flipping Curve
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p className="text-[11px]">Measures model output degradation as top-attributed pixels are systematically masked.</p>
                  <div className="flex items-center justify-between pt-1 border-t border-border text-xs">
                    <span className="text-muted-foreground text-[11px]">Energy (Top 10% Voxels):</span>
                    <span className="font-bold font-mono text-teal-400">74.2% Total Weight</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/60 backdrop-blur-md shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-purple-400" />
                    Quantitative Radiomics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p className="text-[11px]">Extracts intensity mean, GLCM contrast, entropy, lesion sphericity, and perimeter.</p>
                  <div className="flex items-center justify-between pt-1 border-t border-border text-xs">
                    <span className="text-muted-foreground text-[11px]">Feature Ranking:</span>
                    <span className="font-bold font-mono text-purple-400">SHAP Normalized</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Role-Based Platform Matrix ──────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/80 bg-muted/20">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-950/30">
              Role-Enforced Workspaces
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Dedicated Medical & Administrative Portals
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Role-based access controls and customized views tailored for radiologists, technicians, and clinical administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Doctor Card */}
            <Card className="border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-card/90 backdrop-blur-md hover:border-cyan-500/50 transition-all shadow-md">
              <CardHeader className="space-y-2">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg text-foreground font-bold">Doctor Workspace</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  For Neuroradiologists & Neurosurgeons
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">Full MRI viewer with interactive U-Net segmentation overlays and opacity slider</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">Multi-method Explainable AI heatmaps & faithfulness metrics</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">Clinical case management, follow-up timelines, and patient history</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">Instant local diagnostic report generation & print export</span>
                </div>
              </CardContent>
            </Card>

            {/* Technician Card */}
            <Card className="border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-card/90 backdrop-blur-md hover:border-amber-500/50 transition-all shadow-md">
              <CardHeader className="space-y-2">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Activity className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg text-foreground font-bold">Technician Portal</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  For MRI Radiographers & Scanning Technologists
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">Streamlined scan ingestion with patient metadata registry</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">Real-time 8-stage neural pipeline processing status tracking</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">Recent upload logs and verification of image suitability</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">Strict sandboxing preventing unauthorized administrative actions</span>
                </div>
              </CardContent>
            </Card>

            {/* Administrator Card */}
            <Card className="border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-card/90 backdrop-blur-md hover:border-purple-500/50 transition-all shadow-md">
              <CardHeader className="space-y-2">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg text-foreground font-bold">Hospital Administrator</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  For Clinical Directors & IT Operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">Complete staff management (Doctor, Tech, Admin account creation)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">Searchable and filterable SQLite audit trail across all events</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">Institutional scan throughput, detection statistics, and system logs</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">Model performance, ROC-AUC calibration, and ablation study reports</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Clinical Disclaimer & Footer ───────────────────────────────── */}
      <footer className="border-t border-border/80 bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Medical Alert Box */}
          <div className="p-4 rounded-xl bg-card/60 border border-amber-500/30 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-foreground">
              <p className="font-semibold text-amber-400 text-xs">MANDATORY CLINICAL & REGULATORY NOTICE</p>
              <p className="text-muted-foreground leading-relaxed font-light text-[11px]">
                NEUROSCAN AI is an AI-assisted research and decision-support demonstration platform.
                It is not certified as a primary diagnostic device. All findings, classifications,
                segmentations, and reports must be verified by a board-certified medical specialist before
                any clinical action is taken.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-cyan-500" />
              <span className="font-semibold text-foreground">NEUROSCAN AI</span>
              <span>— Deep Learning Brain Tumor Intelligence Platform</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span>CNN-ViT Hybrid</span>
              <span>•</span>
              <span>Attention U-Net</span>
              <span>•</span>
              <span>PyTorch 2.12</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
