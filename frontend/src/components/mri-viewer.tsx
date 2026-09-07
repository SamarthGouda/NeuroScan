import { useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ZoomIn,
  ZoomOut,
  Move,
  Ruler,
  RotateCcw,
  Eye,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  Contrast,
  Sun,
  Activity,
  Crosshair,
} from "lucide-react";
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
  const [overlayOpacity, setOverlayOpacity] = useState(85);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null);
  const [invertGrayscale, setInvertGrayscale] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 20, 220));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 20, 50));

  const resetControls = () => {
    setZoom(100);
    setBrightness(100);
    setContrast(100);
    setOverlayOpacity(85);
    setActiveTool(null);
    setPanPosition({ x: 0, y: 0 });
    setMeasureStart(null);
    setMeasureEnd(null);
    setInvertGrayscale(false);
    toast({
      title: "Radiology View Reset",
      description: "Default windowing, scale, and pan restored.",
    });
  };

  // Quick Radiology Windowing Presets
  const applyPreset = (preset: "brain" | "bone" | "high-contrast") => {
    if (preset === "brain") {
      setBrightness(100);
      setContrast(105);
    } else if (preset === "bone") {
      setBrightness(120);
      setContrast(140);
    } else if (preset === "high-contrast") {
      setBrightness(105);
      setContrast(130);
    }
    toast({ title: `Window Preset Applied`, description: `Switched to ${preset.toUpperCase()} contrast preset.` });
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
      const mmDistance = (distance * 0.45).toFixed(1);
      toast({
        title: "Caliper Distance Measured",
        description: `Estimated lesion span: ~${mmDistance} mm`,
      });
    }
  }, [activeTool, measureStart, measureEnd, toast]);

  // Determine active overlay layer
  const getOverlayImage = () => {
    if (activeViewMode === "raw") return null;
    if (activeViewMode === "gradcam") return analysisData?.xai?.gradcam;
    if (activeViewMode === "gradcam_plus") return analysisData?.xai?.gradcam_plus;
    if (activeViewMode === "ig") return analysisData?.xai?.integrated_gradients;
    return analysisData?.segmentation?.mask_overlay;
  };

  const currentOverlay = getOverlayImage();

  return (
    <div className="space-y-3">
      {/* PACS Workstation Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-card/75 backdrop-blur-xl p-2 rounded-xl border border-border/70 shadow-sm">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleZoomIn}
            disabled={zoom >= 220}
            className="h-8 w-8 hover:bg-cyan-500/15 hover:text-cyan-400"
            title="Zoom In (+20%)"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="h-8 w-8 hover:bg-cyan-500/15 hover:text-cyan-400"
            title="Zoom Out (-20%)"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={activeTool === "pan" ? "default" : "ghost"}
            onClick={() => setActiveTool(activeTool === "pan" ? null : "pan")}
            className={`h-8 w-8 ${activeTool === "pan" ? "bg-cyan-500 text-white shadow-sm" : "hover:bg-cyan-500/15 hover:text-cyan-400"}`}
            title="Pan Tool"
          >
            <Move className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={activeTool === "measure" ? "default" : "ghost"}
            onClick={() => {
              setActiveTool(activeTool === "measure" ? null : "measure");
              setMeasureStart(null);
              setMeasureEnd(null);
            }}
            className={`h-8 w-8 ${activeTool === "measure" ? "bg-cyan-500 text-white shadow-sm" : "hover:bg-cyan-500/15 hover:text-cyan-400"}`}
            title="Measure Tool (Caliper)"
          >
            <Ruler className="h-4 w-4" />
          </Button>
          
          <div className="h-4 w-px bg-border/60 mx-1" />

          {/* Quick Windowing Presets */}
          <div className="hidden sm:flex items-center gap-1 font-mono text-[10px]">
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyPreset("brain")}
              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
            >
              Brain
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyPreset("high-contrast")}
              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
            >
              Hi-Contrast
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyPreset("bone")}
              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
            >
              Bone
            </Button>
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setInvertGrayscale(!invertGrayscale)}
            className={`h-8 w-8 ${invertGrayscale ? "text-cyan-400 bg-cyan-500/10" : "text-muted-foreground hover:text-foreground"}`}
            title="Invert Grayscale"
          >
            <Contrast className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={resetControls}
            className="h-8 w-8 hover:bg-muted"
            title="Reset Viewport"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Diagnosis Pill */}
        <div className="flex items-center gap-2">
          {tumorDetected ? (
            <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-mono flex items-center gap-1.5 px-2.5 py-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              Attention U-Net Lesion Delineated
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono flex items-center gap-1.5 px-2.5 py-0.5">
              <Eye className="h-3 w-3" />
              No Focal Lesion Detected
            </Badge>
          )}
        </div>
      </div>

      {/* Main Radiology Viewport Canvas */}
      <Card
        ref={containerRef}
        className="relative overflow-hidden bg-slate-950 aspect-square select-none border-border/80 shadow-2xl rounded-2xl flex items-center justify-center ring-1 ring-white/5"
        style={{ cursor: activeTool === "pan" ? "grab" : activeTool === "measure" ? "crosshair" : "default" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Radiological Canvas HUD - Top Overlays */}
        <div className="absolute top-3 left-3 z-10 font-mono text-[10px] text-slate-400/90 bg-slate-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 space-y-0.5 pointer-events-none">
          <p className="text-cyan-400 font-semibold flex items-center gap-1">
            <Activity className="h-3 w-3" /> AXIAL MRI VIEW
          </p>
          <p>MATRIX: 224 x 224</p>
          <p>SEQ: T1-CONTRAST ENHANCED</p>
        </div>

        <div className="absolute top-3 right-3 z-10 font-mono text-[10px] text-slate-400/90 bg-slate-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-right space-y-0.5 pointer-events-none">
          <p className="text-slate-200 font-medium">NEUROSCAN PACS</p>
          <p>ZOOM: {zoom}%</p>
          <p>BRIGHTNESS: {brightness}%</p>
        </div>

        {/* Movable Canvas Wrapper */}
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
              filter: `brightness(${brightness}%) contrast(${contrast}%) ${invertGrayscale ? "invert(1)" : ""}`,
            }}
            data-testid="img-mri-scan"
          />

          {/* AI Attention U-Net / XAI Heatmap Overlay */}
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

          {/* Caliper Measurement Line */}
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
                strokeWidth="2"
                strokeDasharray="4,4"
              />
              <circle cx={measureStart.x} cy={measureStart.y} r="4" fill="#06b6d4" />
              <circle cx={measureEnd.x} cy={measureEnd.y} r="4" fill="#06b6d4" />
            </svg>
          )}
        </div>

        {/* Bottom Layer Status Pill */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
          <Badge variant="outline" className="bg-slate-950/90 text-cyan-300 text-[10px] font-mono border-cyan-500/30 backdrop-blur-md px-2.5 py-1">
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
        </div>

        {/* Crosshair indicator when activeTool is measure */}
        {activeTool === "measure" && (
          <div className="absolute bottom-3 right-3 z-10 font-mono text-[10px] text-amber-400 bg-slate-950/90 border border-amber-500/30 px-2 py-1 rounded">
            Click & drag to measure lesion span
          </div>
        )}
      </Card>

      {/* Interactive Sliders Instrumentation Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-card/60 backdrop-blur-xl rounded-xl border border-border/70 text-xs shadow-sm">
        <div className="space-y-1.5">
          <div className="flex justify-between font-medium">
            <span className="text-muted-foreground">AI Overlay Opacity</span>
            <span className="font-mono text-cyan-400">{overlayOpacity}%</span>
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
            <span className="text-muted-foreground">Viewport Zoom</span>
            <span className="font-mono">{zoom}%</span>
          </div>
          <Slider
            value={[zoom]}
            onValueChange={(val) => setZoom(val[0])}
            min={50}
            max={220}
            step={10}
            data-testid="slider-zoom"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between font-medium">
            <span className="text-muted-foreground">Brightness</span>
            <span className="font-mono">{brightness}%</span>
          </div>
          <Slider
            value={[brightness]}
            onValueChange={(val) => setBrightness(val[0])}
            min={50}
            max={160}
            step={5}
            data-testid="slider-brightness"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between font-medium">
            <span className="text-muted-foreground">Contrast</span>
            <span className="font-mono">{contrast}%</span>
          </div>
          <Slider
            value={[contrast]}
            onValueChange={(val) => setContrast(val[0])}
            min={50}
            max={160}
            step={5}
            data-testid="slider-contrast"
          />
        </div>
      </div>
    </div>
  );
}
