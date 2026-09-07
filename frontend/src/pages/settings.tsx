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
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 border border-border/80 p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs">
            System & Account Preferences
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-2">
          Workstation Settings
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl mt-1">
          Review your clinical profile, model checkpoint information, and storage configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Profile Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-500" />
              User Profile
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Institutional identity and credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold flex items-center justify-center text-sm">
                {user?.avatar || "DR"}
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{user?.fullName || "Dr. Sarah Chen"}</p>
                <p className="text-muted-foreground">{user?.email || "doctor@neuroscan.ai"}</p>
                <Badge variant="outline" className="mt-1 text-[10px] text-cyan-400 border-cyan-500/30">
                  {user?.role?.toUpperCase() || "DOCTOR"}
                </Badge>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
              <span className="text-muted-foreground font-semibold">Title:</span>
              <p className="font-medium text-foreground">{user?.title || "Lead Neuroradiologist"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Model Architecture & Weights Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Brain className="h-4 w-4 text-cyan-500" />
              Trained Model Checkpoints
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Verified local deep learning checkpoints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-xs text-muted-foreground font-mono">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60">
              <span>Classifier Checkpoint:</span>
              <Badge variant="outline" className="text-cyan-400 border-cyan-500/30">concat_no_attn_best.pth</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60">
              <span>Segmentation Checkpoint:</span>
              <Badge variant="outline" className="text-purple-400 border-purple-500/30">attention_unet_best.pth</Badge>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60">
              <span>MC Dropout Uncertainty:</span>
              <span className="text-foreground">50 Stochastic Forward Passes</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/60">
              <span>XAI Engines:</span>
              <span className="text-foreground">Grad-CAM, Grad-CAM++, Int. Gradients</span>
            </div>
          </CardContent>
        </Card>

        {/* Database & Security Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm md:col-span-2">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-500" />
              Database Engine & Regulatory Standards
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Local isolated storage & security architecture
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Database Engine
              </span>
              <p className="text-muted-foreground font-mono">SQLite (neurovision.db)</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-cyan-500" /> Security Standards
              </span>
              <p className="text-muted-foreground font-mono">PBKDF2-SHA256 • HMAC Tokens</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
              <span className="font-bold text-foreground flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-purple-500" /> ML Engine
              </span>
              <p className="text-muted-foreground font-mono">PyTorch 2.12 + timm Swin</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
