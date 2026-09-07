import { ReportView } from "../report-view";

export default function ReportViewExample() {
  return (
    <div className="p-6 max-w-4xl">
      <ReportView
        reportId="RPT-2024-001"
        patientName="John Doe"
        patientId="PT-2024-001"
        scanDate={new Date()}
        radiologistName="Sarah Johnson"
        findings={[
          "Hyperdense lesion identified in the right frontal lobe measuring approximately 24 × 18 mm",
          "Mass effect with midline shift of 3mm to the left",
          "Perilesional edema present, extending into surrounding white matter",
          "No evidence of hemorrhage or calcification within the lesion",
        ]}
        diagnosis="The imaging findings are consistent with a malignant glioblastoma in the right frontal lobe. The lesion demonstrates irregular margins and significant mass effect, characteristics typically associated with high-grade gliomas."
        recommendations={[
          "Immediate neurosurgical consultation for evaluation and management",
          "MRI with contrast for better tissue characterization",
          "Biopsy recommended for histopathological confirmation",
          "Follow-up imaging in 2-3 weeks to monitor progression",
        ]}
      />
    </div>
  );
}
