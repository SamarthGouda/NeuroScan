import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface AnalysisData {
  features?: any;
  coordinates?: {
    centerX: number;
    centerY: number;
    radius: number;
  };
  regionOfInterest?: any;
  [key: string]: any;
}

interface TumorVisualizationProps {
  imageUrl: string;
  tumorDetected: boolean;
  tumorType?: string;
  tumorLocation?: string;
  tumorSize?: string;
  confidence?: number;
  analysisData?: AnalysisData;
}

export function TumorVisualization({
  imageUrl,
  tumorDetected,
  tumorType,
  tumorLocation,
  tumorSize,
  confidence,
  analysisData,
}: TumorVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [markerPosition, setMarkerPosition] = useState({ x: 0, y: 0, radius: 0 });

  useEffect(() => {
    const getDefaultPosition = (location: string | undefined, width: number, height: number) => {
      const loc = (location || '').toLowerCase();
      let cX = 0.50, cY = 0.40, r = 0.12;
      
      if (loc.includes('right')) cX = 0.62;
      else if (loc.includes('left')) cX = 0.38;
      
      if (loc.includes('frontal')) cY = 0.28;
      else if (loc.includes('temporal')) cY = 0.46;
      else if (loc.includes('parietal')) cY = 0.34;
      else if (loc.includes('occipital')) cY = 0.52;
      else if (loc.includes('cerebellum')) cY = 0.68;
      
      return {
        x: cX * width,
        y: cY * height,
        radius: r * Math.min(width, height),
      };
    };

    const updateDimensions = () => {
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
        
        if (analysisData?.coordinates) {
          const { centerX, centerY, radius } = analysisData.coordinates;
          setMarkerPosition({
            x: centerX * rect.width,
            y: centerY * rect.height,
            radius: radius * Math.min(rect.width, rect.height),
          });
        } else if (tumorDetected) {
          const defaultPos = getDefaultPosition(tumorLocation, rect.width, rect.height);
          setMarkerPosition(defaultPos);
        }
      }
    };

    const image = imageRef.current;
    if (image) {
      if (image.complete) {
        updateDimensions();
      }
      image.addEventListener('load', updateDimensions);
      window.addEventListener('resize', updateDimensions);
    }

    return () => {
      if (image) {
        image.removeEventListener('load', updateDimensions);
      }
      window.removeEventListener('resize', updateDimensions);
    };
  }, [imageUrl, tumorDetected, tumorLocation, analysisData]);

  const features = analysisData?.features;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">MRI Scan with Tumor Detection</h3>
        {tumorDetected && confidence && (
          <Badge variant="destructive" className="text-xs" data-testid="badge-detection-confidence">
            AI Confidence: {confidence}%
          </Badge>
        )}
      </div>
      
      <div 
        ref={containerRef}
        className="relative rounded-md overflow-hidden border bg-black"
      >
        <img 
          ref={imageRef}
          src={imageUrl} 
          alt="MRI Scan" 
          className="w-full h-auto object-contain max-h-[500px]"
          data-testid="img-mri-scan"
        />
        
        {tumorDetected && dimensions.width > 0 && (
          <>
            {/* Tumor Location Label */}
            <div 
              className="absolute flex flex-col items-center"
              style={{
                left: markerPosition.x,
                top: Math.max(markerPosition.y - markerPosition.radius - 40, 10),
                transform: 'translateX(-50%)',
              }}
            >
              <Badge 
                variant="destructive" 
                className="whitespace-nowrap text-xs px-3 py-1"
                data-testid="badge-tumor-label"
              >
                AI-Suspected Region
              </Badge>
              <div 
                className="w-0.5 bg-red-500"
                style={{ height: Math.min(markerPosition.y - markerPosition.radius - 50, 20) }}
              />
            </div>

            {/* Circular Tumor Marker */}
            <div
              className="absolute border-4 border-red-500 rounded-full pointer-events-none"
              style={{
                left: markerPosition.x - markerPosition.radius,
                top: markerPosition.y - markerPosition.radius,
                width: markerPosition.radius * 2,
                height: markerPosition.radius * 2,
                boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.3), inset 0 0 20px rgba(239, 68, 68, 0.15)',
              }}
              data-testid="marker-tumor-circle"
            />

            {/* Size Label */}
            {tumorSize && (
              <div 
                className="absolute"
                style={{
                  left: markerPosition.x,
                  top: markerPosition.y + markerPosition.radius + 10,
                  transform: 'translateX(-50%)',
                }}
              >
                <Badge 
                  variant="secondary" 
                  className="whitespace-nowrap text-xs bg-gray-900/80 text-white border-0"
                  data-testid="badge-tumor-size"
                >
                  Size: {tumorSize}
                </Badge>
              </div>
            )}

            {/* Features Panel */}
            {features && (
              <Card 
                className="absolute p-3 bg-gray-900/90 border-gray-700 text-white"
                style={{
                  right: 10,
                  top: Math.max(markerPosition.y - 50, 10),
                }}
                data-testid="panel-features"
              >
                <p className="text-sm font-semibold mb-2">Features:</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Texture:</span>
                    <span className="font-medium text-blue-400">{features.texture}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Shape:</span>
                    <span className="font-medium text-blue-400">{features.shape}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Intensity:</span>
                    <span className="font-medium text-blue-400">{features.intensity}%</span>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {tumorDetected && (
        <div className="grid grid-cols-2 gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          {tumorType && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tumor Type</p>
              <p className="text-sm font-medium" data-testid="text-tumor-type">{tumorType}</p>
            </div>
          )}
          {tumorLocation && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-medium" data-testid="text-tumor-location">{tumorLocation}</p>
            </div>
          )}
          {tumorSize && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Size</p>
              <p className="text-sm font-medium" data-testid="text-tumor-size">{tumorSize}</p>
            </div>
          )}
          {confidence && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Detection Confidence</p>
              <p className="text-sm font-medium" data-testid="text-tumor-confidence">{confidence}%</p>
            </div>
          )}
        </div>
      )}
      
      {!tumorDetected && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
          <p className="text-sm text-green-700 dark:text-green-400" data-testid="text-no-tumor">
            No tumor detected in this scan
          </p>
        </div>
      )}
    </div>
  );
}
