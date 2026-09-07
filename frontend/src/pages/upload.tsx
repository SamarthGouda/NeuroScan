import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Upload as UploadIcon,
  Brain,
  CheckCircle2,
  FileText,
  User,
  Building,
  ScanLine,
  Layers,
  Activity,
  Eye,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ImageIcon,
} from "lucide-react";

interface Stage {
  id: number;
  label: string;
  detail: string;
  icon: typeof ScanLine;
}

const STAGES: Stage[] = [
  { id: 1, label: "Ingesting & Validating MRI", detail: "Checking image integrity, resolution, and header metadata", icon: ScanLine },
  { id: 2, label: "Tensor Preprocessing & Normalization", detail: "Resizing to 224x224 and applying ImageNet normalization", icon: Layers },
  { id: 3, label: "CNN-ViT Dual-Branch Feature Extraction", detail: "Extracting ResNet-50 local textures & Swin Transformer global context", icon: Brain },
  { id: 4, label: "Bayesian Uncertainty Quantification", detail: "Executing 50 Monte Carlo Dropout passes to compute probability variance", icon: Activity },
  { id: 5, label: "Attention U-Net Tumor Segmentation", detail: "Generating skip-gated lesion mask overlay and area percentage", icon: Sparkles },
  { id: 6, label: "Explainable AI Heatmap Computation", detail: "Calculating Grad-CAM, Grad-CAM++, and Integrated Gradients attributions", icon: Eye },
  { id: 7, label: "Quantitative Radiomics & Risk Profiling", detail: "Extracting first-order intensity & texture biomarkers with SHAP ranking", icon: Activity },
  { id: 8, label: "Compiling Clinical Diagnostic Report", detail: "Persisting case record, findings, and radiological impression", icon: FileText },
];

