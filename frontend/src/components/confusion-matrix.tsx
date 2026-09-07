import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ConfusionMatrixProps {
  data?: {
    truePositive: number;
    trueNegative: number;
    falsePositive: number;
    falseNegative: number;
  };
}

export function ConfusionMatrix({ data }: ConfusionMatrixProps) {
  const hasData = data && Object.keys(data).length > 0;
  const defaultData = hasData ? data : {
    truePositive: 85,
    trueNegative: 92,
    falsePositive: 8,
    falseNegative: 15,
  };
  
  const isPlaceholder = !hasData;

  const total = defaultData.truePositive + defaultData.trueNegative + defaultData.falsePositive + defaultData.falseNegative;
  const accuracy = ((defaultData.truePositive + defaultData.trueNegative) / total * 100).toFixed(1);
  const precision = (defaultData.truePositive / (defaultData.truePositive + defaultData.falsePositive) * 100).toFixed(1);
  const recall = (defaultData.truePositive / (defaultData.truePositive + defaultData.falseNegative) * 100).toFixed(1);
  const f1Score = (2 * (parseFloat(precision) * parseFloat(recall)) / (parseFloat(precision) + parseFloat(recall))).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Model Performance</CardTitle>
            <CardDescription>
              {isPlaceholder 
                ? "Sample confusion matrix showing typical model performance metrics" 
                : "Confusion matrix showing classification accuracy"}
            </CardDescription>
          </div>
          {isPlaceholder && (
            <Badge variant="secondary" className="text-xs">Sample Data</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 text-center text-sm font-medium text-muted-foreground mb-2">
              Predicted
            </div>
            <div />
            <div className="grid grid-cols-2 gap-4 text-center text-sm font-medium">
              <div className="text-muted-foreground">Positive</div>
              <div className="text-muted-foreground">Negative</div>
            </div>
            
            <div className="grid grid-rows-2 gap-4">
              <div className="flex items-center justify-end pr-4">
                <div className="text-sm font-medium text-muted-foreground">Positive</div>
              </div>
              <div className="flex items-center justify-end pr-4">
                <div className="text-sm font-medium text-muted-foreground">Negative</div>
              </div>
            </div>

            <div className="grid grid-cols-2 grid-rows-2 gap-4">
              <div 
                className="flex flex-col items-center justify-center p-6 rounded-lg bg-chart-2/20 border-2 border-chart-2"
                data-testid="confusion-matrix-tp"
              >
                <div className="text-3xl font-bold text-chart-2">{defaultData.truePositive}</div>
                <div className="text-xs text-muted-foreground mt-1">True Positive</div>
              </div>
              
              <div 
                className="flex flex-col items-center justify-center p-6 rounded-lg bg-destructive/20 border-2 border-destructive"
                data-testid="confusion-matrix-fp"
              >
                <div className="text-3xl font-bold text-destructive">{defaultData.falsePositive}</div>
                <div className="text-xs text-muted-foreground mt-1">False Positive</div>
              </div>
              
              <div 
                className="flex flex-col items-center justify-center p-6 rounded-lg bg-destructive/20 border-2 border-destructive"
                data-testid="confusion-matrix-fn"
              >
                <div className="text-3xl font-bold text-destructive">{defaultData.falseNegative}</div>
                <div className="text-xs text-muted-foreground mt-1">False Negative</div>
              </div>
              
              <div 
                className="flex flex-col items-center justify-center p-6 rounded-lg bg-chart-2/20 border-2 border-chart-2"
                data-testid="confusion-matrix-tn"
              >
                <div className="text-3xl font-bold text-chart-2">{defaultData.trueNegative}</div>
                <div className="text-xs text-muted-foreground mt-1">True Negative</div>
              </div>
            </div>

            <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-medium text-muted-foreground whitespace-nowrap">
              Actual
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Accuracy</span>
                <Badge variant="secondary" data-testid="badge-accuracy">{accuracy}%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Precision</span>
                <Badge variant="secondary" data-testid="badge-precision">{precision}%</Badge>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recall</span>
                <Badge variant="secondary" data-testid="badge-recall">{recall}%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">F1 Score</span>
                <Badge variant="secondary" data-testid="badge-f1">{f1Score}%</Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
