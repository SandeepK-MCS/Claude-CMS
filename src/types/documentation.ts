/**
 * Student Lifecycle CRM - Documentation Management & Profile Analysis Domain Types
 */

export interface RejectionReasonPreset {
  id: string;
  label: string;
  category: string;
  description: string;
}

export const REJECTION_REASON_PRESETS: RejectionReasonPreset[] = [
  {
    id: "scan_blurry",
    label: "Blurry / Unreadable Scan",
    category: "Quality",
    description: "Resolution is too low or text is illegible. Please scan using a flatbed scanner or CamScanner in HD."
  },
  {
    id: "missing_pages",
    label: "Missing Pages or Backside",
    category: "Content",
    description: "Individual marksheet is incomplete or missing backside with grading legends."
  },
  {
    id: "name_mismatch",
    label: "Name Mismatch with Passport",
    category: "Compliance",
    description: "Applicant name on certificate differs from passport. An affidavit or gazette notification is required."
  },
  {
    id: "expired_doc",
    label: "Expired Certificate / Score Card",
    category: "Validity",
    description: "Language score (IELTS/TOEFL) or Passport has expired beyond permitted intake validity."
  },
  {
    id: "unattested_copy",
    label: "Unattested / Non-Official Copy",
    category: "Compliance",
    description: "University requires apostilled or college registrar-attested transcripts."
  },
  {
    id: "financial_unaged",
    label: "Funds Not Aged / Missing 28-day Statement",
    category: "Validity",
    description: "Bank balance certificate does not reflect funds held for the mandatory 28 consecutive days."
  },
  {
    id: "incomplete_breakdown",
    label: "Consolidated Marksheet without Semester Breakdowns",
    category: "Content",
    description: "University specifically demands semester-wise individual mark cards."
  },
  {
    id: "other_custom",
    label: "Custom Reviewer Notes",
    category: "Quality",
    description: "Specific observation documented in verification remarks."
  }
];

export type DocumentStatus = string;
export type DocumentCategory = string;
export type DocumentRequirementLevel = string;

export interface DocumentVersion {
  versionNumber?: number;
  uploadedAt?: string;
  uploadedBy?: string;
  fileUrl?: string;
  fileName?: string;
  fileSizeMb?: number;
  mimeType?: string;
  sha256Checksum?: string;
  rejectionReason?: string;
  remarks?: string;
  [key: string]: any;
}

export interface ManagedDocument {
  id: string;
  studentId: string;
  documentKey: string;
  title: string;
  category: DocumentCategory;
  requirementLevel: DocumentRequirementLevel;
  condition?: string;
  description: string;
  status: DocumentStatus;
  currentVersion?: any;
  versions: any[];
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface CountryChecklistRequirement {
  documentKey: string;
  title: string;
  category: DocumentCategory;
  requirementLevel: DocumentRequirementLevel;
  condition?: string;
  description: string;
  [key: string]: any;
}

export interface CountryChecklistTemplate {
  country: string;
  countryCode: string;
  currency: string;
  requirements: CountryChecklistRequirement[];
  [key: string]: any;
}

export interface DocumentReminderLog {
  id?: string;
  studentId?: string;
  studentRefNo?: string;
  studentName?: string;
  documentKey?: string;
  documentTitle?: string;
  reminderType?: string;
  channel?: string;
  sentAt?: string;
  recipientContact?: string;
  [key: string]: any;
}

export interface AcademicRecord {
  tenthMarksPct?: number;
  tenthBoard?: string;
  tenthPassingYear?: number;
  twelfthMarksPct?: number;
  twelfthBoard?: string;
  twelfthStream?: string;
  twelfthPassingYear?: number;
  degreeLevel?: string;
  degreeName?: string;
  university?: string;
  cgpa?: number;
  cgpaScale?: number;
  completionYear?: number;
  backlogs?: number;
  bavarianGpa?: number;
  [key: string]: any;
}

export interface LanguageAptitudeRecord {
  testType?: string;
  overallScore?: number;
  subBands?: { listening?: number; reading?: number; writing?: number; speaking?: number };
  testDate?: string;
  isValid?: boolean;
  greGmat?: { testType?: string; score?: number };
  [key: string]: any;
}

export interface PassportReadiness {
  hasPassport?: boolean;
  passportNumber?: string;
  expiryDate?: string;
  validityMonths?: number;
  isRenewable?: boolean;
  [key: string]: any;
}

export interface FinancialReadiness {
  budgetLakhsINR?: number;
  availableLiquidFundsINR?: number;
  requiresEducationLoan?: boolean;
  loanSanctionStatus?: string;
  sponsorRelation?: string;
  hasBlockedAccount?: boolean;
  [key: string]: any;
}

export interface ProfileRiskItem {
  id?: string;
  category?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical' | string;
  title?: string;
  description?: string;
  mitigationAdvice?: string;
  mitigationStrategy?: string;
  [key: string]: any;
}

export type EligibilityOutcome = any;

export interface PersonalizedRoadmapMilestone {
  id?: string;
  step?: number;
  title?: string;
  targetMonth?: string;
  description?: string;
  deliverable?: string;
  isCriticalPath?: boolean;
  [key: string]: any;
}

export interface StudentProfileAnalysis {
  id?: string;
  studentId?: string;
  studentRefNo?: string;
  studentName?: string;
  targetCountry?: string;
  targetCourse?: string;
  targetIntake?: string;
  bavarianGpa?: number;
  academic?: AcademicRecord;
  language?: LanguageAptitudeRecord;
  passport?: PassportReadiness;
  financial?: FinancialReadiness;
  riskItems?: ProfileRiskItem[];
  eligibility?: EligibilityOutcome;
  eligibilityOutcome?: any;
  isApproved?: boolean;
  approvedBy?: string;
  roadmap?: PersonalizedRoadmapMilestone[];
  recommendedUniversityTiers?: any;
  [key: string]: any;
}

export type TriggeredServiceType = string;

export interface TriggeredServiceRecord {
  id?: string;
  studentId?: string;
  type?: TriggeredServiceType;
  serviceType?: string;
  title?: string;
  serviceTitle?: string;
  desk?: string;
  ruleName?: string;
  triggerRuleName?: string;
  explanation?: string;
  triggerReasonExplanation?: string;
  triggeredAt?: string;
  status?: string;
  isDuplicatePrevented?: boolean;
  assignedPartnerOrDesk?: string;
  [key: string]: any;
}

export interface StudentDocumentRecord {
  id?: string;
  studentId?: string;
  name?: string;
  category?: string;
  fileSizeMb?: number;
  status?: 'pending' | 'verified' | 'rejected' | 'requested' | string;
  uploadedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  remarks?: string;
  fileUrl?: string;
  [key: string]: any;
}

export interface DocumentVerificationAction {
  documentId: string;
  status: 'verified' | 'rejected' | string;
  rejectionReasonPresetId?: string;
  rejectionReasonCustom?: string;
  remarks?: string;
  verifiedByName: string;
  verifiedByRole: string;
  [key: string]: any;
}
