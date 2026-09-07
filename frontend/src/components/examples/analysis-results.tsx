import { AnalysisResults } from "../analysis-results";

export default function AnalysisResultsExample() {
  return (
    <div className="p-6 max-w-md">
      <AnalysisResults
        tumorDetected={true}
        tumorType="Malignant Glioblastoma"
        confidence={92}
        tumorSize="24 × 18 mm"
        tumorLocation="Right Frontal Lobe"
        features={{
          texture: 87,
          shape: 78,
          intensity: 91,
        }}
      />
    </div>
  );
}
