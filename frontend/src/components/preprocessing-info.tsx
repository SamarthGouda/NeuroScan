import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wand2, Brain, Contrast, Check } from "lucide-react";

export function PreprocessingInfo() {
  const steps = [
    {
      icon: Wand2,
      title: "Noise Removal & Enhancement",
      description: "Advanced filtering algorithms remove artifacts and enhance image quality for accurate analysis",
      color: "text-chart-2",
    },
    {
      icon: Brain,
      title: "Skull Stripping",
      description: "Automated extraction of brain tissue, removing non-brain structures to focus analysis on relevant areas",
      color: "text-chart-3",
    },
    {
      icon: Contrast,
      title: "Image Normalization",
      description: "Standardization of intensity values across scans for consistent and reliable tumor detection",
      color: "text-chart-4",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Contrast className="h-5 w-5 text-primary" />
          Preprocessing Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Every MRI scan undergoes a sophisticated preprocessing pipeline to ensure optimal analysis quality:
        </p>

        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <step.icon className={`h-4 w-4 ${step.color}`} />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium mb-1">{step.title}</h4>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            <Check className="h-4 w-4 text-chart-2 flex-shrink-0 mt-1" />
          </div>
        ))}

        <div className="bg-primary/5 p-3 rounded-md border border-primary/20">
          <p className="text-xs text-muted-foreground">
            <strong>Quality Assurance:</strong> All preprocessing steps are validated to meet clinical 
            standards before the scan proceeds to AI analysis.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
