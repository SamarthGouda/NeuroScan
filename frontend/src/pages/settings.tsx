import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  ShieldCheck,
  Brain,
  Database,
  Cpu,
  Lock,
  Layers,
  Sparkles,
  Server,
  HardDrive,
  CheckCircle2,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/20 p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-2">
          <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[11px] font-mono">
            System & Station Preferences
          </Badge>
          <span className="text-xs text-muted-foreground font-mono bg-background/50 px-2 py-0.5 rounded border border-border/60">
            Workstation Mode
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-2">
          Workstation Settings & Runtime Specs
        </h1>
        <p className="text-xs text-muted-foreground max-w-2xl mt-1">
          Review your clinical profile identity, verify active PyTorch deep learning checkpoints,
          and inspect database and local storage configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Profile Card */}
        <Card className="border-border/80 bg-card/70 backdrop-blur-sm shadow-md overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/70 bg-background/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-cyan-400" />
                Authenticated Practitioner Profile
              </CardTitle>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-950/20">
                ACTIVE SESSION
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Institutional identity and access credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold flex items-center justify-center text-sm shadow-sm">
                {user?.avatar || (user?.fullName ? user.fullName.slice(0, 2).toUpperCase() : "MD")}
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-foreground text-sm">{user?.fullName || "Dr. Sarah Chen"}</p>
                <p className="text-muted-foreground text-xs">{user?.email || "doctor@neuroscan.ai"}</p>
                <div className="flex items-center gap-1.5 pt-1">
                  <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30 font-mono">
                    ROLE: {user?.role?.toUpperCase() || "DOCTOR"}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">@{user?.username}</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-1">
              <span className="text-muted-foreground font-semibold text-[11px] block">Title & Clinical Specialty:</span>
              <p className="font-medium text-foreground text-xs">{user?.title || "Lead Neuroradiologist"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Model Architecture & Weights Card */}
        <Card className="border-border/80 bg-card/70 backdrop-blur-sm shadow-md overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/70 bg-background/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Brain className="h-4 w-4 text-cyan-400" />
                Active Deep Learning Checkpoints
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 border-cyan-500/30">
                PyTorch 2.12
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Verified local model weights and inference engines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4 text-xs text-muted-foreground font-mono">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-[11px]">Classifier Checkpoint:</span>
              <Badge variant="outline" className="text-cyan-400 border-cyan-500/30 text-[10px]">concat_no_attn_best.pth</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-[11px]">Segmentation Checkpoint:</span>
              <Badge variant="outline" className="text-purple-400 border-purple-500/30 text-[10px]">attention_unet_best.pth</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-[11px]">MC Dropout Passes:</span>
              <span className="text-foreground font-semibold text-[11px]">50 Stochastic Passes</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60">
              <span className="text-[11px]">XAI Explainability:</span>
              <span className="text-cyan-400 text-[11px]">Grad-CAM, ++, Int. Gradients</span>
            </div>
          </CardContent>
        </Card>

        {/* Database & Security Card */}
        <Card className="border-border/80 bg-card/70 backdrop-blur-sm shadow-md md:col-span-2 overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/70 bg-background/40">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-400" />
              Database Engine & Storage Security Infrastructure
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Air-gapped on-premise SQLite database and compliance isolation
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Database Engine
              </span>
              <p className="text-muted-foreground font-mono text-[11px]">SQLite3 (neurovision.db)</p>
              <p className="text-[10px] text-muted-foreground/70">Local zero-cloud storage</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <Lock className="h-4 w-4 text-cyan-400" /> Security Standard
              </span>
              <p className="text-muted-foreground font-mono text-[11px]">PBKDF2-SHA256 • HMAC</p>
              <p className="text-[10px] text-muted-foreground/70">Encrypted token authentication</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <Cpu className="h-4 w-4 text-purple-400" /> ML Framework
              </span>
              <p className="text-muted-foreground font-mono text-[11px]">PyTorch 2.12 + timm Swin</p>
              <p className="text-[10px] text-muted-foreground/70">CPU/CUDA Tensor acceleration</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
