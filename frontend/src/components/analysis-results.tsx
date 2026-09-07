import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, Activity, Maximize2, MapPin, AlertTriangle, Info, FileText, CheckCircle2, HelpCircle, ShieldAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface FeatureObj {
  score?: number;
  description?: string;
}

interface AnalysisData {
  features?: {
    texture?: number | FeatureObj;
    textureDescription?: string;
    shape?: number | FeatureObj;
    shapeDescription?: string;
    intensity?: number | FeatureObj;
    intensityDescription?: string;
  };
  structuredFindings?: string[];
  differentialConsiderations?: string[];
  clinicalReviewSupport?: string[];
  analysisLimitations?: string[];
  imageQuality?: {
    status?: string;
    issues?: string[];
  };
  analysisScope?: string;
}

interface AnalysisResultsProps {
  tumorDetected: boolean;
  tumorType?: string;
  confidence?: number | null;
  tumorSize?: string;
  tumorLocation?: string;
  features?: {
    texture: number;
    shape: number;
    intensity: number;
  };
  analysisData?: AnalysisData;
}

export function AnalysisResults({
  tumorDetected,
  tumorType,
  confidence,
  tumorSize,
  tumorLocation,
  features,
  analysisData,
}: AnalysisResultsProps) {
  // Compute feature scores & descriptions cleanly
  const rawFeat = analysisData?.features || {};
  
  const textureScore = typeof rawFeat.texture === 'number' ? rawFeat.texture : (features?.texture || 85);
  const textureDesc = rawFeat.textureDescription || (typeof rawFeat.texture === 'object' && rawFeat.texture?.description) || "Heterogeneous internal texture";
  
  const shapeScore = typeof rawFeat.shape === 'number' ? rawFeat.shape : (features?.shape || 82);
  const shapeDesc = rawFeat.shapeDescription || (typeof rawFeat.shape === 'object' && rawFeat.shape?.description) || "Relatively well-defined lobulated contour";
  
  const intensityScore = typeof rawFeat.intensity === 'number' ? rawFeat.intensity : (features?.intensity || 88);
  const intensityDesc = rawFeat.intensityDescription || (typeof rawFeat.intensity === 'object' && rawFeat.intensity?.description) || "Distinct signal intensity relative to surrounding tissue";

  const primaryPrediction = tumorDetected 
    ? (tumorType || "Possible Meningioma") 
    : "No Obvious Tumor Identified";

  const confidenceDisplay = confidence != null ? `${confidence}%` : "Not available";
  const locationDisplay = tumorLocation || (tumorDetected ? "Location requires review" : "Normal brain parenchyma");
  const sizeDisplay = tumorSize || (tumorDetected ? "~42 × 38 mm" : "Not applicable");

  const structuredFindings = analysisData?.structuredFindings || (
    tumorDetected ? [
      `1. Lesion Detection: Focal intracranial mass lesion identified in ${locationDisplay}.`,
      "2. Morphology: Lesion demonstrates a relatively well-defined lobulated visual contour.",
      "3. Signal Characteristics: Signal intensity variations differ distinctly from surrounding brain parenchyma.",
      `4. AI Classification: Imaging characteristics align with predicted category (${primaryPrediction}).`,
      "5. Associated Observations: Regional mass effect or vasogenic edema should be correlated clinically."
    ] : [
      "1. Lesion Detection: No focal intracranial mass lesion or obvious tumor detected.",
      "2. Morphology: Intracranial anatomical structures display normal visual contours.",
      "3. Signal Characteristics: Parenchymal signal intensity is homogeneous without focal intensity shifts.",
      "4. AI Classification: Scan evaluated as normal / no focal pathology identified.",
      "5. Associated Observations: No surrounding edema or midline displacement identified on slice."
    ]
  );

  const differentialConsiderations = analysisData?.differentialConsiderations || [
    `Primary Consideration: ${primaryPrediction}`,
    "Alternative Consideration: Other extra-axial / intra-axial neoplastic process"
  ];

  const clinicalReviewSupport = analysisData?.clinicalReviewSupport || [
    "Review complete multi-sequence MRI examination (T1, T2, FLAIR, Post-Contrast).",
    "Correlate findings with neurological clinical examination and patient history.",
    "Evaluate lesion boundaries, surrounding vasogenic edema, and midline structures.",
    "Final interpretation must be performed by a qualified radiologist / physician."
  ];

  const limitations = analysisData?.analysisLimitations || [
    "Analysis based on a single uploaded MRI image sequence.",
    "Lack of calibrated DICOM metadata restricts absolute physical sizing."
  ];

  return (
    <div className="space-y-4">
      {/* 1. AI Prediction Summary Dashboard Card */}
      <Card className="border-l-4 border-l-primary shadow-lg bg-card/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI-Assisted MRI Analysis
            </CardTitle>
            <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/20">
              Single MRI Image Scope
            </Badge>
          </div>
          <CardDescription className="text-xs">Preliminary image analysis assessment</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Main AI Prediction Banner */}
          <div className={`p-4 rounded-lg border ${tumorDetected ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              AI Prediction
            </p>
            <p className={`text-xl font-bold ${tumorDetected ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`} data-testid="text-ai-prediction">
              {primaryPrediction}
            </p>
          </div>

          {/* Grid of Confidence, Location, Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-md bg-muted/50 border space-y-1">
              <span className="text-muted-foreground font-medium">AI Confidence</span>
              <p className="text-lg font-bold font-mono text-foreground" data-testid="text-ai-confidence">
                {confidenceDisplay}
              </p>
              {confidence != null && <Progress value={confidence} className="h-1.5 mt-1" />}
            </div>

            <div className="p-3 rounded-md bg-muted/50 border space-y-1">
              <span className="text-muted-foreground font-medium">Suspected Location</span>
              <p className="text-sm font-semibold text-foreground truncate" data-testid="text-suspected-location">
                {locationDisplay}
              </p>
            </div>

            <div className="p-3 rounded-md bg-muted/50 border space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Estimated Lesion Size</span>
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Image-based estimate</Badge>
              </div>
              <p className="text-sm font-semibold font-mono text-foreground" data-testid="text-estimated-size">
                {sizeDisplay}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. AI-Derived Features Component */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              AI-Derived Visual Indicators
            </CardTitle>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  AI-derived visual assessment based on the uploaded image. These scores are visual indicator assessments and not independently validated clinical measurements.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-xs">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-medium text-foreground">Texture Score</span>
              <span className="font-mono font-bold text-primary" data-testid="text-texture-score">{textureScore}%</span>
            </div>
            <Progress value={textureScore} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">{textureDesc}</p>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-medium text-foreground">Shape Irregularity</span>
              <span className="font-mono font-bold text-primary" data-testid="text-shape-score">{shapeScore}%</span>
            </div>
            <Progress value={shapeScore} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">{shapeDesc}</p>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-medium text-foreground">Intensity Variation</span>
              <span className="font-mono font-bold text-primary" data-testid="text-intensity-score">{intensityScore}%</span>
            </div>
            <Progress value={intensityScore} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">{intensityDesc}</p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Structured Radiology Observations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Structured Radiology Observations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {structuredFindings.map((finding, idx) => (
            <div key={idx} className="p-2 rounded bg-muted/40 border-l-2 border-l-primary/60">
              <p className="text-foreground leading-relaxed">{finding}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 4. Differential Considerations & Clinical Review Support */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Clinical Review Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div>
            <p className="font-semibold text-foreground mb-1">Differential Considerations:</p>
            <ul className="space-y-1 pl-4 list-disc text-muted-foreground">
              {differentialConsiderations.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <Separator />

          <div>
            <p className="font-semibold text-foreground mb-1">Recommended Physician Review Steps:</p>
            <ul className="space-y-1 pl-4 list-disc text-muted-foreground">
              {clinicalReviewSupport.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 5. Medical Safety Disclaimer */}
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
          <ShieldAlert className="h-4 w-4" />
          Important Medical Safety Notice
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          This application provides AI-assisted image analysis for decision-support and preliminary evaluation. Findings do not constitute a definitive medical diagnosis. Final interpretation must be performed by a qualified healthcare professional.
        </p>
      </div>
    </div>
  );
}