export default function UploadPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("Male");
  const [hospitalName, setHospitalName] = useState("NeuroScan Medical Center");
  const [patientPhoneNumber, setPatientPhoneNumber] = useState("");
  const [patientAddress, setPatientAddress] = useState("");

  // Processing Animation State
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState(1);
  const [progressValue, setProgressValue] = useState(10);

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an MRI brain slice in JPG, PNG, or DICOM-derived format.",
        variant: "destructive",
      });
      return;
    }
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please select an MRI image file.");

      const formData = new FormData();
      formData.append("scan", file);
      if (patientId) formData.append("patientId", patientId);
      formData.append("patientName", patientName.trim() || "Anonymous Patient");
      if (patientAge) formData.append("patientAge", patientAge);
      if (patientGender) formData.append("patientGender", patientGender);
      if (hospitalName) formData.append("hospitalName", hospitalName);
      if (patientPhoneNumber) formData.append("patientPhoneNumber", patientPhoneNumber);
      if (patientAddress) formData.append("patientAddress", patientAddress);

      // Start stage animation
      setIsProcessing(true);
      setCurrentStage(1);
      setProgressValue(15);

      const interval = setInterval(() => {
        setCurrentStage((prev) => {
          if (prev < 7) {
            setProgressValue((prev + 1) * 12.5);
            return prev + 1;
          }
          return prev;
        });
      }, 900);

      try {
        const response = await fetch("/api/scans/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        clearInterval(interval);

        if (!response.ok) {
          const err = await response.json().catch(() => ({ detail: "Upload failed" }));
          throw new Error(err.detail || "Analysis failed.");
        }

        const data = await response.json();
        setCurrentStage(8);
        setProgressValue(100);

        // Small delay to let user see completion stage
        await new Promise((r) => setTimeout(r, 600));

        return data;
      } catch (e) {
        clearInterval(interval);
        throw e;
      }
    },
    onSuccess: (scan) => {
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });

      toast({
        title: "Analysis Complete",
        description: `Tumor Classification: ${scan.tumorType || "Processed successfully"}.`,
      });

      setIsProcessing(false);
      if (scan && scan.id) {
        setLocation(`/scan/${scan.id}`);
      }
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Analysis Error",
        description: error.message || "Failed to process MRI scan.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: "File Required",
        description: "Please select or drop a brain MRI scan image before submitting.",
        variant: "destructive",
      });
      return;
    }
    uploadMutation.mutate();
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-900 to-blue-950/30 border border-cyan-500/20 p-6">
        <div className="flex items-center gap-2">
          <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs">
            Deep Learning Analysis Pipeline
          </Badge>
          <span className="text-xs text-muted-foreground">Attention U-Net & XAI Enabled</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-2" data-testid="text-page-title">
          New Brain MRI Analysis
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl mt-1">
          Enter patient details, upload an axial MRI brain scan, and initiate the autonomous multi-stage diagnostic workflow.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Patient Information */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-4 border-b border-border/60">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-cyan-500" />
                Patient Demographics
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Clinical records will be linked to this patient ID
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="patientId" className="text-xs font-semibold text-foreground">
                  Patient ID / MRN
                </Label>
                <Input
                  id="patientId"
                  placeholder="e.g. PT-2026-0841 (Auto-generated if blank)"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="h-9 text-xs bg-background/60"
                  data-testid="input-patient-id"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="patientName" className="text-xs font-semibold text-foreground">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="patientName"
                  placeholder="e.g. Eleanor Vance"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="h-9 text-xs bg-background/60"
                  data-testid="input-patient-name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="patientAge" className="text-xs font-semibold text-foreground">
                    Age
                  </Label>
                  <Input
                    id="patientAge"
                    type="number"
                    placeholder="e.g. 54"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="h-9 text-xs bg-background/60"
                    data-testid="input-patient-age"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="patientGender" className="text-xs font-semibold text-foreground">
                    Gender
                  </Label>
                  <Select value={patientGender} onValueChange={setPatientGender}>
                    <SelectTrigger className="h-9 text-xs bg-background/60">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hospitalName" className="text-xs font-semibold text-foreground">
                  Medical Facility / Hospital
                </Label>
                <Input
                  id="hospitalName"
                  placeholder="e.g. NeuroScan Medical Center"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="h-9 text-xs bg-background/60"
                  data-testid="input-hospital-name"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="patientPhone" className="text-xs font-semibold text-foreground">
                  Contact Phone (Optional)
                </Label>
                <Input
                  id="patientPhone"
                  placeholder="e.g. +1 (555) 234-5678"
                  value={patientPhoneNumber}
                  onChange={(e) => setPatientPhoneNumber(e.target.value)}
                  className="h-9 text-xs bg-background/60"
                  data-testid="input-patient-phone"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Scan Upload & Submission */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-4 border-b border-border/60">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-cyan-500" />
                Brain MRI Acquisition Upload
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Drag and drop your axial MRI slice or select a file (JPG, PNG, DICOM-derived)
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[220px] ${
                  file
                    ? "border-cyan-500/60 bg-cyan-500/5"
                    : "border-border/80 hover:border-cyan-500/40 hover:bg-muted/30"
                }`}
                data-testid="dropzone-mri"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  className="hidden"
                  data-testid="input-file-mri"
                />

                {previewUrl ? (
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="relative h-36 w-36 rounded-xl overflow-hidden border border-cyan-500/40 shadow-lg shadow-cyan-500/10">
                      <img src={previewUrl} alt="MRI Scan Preview" className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{file?.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {file ? `${(file.size / 1024).toFixed(1)} KB` : ""} • Click to change image
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                      <UploadIcon className="h-7 w-7 animate-bounce" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Click or Drag & Drop Brain MRI Scan</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        High-resolution axial slices (T1, T2, FLAIR) up to 50MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quality & Preprocessing Notice */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                <span>
                  The image tensor will be preprocessed to 224x224 pixels and evaluated across the
                  trained hybrid CNN-ViT classifier with Monte Carlo Dropout uncertainty and Attention U-Net segmentation.
                </span>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={!file || uploadMutation.isPending}
                className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 rounded-xl transition-all"
                data-testid="button-start-analysis"
              >
                <Brain className="h-5 w-5 mr-2" />
                Run AI Pipeline & Generate Diagnostic Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* ─── Processing Animation Modal ──────────────────────────────── */}
      <Dialog open={isProcessing} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-lg border-border/80 bg-slate-950 text-slate-100 p-6 rounded-2xl shadow-2xl [&>button]:hidden">
          <DialogHeader className="space-y-1.5 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
              <DialogTitle className="text-lg font-bold text-white">
                Executing NeuroScan AI Pipeline
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Performing multi-stage neural computation and biomarker extraction
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-cyan-400">
                  Stage {currentStage} of {STAGES.length}
                </span>
                <span className="text-slate-400 font-mono">{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-2 bg-slate-800" />
            </div>

            {/* Stages Timeline */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {STAGES.map((s) => {
                const isPast = s.id < currentStage;
                const isCurrent = s.id === currentStage;
                const isFuture = s.id > currentStage;
                const IconComponent = s.icon;

                return (
                  <div
                    key={s.id}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all ${
                      isCurrent
                        ? "bg-cyan-950/50 border-cyan-500/50 shadow-sm"
                        : isPast
                        ? "bg-slate-900/40 border-slate-800/80 opacity-90"
                        : "border-transparent opacity-40"
                    }`}
                  >
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isPast
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isCurrent
                          ? "bg-cyan-500/20 text-cyan-400 animate-pulse"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isCurrent ? (
                        <div className="h-3 w-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <IconComponent className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold ${
                          isCurrent ? "text-cyan-300 font-bold" : isPast ? "text-slate-200" : "text-slate-500"
                        }`}
                      >
                        {s.label}
                      </p>
                      <p className="text-[11px] text-slate-400 leading-tight truncate">{s.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
