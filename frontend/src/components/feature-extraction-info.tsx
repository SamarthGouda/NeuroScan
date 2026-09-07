import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Scan, Activity, Layers } from "lucide-react";

interface FeatureExtractionInfoProps {
  texture?: number;
  shape?: number;
  intensity?: number;
}

export function FeatureExtractionInfo({ texture = 0, shape = 0, intensity = 0 }: FeatureExtractionInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Feature Extraction Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Scan className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Texture Analysis</span>
            </div>
            <span className="text-sm font-mono" data-testid="text-texture-score">
              {texture}%
            </span>
          </div>
          <Progress value={texture} className="h-2" data-testid="progress-texture" />
          <p className="text-xs text-muted-foreground mt-1">
            Tissue characterization based on texture patterns
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Shape & Size Measurements</span>
            </div>
            <span className="text-sm font-mono" data-testid="text-shape-score">
              {shape}%
            </span>
          </div>
          <Progress value={shape} className="h-2" data-testid="progress-shape" />
          <p className="text-xs text-muted-foreground mt-1">
            Geometric analysis of detected abnormalities
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Intensity Variation Mapping</span>
            </div>
            <span className="text-sm font-mono" data-testid="text-intensity-score">
              {intensity}%
            </span>
          </div>
          <Progress value={intensity} className="h-2" data-testid="progress-intensity" />
          <p className="text-xs text-muted-foreground mt-1">
            Pixel intensity distribution analysis
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
