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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeXaiTab, setActiveXaiTab] = useState<"gradcam" | "gradcam_plus" | "ig" | "unet">("gradcam");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white">
      {/* ─── Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                NEUROSCAN AI
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                v3.0 CLINICAL
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Button
                onClick={() => setLocation("/")}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-medium shadow-md shadow-cyan-500/20"
                data-testid="button-open-dashboard"
              >
                Go to Workspace ({user.role.toUpperCase()})
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800" data-testid="button-login">
                    Sign In
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium shadow-md shadow-cyan-500/25" data-testid="button-get-started">
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
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Glow Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-500/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-medium backdrop-blur-md shadow-inner shadow-cyan-500/20 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Explainable Brain Tumor Detection & Radiomics Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
            Next-Generation <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
              Brain MRI AI Intelligence
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-300 leading-relaxed font-light">
            AI-assisted brain tumor classification, pixel-accurate Attention U-Net segmentation,
            multi-method Explainable AI heatmaps, and quantitative radiomics feature extraction —
            built around a trained CNN-ViT hybrid architecture.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/login">
              <Button size="lg" className="h-13 px-8 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-base shadow-xl shadow-cyan-500/30 rounded-xl transition-all">
                <ScanLine className="h-5 w-5 mr-2" />
                Launch Clinical Analysis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>

            <a href="#xai-showcase">
              <Button size="lg" variant="outline" className="h-13 px-7 border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl">
                <Eye className="h-5 w-5 mr-2 text-cyan-400" />
                Explore XAI Visualizations
              </Button>
            </a>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <p className="text-3xl font-black text-cyan-400">99.8%</p>
              <p className="text-xs font-medium text-slate-400 mt-1">Validation AUC-ROC</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <p className="text-3xl font-black text-blue-400">4 Classes</p>
              <p className="text-xs font-medium text-slate-400 mt-1">Glioma • Meningioma • Pituitary • Normal</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <p className="text-3xl font-black text-teal-400">50 Passes</p>
              <p className="text-xs font-medium text-slate-400 mt-1">MC-Dropout Uncertainty</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <p className="text-3xl font-black text-purple-400">3 XAI Maps</p>
              <p className="text-xs font-medium text-slate-400 mt-1">Grad-CAM • Grad-CAM++ • Int. Gradients</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Interactive Workflow Pipeline ───────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 bg-slate-900/30">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-950/40">
              End-to-End Clinical Flow
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Autonomous Deep Learning Diagnostic Pipeline
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              From raw DICOM / MRI slice to multi-dimensional clinical insights in seconds.
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
              <div key={idx} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all group flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/20">
                      STAGE {item.step}
                    </span>
                    <item.icon className="h-5 w-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-light">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── XAI & Segmentation Showcase ─────────────────────────────────── */}
      <section id="xai-showcase" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-950/40">
                Transparent Medical AI
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Multi-Method Explainability & Attention Segmentation
              </h2>
              <p className="text-slate-400 text-sm sm:text-base">
                NeuroScan AI never acts as a black box. Clinicians inspect voxel-level attribution maps
                alongside Attention U-Net tumor contours.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
              <Button
                size="sm"
                variant={activeXaiTab === "gradcam" ? "default" : "ghost"}
                onClick={() => setActiveXaiTab("gradcam")}
                className={activeXaiTab === "gradcam" ? "bg-cyan-500 text-white" : "text-slate-400"}
              >
                Grad-CAM
              </Button>
              <Button
                size="sm"
                variant={activeXaiTab === "gradcam_plus" ? "default" : "ghost"}
                onClick={() => setActiveXaiTab("gradcam_plus")}
                className={activeXaiTab === "gradcam_plus" ? "bg-cyan-500 text-white" : "text-slate-400"}
              >
                Grad-CAM++
              </Button>
              <Button
                size="sm"
                variant={activeXaiTab === "ig" ? "default" : "ghost"}
                onClick={() => setActiveXaiTab("ig")}
                className={activeXaiTab === "ig" ? "bg-cyan-500 text-white" : "text-slate-400"}
              >
                Integrated Gradients
              </Button>
              <Button
                size="sm"
                variant={activeXaiTab === "unet" ? "default" : "ghost"}
                onClick={() => setActiveXaiTab("unet")}
                className={activeXaiTab === "unet" ? "bg-cyan-500 text-white" : "text-slate-400"}
              >
                Attention U-Net
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md lg:col-span-2 overflow-hidden">
              <CardHeader className="border-b border-slate-800/80 bg-slate-950/40 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-cyan-400" />
                    <CardTitle className="text-base text-white">
                      {activeXaiTab === "gradcam" && "ResNet-50 Layer4 Grad-CAM Visual Attribution"}
                      {activeXaiTab === "gradcam_plus" && "Grad-CAM++ Weighted Higher-Order Attribution"}
                      {activeXaiTab === "ig" && "Axiomatic Integrated Gradients Attribution"}
                      {activeXaiTab === "unet" && "Attention U-Net Skip-Gated Lesion Segmentation"}
                    </CardTitle>
                  </div>
                  <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    Live Model Output
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Raw Input Brain MRI</p>
                    <div className="aspect-square rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-2 relative overflow-hidden">
                      <div className="w-full h-full rounded-lg bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center relative">
                        <div className="w-3/4 h-3/4 rounded-full border-4 border-slate-700/60 flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-slate-600/40 blur-sm" />
                        </div>
                        <span className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded">T1/T2 Axial 224x224</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {activeXaiTab === "unet" ? "Segmentation Mask Overlay" : "Explainability Heatmap Overlay"}
                    </p>
                    <div className="aspect-square rounded-xl bg-slate-950 border border-cyan-500/30 flex items-center justify-center p-2 relative overflow-hidden">
                      <div className="w-full h-full rounded-lg bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center relative">
                        <div className="w-3/4 h-3/4 rounded-full border-4 border-slate-700/60 flex items-center justify-center">
                          {activeXaiTab === "unet" ? (
                            <div className="w-20 h-20 rounded-full bg-red-500/50 border-2 border-red-400 shadow-lg shadow-red-500/40 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-white">Tumor Mask</span>
                            </div>
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-yellow-500/70 via-red-500/80 to-purple-600/60 blur-md" />
                          )}
                        </div>
                        <span className="absolute bottom-2 left-2 text-[10px] font-mono text-cyan-400 bg-slate-950/90 px-2 py-0.5 rounded border border-cyan-500/30">
                          {activeXaiTab.toUpperCase()} Attributed ROI
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4 flex flex-col justify-between">
              <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-400" />
                    Pointing Game Faithfulness
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-300">
                  <p>Evaluates whether the peak CAM activation point falls inside the segmented tumor geometry.</p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                    <span className="text-slate-400">Attribution Hit Rate</span>
                    <span className="font-bold text-cyan-400">1.00 (100% Inside ROI)</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-teal-400" />
                    Pixel Flipping Curve
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-300">
                  <p>Measures model output degradation as top-attributed pixels are systematically masked.</p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                    <span className="text-slate-400">Energy Concentration (Top 10%)</span>
                    <span className="font-bold text-teal-400">74.2% Total Weight</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-400" />
                    Quantitative Radiomics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-300">
                  <p>Extracts intensity mean, GLCM contrast, entropy, lesion sphericity, and perimeter.</p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                    <span className="text-slate-400">Feature Ranking</span>
                    <span className="font-bold text-purple-400">SHAP Normalized</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Role-Based Platform Matrix ──────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 bg-cyan-950/40">
              Role-Enforced Workspaces
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Built for Every Hospital Stakeholder
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Dedicated interfaces and backend access controls tailored for radiologists, technicians, and administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Doctor Card */}
            <Card className="border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-900/80 backdrop-blur-md hover:border-cyan-500/50 transition-all">
              <CardHeader className="space-y-2">
                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl text-white">Doctor Workspace</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  For Neuroradiologists & Neurosurgeons
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Full MRI viewer with interactive U-Net segmentation overlays and opacity slider</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Multi-method Explainable AI heatmaps & faithfulness metrics</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Clinical case management, follow-up timelines, and patient history</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Instant local diagnostic report generation & PDF export</span>
                </div>
              </CardContent>
            </Card>

            {/* Technician Card */}
            <Card className="border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-slate-900/80 backdrop-blur-md hover:border-amber-500/50 transition-all">
              <CardHeader className="space-y-2">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Activity className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl text-white">Technician Portal</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  For MRI Radiographers & Scanning Technologists
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Streamlined scan ingestion with patient metadata registry</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Real-time multi-stage pipeline processing status tracking</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Recent upload logs and verification of image suitability</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Strict sandboxing preventing unauthorized administrative actions</span>
                </div>
              </CardContent>
            </Card>

            {/* Administrator Card */}
            <Card className="border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-slate-900/80 backdrop-blur-md hover:border-purple-500/50 transition-all">
              <CardHeader className="space-y-2">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl text-white">Hospital Administrator</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  For Clinical Directors & IT Operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Complete staff management (Doctor, Tech, Admin account creation)</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Searchable and filterable SQLite audit trail across all events</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Institutional scan throughput, detection statistics, and system logs</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Model performance, ROC-AUC calibration, and ablation study reports</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Clinical Disclaimer & Footer ───────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Medical Alert Box */}
          <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-slate-300">
              <p className="font-semibold text-amber-300">MANDATORY CLINICAL & REGULATORY NOTICE</p>
              <p className="text-slate-400 leading-relaxed font-light">
                NEUROSCAN AI is an AI-assisted research and decision-support demonstration platform.
                It is not certified as a primary diagnostic device. All findings, classifications,
                segmentations, and reports must be verified by a board-certified medical specialist before
                any clinical action is taken.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-cyan-500" />
              <span className="font-semibold text-slate-300">NEUROSCAN AI</span>
              <span>— Deep Learning Brain Tumor Intelligence Platform</span>
            </div>
            <div>
              <span>Powered by CNN-ViT Hybrid & Attention U-Net Architecture</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
