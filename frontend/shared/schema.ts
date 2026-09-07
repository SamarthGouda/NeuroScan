export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  role: "doctor" | "technician" | "admin" | string;
  title?: string;
  avatar?: string;
  profileImageUrl?: string;
  isActive?: boolean;
  status?: string;
  permissions?: string[];
}

export interface Patient {
  id: string;
  patientCode: string;
  fullName: string;
  age?: number;
  gender?: string;
  hospitalName?: string;
  phoneNumber?: string;
  address?: string;
  createdAt?: string;
  totalScans?: number;
  scans?: any[];
}

export interface Scan {
  id: string;
  patientId: string;
  patientCode?: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientAddress?: string;
  patientPhoneNumber?: string;
  hospitalName?: string;
  fileName: string;
  imageUrl: string;
  status: "pending" | "analyzing" | "completed" | "failed";
  tumorDetected?: boolean;
  tumorType?: string;
  confidence?: number;
  uncertainty?: number;
  uncertaintyTier?: "LOW" | "MEDIUM" | "HIGH";
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  riskScore?: number;
  tumorLocation?: string;
  tumorSize?: string;
  uploadedAt?: string;
  createdAt?: string;
  uploadedBy?: string;
  analysisData?: AnalysisData;
}

export interface AnalysisData {
  prediction_id?: string;
  predicted_class: string;
  tumor_class_raw?: string;
  tumor_type: string;
  confidence: number;
  uncertainty: number;
  uncertainty_tier: "LOW" | "MEDIUM" | "HIGH";
  clinical_flag?: string;
  entropy?: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  risk_score: number;
  risk_recommendation?: string;
  followup?: string;
  class_probabilities: Record<string, number>;
  std_probabilities?: Record<string, number>;
  top_radiomics_features?: RadiomicsFeature[];
  radiomics_features?: RadiomicsFeature[];
  clinical_report?: string;
  model_variant?: string;
  processing_time_ms?: number;
  xai: {
    gradcam?: string;
    gradcam_plus?: string;
    scorecam?: string;
    integrated_gradients?: string;
    faithfulness?: {
      pointing_game?: Record<string, number | null>;
      pixel_flipping?: {
        k_values?: number[];
        gradcam?: number[];
        gradcam_plus?: number[];
      };
    };
  };
  segmentation: {
    mask_overlay?: string;
    tumor_area_pixels: number;
    tumor_area_percent: number;
  };
  features?: {
    texture: number;
    shape: number;
    intensity: number;
  };
  confusionMatrix?: any;
  isArchived?: boolean;
}

export interface RadiomicsFeature {
  name: string;
  raw_name: string;
  value: number;
  norm_value: number;
  shap: number;
  direction: "up" | "down";
  description: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  hospitalName?: string;
  scanId: string;
  imageUrl?: string;
  status: "active" | "under_review" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  notes?: string;
  tumorType?: string;
  predictedClass?: string;
  confidence?: number;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  assignedDoctor?: string;
  assignedDoctorId?: string;
  reportsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosticReport {
  id: string;
  caseId?: string;
  scanId: string;
  patientId: string;
  version: number;
  title: string;
  summary?: string;
  reportContent: string;
  content?: string;
  filePath?: string;
  generatedAt: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  userId?: string;
  username: string;
  role: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface DashboardStats {
  total_scans: number;
  completed_scans: number;
  pending_scans: number;
  total_predictions: number;
  tumors_detected: number;
  total_patients: number;
  total_cases: number;
  active_cases: number;
  avg_confidence: number;
  avg_uncertainty: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  class_distribution: Record<string, number>;
  risk_distribution: Record<string, number>;
  class_avg_confidence: Record<string, number>;
  class_avg_uncertainty: Record<string, number>;
  recent_activity?: Array<{
    id: string;
    username: string;
    action: string;
    details?: string;
    timestamp: string;
  }>;
  test_accuracy?: number;
  test_auc?: number;
}
