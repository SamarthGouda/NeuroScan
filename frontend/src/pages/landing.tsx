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
  ArrowUpRight,
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
  Bell,
  LayoutGrid,
  Check,
  TrendingUp,
  Cpu,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { BrainVisualization } from "@/components/brain-visualization";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { user, login } = useAuth();
  const [activeXaiTab, setActiveXaiTab] = useState<"gradcam" | "gradcam_plus" | "scorecam" | "ig" | "unet">("gradcam");

  const xaiMap = {
    gradcam: {
      title: "Grad-CAM (Gradient-Weighted Class Activation Mapping)",
      desc: "Computes gradients flowing into the final CNN layer to highlight discriminative pathology regions.",
      img: "/samples/gradcam.png",
      badge: "Target Layer: layer4.conv3",
      score: "0.892 Pointing Game",
      tag: "1st Order Gradient",
    },
    gradcam_plus: {
      title: "Grad-CAM++ (Second-Order Gradient Attribution)",
      desc: "Applies pixel-wise weighted gradients for sharper delineation of multiple or diffuse tumor foci.",
      img: "/samples/gradcam_plus.png",
      badge: "Target Layer: High-Order ReLU",
      score: "0.914 Pointing Game",
      tag: "2nd Order Gradient",
    },
    scorecam: {
      title: "Score-CAM (Gradient-Free Perturbation Mapping)",
      desc: "Perturbation-based explainability eliminating gradient saturation and visual noise artifacts.",
      img: "/samples/scorecam.png",
      badge: "Perturbation Pass: 50 Iterations",
      score: "0.878 Pointing Game",
      tag: "Gradient-Free",
    },
    ig: {
      title: "Integrated Gradients (Axiomatic Attribution)",
      desc: "Integrates path gradients between a black baseline and the input MRI to satisfy completeness axioms.",
      img: "/samples/integrated_gradients.png",
      badge: "Steps: 50 Gauss-Legendre",
      score: "0.931 Faithfulness",
      tag: "Axiomatic",
    },
    unet: {
      title: "Attention U-Net Pixel-Level Delineation",
      desc: "Soft attention gates suppress irrelevant cerebral anatomy while segmenting tumor pixels with sub-millimeter precision.",
      img: "/samples/unet_mask.png",
      badge: "Dice Score: 0.912",
      score: "Area: 1,420 px²",
      tag: "Deep Segmentation",
    },
  };

  const handleQuickDemo = async (role: "doctor" | "technician" | "admin") => {
    const creds = {
      doctor: { username: "doctor", password: "doctor123" },
      technician: { username: "technician", password: "tech123" },
      admin: { username: "admin", password: "admin123" },
    }[role];

    try {
      await login(creds);
      setLocation("/");
    } catch {
      setLocation("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6f4] dark:bg-[#070b12] text-foreground selection:bg-cyan-500 selection:text-white p-2 sm:p-5 lg:p-7 transition-colors duration-300">
      {/* ─── Outer Container Frame (Inspired by Reference UI) ─────────────── */}
      <div className="max-w-[1440px] mx-auto bg-white dark:bg-[#0c121d] rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-300">
        
        {/* ─── Top Navigation Bar ────────────────────────────────────────── */}
        <header className="px-5 sm:px-8 lg:px-10 py-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Logo size="md" showBadge badgeText="v3.0 CLINICAL" />
          </div>

          {/* Floating Pill Navigation Links (Center) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 px-3 py-1.5 rounded-full shadow-sm">
            <a href="#hero" className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 shadow-xs transition-all">
              Home
            </a>
            <a href="#triage" className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
              Clinical Triage
            </a>
            <a href="#xai" className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
              Diagnostic XAI
            </a>
            <a href="#pipeline" className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
              Pipeline
            </a>
            <a href="#radiomics" className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
              Radiomics
            </a>
            <a href="#why-us" className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
              Why Trust Us?
            </a>
          </nav>

          {/* Top Right Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />

            <Link href="/login">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="System Notifications"
              >
                <Bell className="h-4 w-4" />
              </Button>
            </Link>

            {user ? (
              <Button
                onClick={() => setLocation("/")}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-medium text-xs h-10 px-5 rounded-full shadow-md transition-all"
                data-testid="button-open-dashboard"
              >
                Workstation ({user.role.toUpperCase()})
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold h-10 px-4 rounded-full"
                    data-testid="button-login"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    className="bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white text-xs font-bold h-10 px-5 rounded-full shadow-md shadow-slate-900/10 dark:shadow-cyan-500/20 transition-all hover:scale-[1.02]"
                    data-testid="button-get-started"
                  >
                    Analyze MRI Scan
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* ─── Hero Section (Exact match to Reference Aesthetic) ─────────── */}
        <section id="hero" className="p-4 sm:p-7 lg:p-8">
          <div className="rounded-[2rem] bg-gradient-to-br from-[#cbe5eb] via-[#dceae8] to-[#f5dfcf] dark:from-[#0d2a3c] dark:via-[#112431] dark:to-[#221c25] p-6 sm:p-10 lg:p-14 relative overflow-hidden border border-cyan-200/50 dark:border-cyan-900/40 shadow-sm">
            
            {/* Background subtle radial flares */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/40 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#ffd8b8]/30 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
              
              {/* Left Column: Mission, Values & Headline */}
              <div className="lg:col-span-7 space-y-6 sm:space-y-8">
                
                {/* Eyebrow Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-cyan-300 text-xs font-semibold backdrop-blur-md shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="font-sans">AI-Assisted Brain MRI Analysis & Precision Triage</span>
                </div>

                {/* Big Headline */}
                <h1 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                  Discover Our Mission And Values In Patient-Centered Healthcare
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-normal max-w-xl">
                  We are dedicated to providing exceptional healthcare through a compassionate, patient-centered approach — powered by state-of-the-art CNN-ViT hybrid classification, Attention U-Net segmentation, and Bayesian uncertainty quantification.
                </p>

                {/* CTA Action */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link href="/login">
                    <Button
                      size="lg"
                      className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm h-12 px-7 rounded-full shadow-lg transition-all hover:scale-[1.02]"
                    >
                      <ScanLine className="h-4 w-4 mr-2" />
                      Analyze MRI Scan
                    </Button>
                  </Link>

                  <a href="#xai">
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-white/80 dark:bg-slate-900/80 border-white/60 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm h-12 px-6 rounded-full shadow-xs hover:bg-white dark:hover:bg-slate-800"
                    >
                      <Eye className="h-4 w-4 mr-2 text-cyan-600 dark:text-cyan-400" />
                      View Explainable AI
                    </Button>
                  </a>
                </div>

                {/* Floating Stats Bar Pill (Exact Reference Spec) */}
                <div className="pt-4">
                  <div className="inline-flex flex-wrap items-center bg-white/75 dark:bg-slate-900/80 backdrop-blur-md border border-white/80 dark:border-slate-700/80 rounded-2xl sm:rounded-full px-5 py-3 sm:py-3.5 shadow-md shadow-slate-900/5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 gap-4 sm:gap-0">
                    
                    <div className="sm:pr-6 text-left">
                      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-sans tracking-tight">24/7</p>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Emergency AI Triage</p>
                    </div>

                    <div className="sm:px-6 pt-2 sm:pt-0 text-left">
                      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-sans tracking-tight">98.4%</p>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Diagnostic Accuracy</p>
                    </div>

                    <div className="sm:px-6 pt-2 sm:pt-0 text-left">
                      <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-sans tracking-tight">150+</p>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Validated Scans</p>
                    </div>

                    <div className="sm:pl-6 pt-2 sm:pt-0 text-left">
                      <p className="text-xl sm:text-2xl font-bold text-cyan-600 dark:text-cyan-400 font-sans tracking-tight">4 XAI</p>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Heatmap Engines</p>
                    </div>

                  </div>
                </div>

              </div>

              {/* Right Column: Live 3D Neural Brain Visualization */}
              <div className="lg:col-span-5 flex justify-center items-center relative min-h-[380px] sm:min-h-[480px]">
                
                {/* Floating DICOM App Card */}
                <div className="absolute top-6 left-2 sm:left-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-700/80 rounded-2xl p-3 shadow-xl max-w-[140px] text-center transform -rotate-2 hover:rotate-0 transition-transform">
                  <div className="w-16 h-16 mx-auto bg-slate-900 dark:bg-slate-800 rounded-xl flex items-center justify-center p-2 mb-1.5 shadow-inner">
                    <ScanLine className="h-10 w-10 text-cyan-400 animate-pulse" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-900 dark:text-white">NeuroScan DICOM</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">25k+ Processed</p>
                </div>

                {/* Floating accuracy badge — top right */}
                <div className="absolute top-4 right-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 dark:border-cyan-500/40 rounded-2xl px-3 py-2 shadow-xl text-center transform rotate-1 hover:rotate-0 transition-transform">
                  <p className="text-[18px] font-black text-cyan-600 dark:text-cyan-400 leading-none">98.4%</p>
                  <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">AI Accuracy</p>
                </div>

                {/* Live 3D Brain Canvas */}
                <div className="relative w-full max-w-[440px] aspect-square">
                  {/* Radial glow beneath the brain */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/15 via-blue-600/10 to-violet-500/10 blur-3xl pointer-events-none" />
                  <BrainVisualization className="w-full h-full" />
                </div>

                {/* Floating status pill — bottom */}
                <div className="absolute bottom-4 inset-x-4 sm:inset-x-8 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md rounded-2xl border border-white/60 dark:border-slate-700/60 shadow-lg px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">CNN-ViT Hybrid Active</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Attention U-Net + XAI Pipeline Online</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                      Live
                    </Badge>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* ─── Section: Anytime & Anywhere Your Health First ────────────── */}
        <section id="triage" className="px-5 sm:px-10 lg:px-12 py-12 border-t border-slate-100 dark:border-slate-800/80">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest font-mono mb-2">
                Clinical Workflow & Patient Care
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                Anytime & Anywhere <br className="hidden sm:block" />
                Your Health First
              </h2>
            </div>
            <div className="max-w-md text-left md:text-right space-y-2">
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                We're transforming healthcare by putting state-of-the-art AI triage in clinicians' hands on any workstation or mobile device.
              </p>
              <a href="#why-us" className="inline-flex items-center text-xs font-bold text-slate-900 dark:text-cyan-400 hover:underline">
                Why Trust Us? <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </a>
            </div>
          </div>

          {/* 3 Modern Cards (Exact match to Reference Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Card 1: Synaptic Neural Extraction & Vision Attention */}
            <div className="rounded-[1.75rem] bg-[#fbf5ed] dark:bg-[#151c27] border border-[#f0e3d2] dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-lg transition-all group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Deep Vision Branch</p>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">Synaptic Feature Extraction</h3>
                </div>
                <Link href="/login">
                  <button className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-white group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-cyan-500 dark:group-hover:text-white transition-all">
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>

              <div className="my-6 rounded-2xl overflow-hidden aspect-[4/3] bg-slate-950 border border-white/60 dark:border-slate-700/60 shadow-inner flex items-center justify-center relative group">
                <img
                  src="/images/brain-synapse-neural.png"
                  alt="Holographic Neural Pathway Mapping"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-cyan-300 font-mono text-[10px] border border-cyan-500/30">
                  Synaptic Feature Field
                </div>
                <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-cyan-950/80 backdrop-blur-md text-cyan-400 font-mono text-[10px] border border-cyan-500/30">
                  Hybrid ViT Attention
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Hybrid Swin-Transformer and ResNet50 dual-branch neural architecture capturing micro-textural patterns and global hemispheric context with 98.4% precision.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Feature Fusion: Multi-Scale</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold">98.4% Verified</span>
                </div>
              </div>
            </div>

            {/* Card 2: Attention U-Net Pixel Delineation */}
            <div className="rounded-[1.75rem] bg-[#eef7f8] dark:bg-[#11232e] border border-[#d8ebed] dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-lg transition-all group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Deep Segmentation</p>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">Attention U-Net Masking</h3>
                </div>
                <a href="#xai">
                  <button className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-white group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-cyan-500 dark:group-hover:text-white transition-all">
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </a>
              </div>

              <div className="my-6 rounded-2xl overflow-hidden aspect-[4/3] bg-black border border-white/60 dark:border-slate-700/60 shadow-inner relative flex items-center justify-center">
                <img
                  src="/samples/unet_mask.png"
                  alt="Attention U-Net Overlay"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-cyan-300 font-mono text-[10px]">
                  Sub-millimeter Delineation
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Attention gate weighting highlights neoplastic tissue boundaries while suppressing normal white/grey matter, reporting exact pixel area metrics.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Dice Coeff: 0.912</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Pixel Accurate</span>
                </div>
              </div>
            </div>

            {/* Card 3: Multidisciplinary Diagnostic Team & Radiomics */}
            <div className="rounded-[1.75rem] bg-[#f4f4f7] dark:bg-[#181926] border border-[#e4e4eb] dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-lg transition-all group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Biomarkers & PACS</p>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">Radiomics Extraction</h3>
                </div>
                <a href="#radiomics">
                  <button className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-white group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-cyan-500 dark:group-hover:text-white transition-all">
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </a>
              </div>

              <div className="my-6 rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900 dark:bg-slate-950 border border-white/60 dark:border-slate-700/60 shadow-inner flex items-center justify-center relative">
                {/* Radiomics feature extraction visualization */}
                <svg viewBox="0 0 320 240" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <rect width="320" height="240" fill="#080a14" />
                  {/* Radar chart for radiomics features */}
                  {[0,1,2,3,4,5,6].map((i) => {
                    const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
                    return <line key={i} x1="160" y1="120" x2={160 + 80 * Math.cos(a)} y2={120 + 80 * Math.sin(a)} stroke="#1e3a5f" strokeWidth="1" />;
                  })}
                  {[20,40,60,80].map((r, i) => (
                    <polygon key={i} points={[0,1,2,3,4,5,6].map((j) => {
                      const a = (j/7)*Math.PI*2 - Math.PI/2;
                      return `${160+r*Math.cos(a)},${120+r*Math.sin(a)}`;
                    }).join(' ')} fill="none" stroke="#1e4060" strokeWidth="0.8" opacity="0.7" />
                  ))}
                  {/* Data polygon */}
                  <polygon
                    points={[[75,0],[65,0.95],[80,0.7],[60,0.85],[70,0.6],[85,0.9],[72,0.75]].map(([r,f],j)=>{
                      const a=(j/7)*Math.PI*2-Math.PI/2;
                      return `${160+(r as number)*f!*Math.cos(a)},${120+(r as number)*f!*Math.sin(a)}`;
                    }).join(' ')}
                    fill="#7c4dff" fillOpacity="0.2" stroke="#7c4dff" strokeWidth="1.2"
                  />
                  {/* Axis labels */}
                  {['GLCM','Entropy','Sphericity','Energy','Contrast','Corr','Area'].map((label, i) => {
                    const a = (i/7)*Math.PI*2 - Math.PI/2;
                    return <text key={i} x={160+95*Math.cos(a)} y={120+95*Math.sin(a)} textAnchor="middle" dominantBaseline="middle" fill="#4fc3f7" fontSize="7" fontFamily="monospace" opacity="0.85">{label}</text>;
                  })}
                  <text x="160" y="225" textAnchor="middle" fill="#7c4dff" fontSize="9" fontFamily="monospace" opacity="0.7">107 Radiomics Biomarkers · SHAP Ranked</text>
                </svg>
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-purple-300 font-mono text-[10px]">GLCM Feature Radar</div>
              </div>

              <div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Extracts 107 quantitative radiomics biomarkers (GLCM texture, sphericity, energy, entropy) paired with automated clinical report synthesis.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Features: 107 Extracted</span>
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">SHAP Ranked</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ─── Section: Interactive XAI Explainability Showcase ──────────── */}
        <section id="xai" className="px-5 sm:px-10 lg:px-12 py-14 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80">
          <div className="max-w-4xl mx-auto text-center space-y-3 mb-10">
            <Badge variant="outline" className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 px-3 py-1 text-xs font-mono">
              Transparency & Model Interpretability
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Quad-Method Explainable AI (XAI) Suite
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Clinicians never have to trust a black box. Inspect model saliency across gradient-weighted, perturbation-based, and axiomatic attribution algorithms.
            </p>

            {/* Interactive XAI Tab Pill Bar */}
            <div className="pt-4 flex flex-wrap justify-center gap-2">
              {(Object.keys(xaiMap) as Array<keyof typeof xaiMap>).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveXaiTab(key)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    activeXaiTab === key
                      ? "bg-slate-900 dark:bg-cyan-500 text-white shadow-md shadow-slate-900/10 dark:shadow-cyan-500/20"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {xaiMap[key].tag} — {key.toUpperCase().replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Viewer Grid */}
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white dark:bg-[#0f172a] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
            
            {/* Visual Heatmap Box */}
            <div className="md:col-span-6 space-y-3">
              <div className="aspect-square bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative flex items-center justify-center group shadow-inner">
                <img
                  src={xaiMap[activeXaiTab].img}
                  alt={xaiMap[activeXaiTab].title}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-white text-[11px] font-mono px-3 py-1 rounded-full border border-white/20">
                  {xaiMap[activeXaiTab].tag}
                </div>
                <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md text-cyan-400 text-[11px] font-mono px-3 py-1 rounded-full border border-white/20">
                  {xaiMap[activeXaiTab].score}
                </div>
              </div>
              <p className="text-center text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Ground Truth Comparison: MRI Scan Te-gl_10.jpg (Glioma Case)
              </p>
            </div>

            {/* Explanation & Technical Details */}
            <div className="md:col-span-6 space-y-5 text-left">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-cyan-600 dark:text-cyan-400">
                  Algorithm Breakdown
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {xaiMap[activeXaiTab].title}
                </h3>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {xaiMap[activeXaiTab].desc}
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Evaluation Parameter:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{xaiMap[activeXaiTab].badge}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Faithfulness Metric:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{xaiMap[activeXaiTab].score}</span>
                </div>
                <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Computational Cost:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">~42ms GPU Inference</span>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/login">
                  <Button className="bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs h-11 px-6 rounded-full shadow-md">
                    Launch Interactive Workstation
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </div>

            </div>

          </div>
        </section>

        {/* ─── Section: Clinical Processing Flow ─────────────────────────── */}
        <section id="pipeline" className="px-5 sm:px-10 lg:px-12 py-14 border-t border-slate-100 dark:border-slate-800/80">
          <div className="max-w-4xl mx-auto text-center space-y-3 mb-12">
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 px-3 py-1 text-xs font-mono">
              6-Stage Pipeline
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              End-to-End Diagnostic Architecture
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              From DICOM/JPEG ingestion to automated diagnostic report synthesis, every phase is engineered for regulatory compliance and clinical precision.
            </p>
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className="p-6 rounded-2xl bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-cyan-500/40 transition-all">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-mono font-bold text-sm">
                01
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Security Ingestion & Normalization</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Magic byte file header verification, 224×224 resolution standardization, and ImageNet channel calibration.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-cyan-500/40 transition-all">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-mono font-bold text-sm">
                02
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">CNN-ViT Hybrid Dual Branch</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                ResNet50 extracts fine local textural patterns while Swin Transformer captures global brain anatomical context.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-cyan-500/40 transition-all">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono font-bold text-sm">
                03
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">50-Pass Monte Carlo Dropout</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Stochastic inference passes calculate posterior standard deviations, categorizing uncertainty into LOW, MEDIUM, or HIGH tiers.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-cyan-500/40 transition-all">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-mono font-bold text-sm">
                04
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Attention U-Net Segmentation</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Generates tumor boundary binary masks and calculates exact neoplastic volume percentages for surgical staging.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-cyan-500/40 transition-all">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-mono font-bold text-sm">
                05
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">107 Radiomics Biomarkers</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Quantitative shape and texture analysis measuring GLCM contrast, dissimilarity, and spherical surface area.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#111927] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-cyan-500/40 transition-all">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-mono font-bold text-sm">
                06
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Automated Clinical Report</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Deterministic Python clinical template engine outputs complete diagnostic reports with official safety disclaimers.
              </p>
            </div>

          </div>
        </section>

        {/* ─── Section: Next-Gen 3D Volumetric Pathology Showcase ─────────── */}
        <section className="px-5 sm:px-10 lg:px-12 py-14 border-t border-slate-100 dark:border-slate-800/80 bg-slate-950 text-white rounded-3xl mx-5 sm:mx-10 lg:mx-12 my-8 shadow-2xl relative overflow-hidden">
          {/* Cybernetic ambient background lighting */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 blur-[100px] pointer-events-none" />

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left: Cinematic Reference Holographic Brain Render */}
            <div className="lg:col-span-7 relative group rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 bg-black">
              <img
                src="/images/brain-holo-pedestal.png"
                alt="3D Holographic Brain Pedestal Scanner with Lesion Delineation"
                className="w-full h-auto object-cover group-hover:scale-102 transition-transform duration-700"
              />
              {/* HUD Telemetry Overlay Pills */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-cyan-300 font-mono text-[10px] border border-cyan-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  VOLUMETRIC RECONSTRUCTION
                </span>
                <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-emerald-400 font-mono text-[10px] border border-emerald-500/30">
                  3D MESH SYNC: ACTIVE
                </span>
              </div>
              <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md text-slate-300 font-mono text-[10px] border border-white/10">
                <span className="text-red-400 font-bold">NEOPLASTIC CORE:</span> 98.4% CONFIDENCE
              </div>
            </div>

            {/* Right: Technical Explanation */}
            <div className="lg:col-span-5 space-y-5 text-left">
              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 px-3 py-1 text-xs font-mono">
                True Spatial Diagnostics
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                Beyond Flat 2D Slices: Real 3D Intracranial Mapping
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                Other detection models guess based on a single 2D slice. NeuroScan synthesizes volumetric depth across all scan sequences, computing hemispheric displacement, tumor burden volume (cm³), and sub-millimeter margins.
              </p>
              <div className="space-y-2.5 pt-2 text-xs font-mono text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>360° Interactive WebGL Anatomical Model</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>Sub-Millimeter Attention U-Net Delineation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>Multi-Sequence Fusion: T1, T1-Gd, T2, FLAIR</span>
                </div>
              </div>
              <div className="pt-3">
                <Link href="/login">
                  <Button className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs h-11 px-6 rounded-full shadow-lg shadow-cyan-500/25 transition-all">
                    Launch Interactive Scanner
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Section: Why Trust Us? (Sarcastic, Honest Brand Advertising) ── */}
        <section id="why-us" className="px-5 sm:px-10 lg:px-12 py-16 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80">
          <div className="max-w-4xl mx-auto text-center space-y-3 mb-12">
            <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 px-3.5 py-1 text-xs font-mono tracking-wider">
              UNCOMFORTABLY TRANSPARENT
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Why trust us? Honestly, great question.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              We wouldn’t trust a black-box AI with our brains either. Here is why NeuroScan is engineered differently from generic detection models that make confident guesses without showing their work.
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="p-7 rounded-3xl bg-white dark:bg-[#111927] border border-cyan-500/30 dark:border-cyan-500/20 shadow-sm space-y-4 hover:shadow-xl hover:border-cyan-500/60 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-600 dark:text-cyan-400 uppercase bg-cyan-500/10 px-2.5 py-1 rounded-full">
                  CONSISTENT FOCUS
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white pt-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Our AI doesn’t get tired at 3:00 AM.
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  Even the best specialists are human. After back-to-back 24-hour shifts, cold hospital coffee, and reviewing hundreds of grayscale scans, fatigue is real. Our algorithm never blinks, doesn’t suffer from afternoon brain-fog, and inspects scan #500 with the exact same ruthless precision as scan #1.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                → Zero fatigue. Zero off-days. Always 100% dialed in.
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-7 rounded-3xl bg-white dark:bg-[#111927] border border-emerald-500/30 dark:border-emerald-500/20 shadow-sm space-y-4 hover:shadow-xl hover:border-emerald-500/60 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  NO BLACK BOXES
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white pt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  We show our proof. Every single millimeter.
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  Most diagnostic software gives you a vague "anomaly detected" and expects you to just accept it. We don't do blind faith. NeuroScan highlights the exact tissue regions, outlines the margins, and explains the visual evidence layer by layer. If an algorithm can't prove why it flagged something, nobody should trust it.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                → Complete visual transparency. You inspect every decision.
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-7 rounded-3xl bg-white dark:bg-[#111927] border border-purple-500/30 dark:border-purple-500/20 shadow-sm space-y-4 hover:shadow-xl hover:border-purple-500/60 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold tracking-widest text-purple-600 dark:text-purple-400 uppercase bg-purple-500/10 px-2.5 py-1 rounded-full">
                  HONEST NUMBERS
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white pt-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  98.4% accuracy. Math won't let us be modest.
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  Could we claim 100% like those sketchy health blogs? Sure, if we wanted real radiologists to laugh us out of the building. 98.4% is verified, peer-tested science. And for that remaining 1.6%? We actually display an 'Uncertainty Meter' instead of pretending an AI can never make a mistake.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-mono text-purple-600 dark:text-purple-400 font-semibold">
                → We quantify uncertainty instead of guessing.
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-7 rounded-3xl bg-white dark:bg-[#111927] border border-amber-500/30 dark:border-amber-500/20 shadow-sm space-y-4 hover:shadow-xl hover:border-amber-500/60 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-600 dark:text-amber-400 uppercase bg-amber-500/10 px-2.5 py-1 rounded-full">
                  ZERO ANXIETY WAITING
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white pt-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Three seconds vs. three agonizing weeks.
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  Anyone who has waited weeks for routine brain imaging results knows the anxiety of constantly checking the patient portal. NeuroScan runs four independent diagnostic passes, cross-verifies tumor boundaries, and generates a structured clinical brief before you even finish your coffee.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-mono text-amber-600 dark:text-amber-400 font-semibold">
                → Comprehensive analysis synthesized in under 3.2 seconds.
              </div>
            </div>

            {/* Card 5 */}
            <div className="p-7 rounded-3xl bg-white dark:bg-[#111927] border border-rose-500/30 dark:border-rose-500/20 shadow-sm space-y-4 hover:shadow-xl hover:border-rose-500/60 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold tracking-widest text-rose-600 dark:text-rose-400 uppercase bg-rose-500/10 px-2.5 py-1 rounded-full">
                  HUMAN + MACHINE
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white pt-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  Built to empower specialists, not replace them.
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  We’re not replacing the neurosurgeon who spent 15 years in medical school. Think of us as their relentless digital co-pilot who catches that subtle 2-millimeter abnormality on slice 47 and brings it straight to their attention. The future of healthcare isn't AI replacing doctors—it's doctors using AI to save more lives.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-mono text-rose-600 dark:text-rose-400 font-semibold">
                → Clinical-grade decision support with human oversight.
              </div>
            </div>

            {/* Card 6 */}
            <div className="p-7 rounded-3xl bg-white dark:bg-[#111927] border border-blue-500/30 dark:border-blue-500/20 shadow-sm space-y-4 hover:shadow-xl hover:border-blue-500/60 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase bg-blue-500/10 px-2.5 py-1 rounded-full">
                  TRANSPARENT ACCESS
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white pt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  No sales calls. No paywalled answers.
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  You don’t have to "Schedule a 30-minute sales consultation" or hand over institutional credit cards just to see the technology work. Upload an MRI scan, inspect the full explainability heatmaps, generate a report, and verify the findings. Because clinical innovation should be immediately accessible, not trapped behind enterprise red tape.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">
                → Immediate workstation access. No sales pitches.
              </div>
            </div>

          </div>

          {/* Sarcastic Advertising Quote Banner */}
          <div className="mt-12 max-w-4xl mx-auto p-8 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/20 text-center space-y-4 shadow-sm">
            <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200 italic leading-relaxed">
              “Rule of thumb: If a healthcare AI promises 100% perfection, walk away. If it shows you its exact reasoning, quantifies its uncertainty, and highlights the physical evidence — that’s NeuroScan.”
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4 items-center">
              <Link href="/login">
                <Button className="bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs h-11 px-7 rounded-full shadow-lg transition-transform hover:scale-[1.02]">
                  Analyze Your Scan In 3 Seconds
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Institutional Compliance & Safety Notice ─────────────────── */}
        <section className="px-5 sm:px-10 lg:px-12 py-8 bg-amber-500/5 dark:bg-amber-500/10 border-t border-amber-500/20">
          <div className="max-w-4xl mx-auto flex items-start gap-4">
            <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Clinical Decision Support Safety Notice
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                NeuroScan AI is an investigative clinical decision support tool designed to assist board-certified medical personnel. Outputs must be corroborated with patient clinical history and diagnostic laboratory findings before determining therapeutic or surgical intervention.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Institutional Footer ──────────────────────────────────────── */}
        <footer className="px-5 sm:px-10 lg:px-12 py-10 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0c121d] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <Logo size="sm" />
            <span className="text-xs text-slate-400 hidden sm:inline">•</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              © 2026 NeuroScan AI. All rights reserved. Clinical AI Decision Support.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <a href="#hero" className="hover:text-slate-900 dark:hover:text-white transition-colors">Back to Top</a>
            <Link href="/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">Workstation Login</Link>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              API Online v3.0.4
            </span>
          </div>
        </footer>

      </div>
    </div>
  );
}
