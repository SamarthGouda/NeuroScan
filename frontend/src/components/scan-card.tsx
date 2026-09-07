import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Calendar, User, Building2, Phone, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ScanCardProps {
  id: string;
  patientId: string;
  patientName: string;
  patientAddress?: string;
  patientPhoneNumber?: string;
  hospitalName?: string;
  uploadDate: Date;
  status: "pending" | "analyzing" | "completed" | "error";
  imageUrl?: string;
  tumorDetected?: boolean;
  tumorType?: string;
  tumorLocation?: string;
  confidence?: number;
  onView: (id: string) => void;
  onDownload: (id: string) => void;
}

export function ScanCard({
  id,
  patientId,
  patientName,
  patientAddress,
  patientPhoneNumber,
  hospitalName,
  uploadDate,
  status,
  imageUrl,
  tumorDetected,
  tumorType,
  tumorLocation,
  confidence,
  onView,
  onDownload,
}: ScanCardProps) {
  // Convert uploadDate to Date object if it's a string and validate
  let dateObj: Date;
  try {
    if (typeof uploadDate === 'string') {
      dateObj = new Date(uploadDate);
    } else if (uploadDate instanceof Date) {
      dateObj = uploadDate;
    } else {
      dateObj = new Date();
    }
    // Validate the date
    if (isNaN(dateObj.getTime())) {
      dateObj = new Date();
    }
  } catch {
    dateObj = new Date();
  }
  
  const getStatusBadge = () => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "analyzing":
        return <Badge className="bg-chart-3 text-white">Analyzing</Badge>;
      case "completed":
        return <Badge className="bg-chart-2 text-white">Completed</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  const getTumorBadge = () => {
    if (!tumorType) return null;
    const isMalignant = tumorType.toLowerCase().includes("malignant");
    return (
      <Badge variant={isMalignant ? "destructive" : "secondary"}>
        {tumorType}
      </Badge>
    );
  };

  return (
    <Card className="hover-elevate" data-testid={`card-scan-${id}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium" data-testid={`text-patient-name-${id}`}>
              {patientName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-mono" data-testid={`text-patient-id-${id}`}>
              {patientId}
            </span>
          </div>
          {hospitalName && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground" data-testid={`text-hospital-${id}`}>
                {hospitalName}
              </span>
            </div>
          )}
        </div>
        {getStatusBadge()}
      </CardHeader>
      <CardContent className="space-y-4">
        {imageUrl && status === "completed" && (
          <div className="relative rounded-md overflow-hidden border bg-muted">
            <img 
              src={imageUrl} 
              alt="MRI Scan Preview" 
              className="w-full h-32 object-cover"
              data-testid={`img-scan-preview-${id}`}
            />
            {tumorDetected && (
              <div className="absolute top-2 right-2">
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Tumor Detected
                </Badge>
              </div>
            )}
            {!tumorDetected && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-green-500 text-white">
                  No Tumor
                </Badge>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span data-testid={`text-upload-date-${id}`}>
              {formatDistanceToNow(dateObj, { addSuffix: true })}
            </span>
          </div>
          {patientPhoneNumber && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span data-testid={`text-phone-${id}`}>
                {patientPhoneNumber}
              </span>
            </div>
          )}
        </div>

        {status === "completed" && tumorType && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {getTumorBadge()}
              {confidence !== undefined && (
                <span className="text-sm text-muted-foreground font-mono" data-testid={`text-confidence-${id}`}>
                  {confidence}% confidence
                </span>
              )}
            </div>
            {tumorLocation && (
              <p className="text-sm text-muted-foreground" data-testid={`text-location-${id}`}>
                Location: {tumorLocation}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => onView(id)}
            data-testid={`button-view-scan-${id}`}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload(id)}
            data-testid={`button-download-report-${id}`}
          >
            <Download className="h-4 w-4 mr-2" />
            Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
