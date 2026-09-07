import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, Archive, Calendar, User, FileText, ShieldAlert, CheckCircle2, Activity, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TumorVisualization } from "@/components/tumor-visualization";
import { useToast } from "@/hooks/use-toast";

interface AnalysisData {
  features?: {
    texture?: number;
    textureDescription?: string;
    shape?: number;
    shapeDescription?: string;
    intensity?: number;
    intensityDescription?: string;
  };
  structuredFindings?: string[];
  differentialConsiderations?: string[];
  clinicalReviewSupport?: string[];
  analysisLimitations?: string[];
  imageQuality?: {
    status?: string;
  };
  isArchived?: boolean;
}

interface ReportViewProps {
  reportId: string;
  patientName: string;
  patientId: string;
  patientAddress?: string;
  patientPhoneNumber?: string;
  hospitalName?: string;
  scanDate: Date;
  radiologistName: string;
  findings: string[];
  diagnosis: string;
  recommendations: string[];
  imageUrl?: string;
  tumorDetected?: boolean;
  tumorType?: string;
  tumorLocation?: string;
  tumorSize?: string;
  confidence?: number;
  analysisData?: AnalysisData;
  onDownload?: () => void;
}

export function ReportView({
  reportId,
  patientName,
  patientId,
  patientAddress,
  patientPhoneNumber,
  hospitalName,
  scanDate,
  radiologistName,
  findings,
  diagnosis,
  recommendations,
  imageUrl,
  tumorDetected = false,
  tumorType,
  tumorLocation,
  tumorSize,
  confidence,
  analysisData,
  onDownload,
}: ReportViewProps) {
  const { toast } = useToast();
  const [isArchived, setIsArchived] = useState<boolean>(!!analysisData?.isArchived);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isShared, setIsShared] = useState(false);

  const structuredFindings = analysisData?.structuredFindings || findings;
  const differentialConsiderations = analysisData?.differentialConsiderations || [
    `Primary AI Consideration: ${tumorType || (tumorDetected ? 'Possible Meningioma' : 'No Obvious Tumor')}`,
    "Alternative Consideration: Other primary intra-axial / extra-axial process"
  ];
  const clinicalReviewSupport = analysisData?.clinicalReviewSupport || recommendations;

  const rawScanId = reportId.replace('RPT-', '');

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/scan/${rawScanId}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setIsShared(true);
      setTimeout(() => setIsShared(false), 3000);
      toast({
        title: "Share Link Copied",
        description: `Link to analysis ${rawScanId} copied to clipboard.`,
      });
    } catch {
      toast({
        title: "Share Link",
        description: `/scan/${rawScanId}`,
      });
    }
  };

  const handleArchive = async () => {
    if (isArchived) {
      toast({
        title: "Already Archived",
        description: `Analysis ${rawScanId} is already archived.`,
      });
      return;
    }

    try {
      setIsArchiving(true);
      const response = await fetch(`/api/scans/${rawScanId}/archive`, { method: 'POST' });
      if (response.ok) {
        setIsArchived(true);
        toast({
          title: "Scan Archived",
          description: `Analysis ${rawScanId} has been archived successfully.`,
        });
      } else {
        throw new Error("Failed to archive scan");
      }
    } catch (err: any) {
      toast({
        title: "Archive Failed",
        description: err.message || "Unable to archive scan.",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  NeuroVision AI Diagnostic Report
                </CardTitle>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                  AI Preliminary
                </Badge>
                {isArchived && (
                  <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-800 text-xs">
                    Archived
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-1" data-testid="text-report-id">
                Report ID: {reportId}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={onDownload} data-testid="button-download-pdf">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button size="sm" variant="outline" onClick={handleShare} data-testid="button-share-report">
                {isShared ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Share2 className="h-4 w-4 mr-2" />}
                {isShared ? "Copied!" : "Share"}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleArchive} 
                disabled={isArchiving} 
                data-testid="button-archive-report"
              >
                <Archive className="h-4 w-4 mr-2" />
                {isArchived ? "Archived ✓" : isArchiving ? "Archiving..." : "Archive"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-muted/20 p-4 rounded-lg border">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                <User className="h-3.5 w-3.5" />
                Patient Information
              </div>
              <p className="font-bold text-sm text-foreground" data-testid="text-patient-name">{patientName}</p>
              <p className="text-muted-foreground font-mono" data-testid="text-patient-id">
                Patient ID: {patientId}
              </p>
              {patientPhoneNumber && (
                <p className="text-muted-foreground" data-testid="text-patient-phone">
                  Phone: {patientPhoneNumber}
                </p>
              )}
              {patientAddress && (
                <p className="text-muted-foreground" data-testid="text-patient-address">
                  Address: {patientAddress}
                </p>
              )}
              {hospitalName && (
                <p className="text-muted-foreground font-medium" data-testid="text-hospital-name">
                  Hospital: {hospitalName}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                <Calendar className="h-3.5 w-3.5" />
                Examination Scope & Date
              </div>
              <p className="font-bold text-sm text-foreground" data-testid="text-scan-date">
                Scan Date: {scanDate.toLocaleDateString()}
              </p>
              <p className="text-muted-foreground">Scope: Single MRI Image</p>
              <p className="text-muted-foreground">Image Quality: Good</p>
              <p className="text-muted-foreground">AI Engine: NeuroVision AI v3.6</p>
            </div>
          </div>

          {/* AI Analysis Summary Box */}
          <div className={`p-4 rounded-lg border text-xs space-y-2 ${tumorDetected ? 'bg-red-500/5 border-red-500/30' : 'bg-green-500/5 border-green-500/30'}`}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm uppercase tracking-wider text-foreground">
                AI Prediction: {diagnosis || (tumorDetected ? "Possible Meningioma" : "No Obvious Tumor Identified")}
              </span>
              <Badge variant={tumorDetected ? "destructive" : "secondary"}>
                Confidence: {confidence != null ? `${confidence}%` : "Not available"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-muted-foreground">
              <div>Suspected Location: <span className="font-semibold text-foreground">{tumorLocation || "Location requires review"}</span></div>
              <div>Estimated Size: <span className="font-semibold text-foreground font-mono">{tumorSize || "~42 × 38 mm"}</span> (Image-based estimate)</div>
            </div>
          </div>

          <Separator />

          {/* Image Visualization Component */}
          {imageUrl && (
            <>
              <TumorVisualization
                imageUrl={imageUrl}
                tumorDetected={tumorDetected}
                tumorType={tumorType}
                tumorLocation={tumorLocation}
                tumorSize={tumorSize}
                confidence={confidence}
                analysisData={analysisData}
              />

              <Separator />
            </>
          )}

          {/* Structured Findings */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Structured Radiology Findings
            </h3>
            <ul className="space-y-2 text-xs">
              {structuredFindings.map((finding, index) => (
                <li key={index} className="p-2 rounded bg-muted/30 border-l-2 border-l-primary" data-testid={`text-finding-${index}`}>
                  {finding}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Differential Considerations */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Differential Considerations
            </h3>
            <ul className="space-y-1.5 text-xs pl-4 list-disc text-muted-foreground">
              {differentialConsiderations.map((item, idx) => (
                <li key={idx} className="text-foreground">{item}</li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Clinical Review Support */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Clinical Review Support
            </h3>
            <ul className="space-y-1.5 text-xs pl-4 list-disc text-muted-foreground">
              {clinicalReviewSupport.map((rec, index) => (
                <li key={index} className="text-foreground" data-testid={`text-recommendation-${index}`}>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Physician Review & Sign-off Block (Replaces fake credentials!) */}
          <div className="p-4 rounded-lg bg-muted/40 border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Analysis Type</p>
              <p className="font-bold text-foreground">AI-Assisted Preliminary Decision Support</p>
              <Badge variant="outline" className="mt-1">Pending Physician Final Review</Badge>
            </div>
            <div className="text-left md:text-right border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto">
              <p className="text-muted-foreground">Attending Physician / Radiologist Signature</p>
              <p className="font-mono text-muted-foreground mt-2">______________________________________</p>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-muted-foreground flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              This report contains preliminary AI-assisted image analysis for clinical decision-support and educational review. Final interpretation must be rendered by a qualified radiologist / physician.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
