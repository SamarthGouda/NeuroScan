import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Move, Ruler, RotateCcw, Eye, Layers, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { AnalysisData } from "@shared/schema";

interface MRIViewerProps {
  imageUrl: string;
  tumorDetected?: boolean;
  showOverlay?: boolean;
  tumorLocation?: string;
  tumorSize?: string;
  features?: {
    texture: number;
    shape: number;
    intensity: number;
  };
  analysisData?: AnalysisData;
  activeViewMode?: "segmentation" | "gradcam" | "gradcam_plus" | "ig" | "raw";
}

export function MRIViewer({
  imageUrl,
  tumorDetected = false,
  showOverlay = true,
  tumorLocation,
  tumorSize,
  features,
  analysisData,
  activeViewMode = "segmentation",
}: MRIViewerProps) {
  const { toast } = useToast();
  const [zoom, setZoom] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [overlayOpacity, setOverlayOpacity] = useState(80);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 20, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 20, 50));
  };

  const resetControls = () => {
    setZoom(100);
    setBrightness(100);
    setContrast(100);
    setOverlayOpacity(80);
    setActiveTool(null);
    setPanPosition({ x: 0, y: 0 });
    setMeasureStart(null);
    setMeasureEnd(null);
    toast({ title: "Workstation View Reset", description: "Zoom, pan, and contrast restored to defaults." });
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (activeTool === "pan") {
        setIsDragging(true);
        setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
      } else if (activeTool === "measure") {
        setMeasureStart({ x, y });
        setMeasureEnd(null);
      }
    },
    [activeTool, panPosition]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isDragging && activeTool === "pan") {
        setPanPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      } else if (activeTool === "measure" && measureStart) {
        setMeasureEnd({ x, y });
      }
    },
    [isDragging, activeTool, dragStart, measureStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (activeTool === "measure" && measureStart && measureEnd) {
      const distance = Math.sqrt(
        Math.pow(measureEnd.x - measureStart.x, 2) + Math.pow(measureEnd.y - measureStart.y, 2)
      );
      const mmDistance = (distance * 0.5).toFixed(1);
      toast({
        title: "Caliper Measurement",
        description: `Calibrated visual distance: ~${mmDistance} mm`,
      });
    }
  }, [activeTool, measureStart, measureEnd, toast]);

  // Determine which overlay image to render
  const getOverlayImage = () => {
    if (activeViewMode === "raw") return null;
    if (activeViewMode === "gradcam") return analysisData?.xai?.gradcam;
    if (activeViewMode === "gradcam_plus") return analysisData?.xai?.gradcam_plus;
    if (activeViewMode === "ig") return analysisData?.xai?.integrated_gradients;
    // Default: Attention U-Net segmentation mask overlay
    return analysisData?.segmentation?.mask_overlay;
  };

  const currentOverlay = getOverlayImage();

  return (
    <div className="space-y-4">
      {/* Top Workstation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-xl border border-border/60">
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="outline"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="h-8 w-8"
            title="Zoom In (+20%)"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="h-8 w-8"
            title="Zoom Out (-20%)"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={activeTool === "pan" ? "default" : "outline"}
            onClick={() => setActiveTool(activeTool === "pan" ? null : "pan")}
            className="h-8 w-8"
            title="Pan Tool"
          >
            <Move className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={activeTool === "measure" ? "default" : "outline"}
            onClick={() => {
              setActiveTool(activeTool === "measure" ? null : "measure");
              setMeasureStart(null);
              setMeasureEnd(null);
            }}
            className="h-8 w-8"
            title="Measure Tool"
          >
            <Ruler className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={resetControls}
            className="h-8 w-8"
            title="Reset View"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {tumorDetected ? (
            <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Attention U-Net Lesion Delineated
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs flex items-center gap-1">
              <Eye className="h-3 w-3" /> No Focal Lesion Detected
            </Badge>
          )}
        </div>
      </div>

      {/* Main MRI Canvas Card */}
      <Card
        ref={containerRef}
        className="relative overflow-hidden bg-slate-950 aspect-square select-none border-slate-800 shadow-2xl rounded-2xl flex items-center justify-center"
        style={{ cursor: activeTool === "pan" ? "grab" : activeTool === "measure" ? "crosshair" : "default" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-75"
          style={{ transform: `translate(${panPosition.x}px, ${panPosition.y}px)` }}
        >
          {/* Base MRI Image */}
          <img
            src={imageUrl}
            alt="Brain MRI Axial Acquisition"
            className="max-w-full max-h-full object-contain pointer-events-none rounded-lg"
            style={{
              transform: `scale(${zoom / 100})`,
              filter: `brightness(${brightness}%) contrast(${contrast}%)`,
            }}
            data-testid="img-mri-scan"
          />

          {/* Model Attention U-Net / XAI Overlay */}
          {currentOverlay && overlayOpacity > 0 && (
            <img
              src={currentOverlay}
              alt="Neural Network Overlay"
              className="absolute max-w-full max-h-full object-contain pointer-events-none rounded-lg"
              style={{
                transform: `scale(${zoom / 100})`,
                opacity: overlayOpacity / 100,
                mixBlendMode: "screen",
              }}
              data-testid="img-ai-overlay"
            />
          )}

          {/* Caliper Line */}
          {measureStart && measureEnd && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: `translate(${-panPosition.x}px, ${-panPosition.y}px)` }}
            >
              <line
                x1={measureStart.x}
                y1={measureStart.y}
                x2={measureEnd.x}
                y2={measureEnd.y}
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeDasharray="4,4"
              />
              <circle cx={measureStart.x} cy={measureStart.y} r="5" fill="#06b6d4" />
              <circle cx={measureEnd.x} cy={measureEnd.y} r="5" fill="#06b6d4" />
            </svg>
          )}
        </div>

        {/* Canvas HUD Status Badges */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
          <Badge variant="outline" className="bg-slate-900/90 text-cyan-300 text-[10px] border-cyan-500/30 backdrop-blur-md">
            {activeViewMode === "raw"
              ? "RAW MRI SCAN"
              : activeViewMode === "gradcam"
              ? `GRAD-CAM OVERLAY (${overlayOpacity}%)`
              : activeViewMode === "gradcam_plus"
              ? `GRAD-CAM++ OVERLAY (${overlayOpacity}%)`
              : activeViewMode === "ig"
              ? `INTEGRATED GRADIENTS (${overlayOpacity}%)`
              : `ATTENTION U-NET MASK (${overlayOpacity}%)`}
          </Badge>
          {zoom !== 100 && (
            <Badge variant="outline" className="bg-slate-900/90 text-slate-300 text-[10px] border-slate-700 font-mono">
              {zoom}% ZOOM
            </Badge>
          )}
        </div>
      </Card>

      {/* Interactive Controls Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-card/60 backdrop-blur-sm rounded-xl border border-border/60 text-xs">
        <div className="space-y-1.5">
          <div className="flex justify-between font-medium">
            <span>AI Overlay Opacity</span>
            <span className="font-mono text-cyan-500">{overlayOpacity}%</span>
          </div>
          <Slider
            value={[overlayOpacity]}
            onValueChange={(val) => setOverlayOpacity(val[0])}
            min={0}
            max={100}
            step={5}
            data-testid="slider-overlay-opacity"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between font-medium">
            <span>Zoom</span>
            <span className="font-mono">{zoom}%</span>
          </div>
          <Slider
            value={[zoom]}
            onValueChange={(val) => setZoom(val[0])}
            min={50}
            max={200}
            step={10}
            data-testid="slider-zoom"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between font-medium">
            <span>Brightness</span>
            <span className="font-mono">{brightness}%</span>
          </div>
          <Slider
            value={[brightness]}
            onValueChange={(val) => setBrightness(val[0])}
            min={50}
            max={150}
            step={5}
            data-testid="slider-brightness"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between font-medium">
            <span>Contrast</span>
            <span className="font-mono">{contrast}%</span>
          </div>
          <Slider
            value={[contrast]}
            onValueChange={(val) => setContrast(val[0])}
            min={50}
            max={150}
            step={5}
            data-testid="slider-contrast"
          />
        </div>
      </div>
    </div>
  );
}
