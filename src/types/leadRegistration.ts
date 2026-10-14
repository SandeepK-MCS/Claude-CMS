/**
 * Student Lifecycle CRM - Lead Registration Domain Types
 */

export type LeadSource = string;
export type LeadPriority = any;

export interface DatabaseLeadSourceRecord {
  id: number;
  code: string;
  label: string;
  sourceKey?: string;
  sourceLabel?: string;
  name?: string;
  category?: string;
  channelCategory?: string;
  defaultPriority?: any;
  defaultPriorityTier?: any;
  isDigital?: boolean;
  is_active?: boolean;
  isActive?: boolean;
  inquiryCount?: number;
  conversionRatePct?: number;
  [key: string]: any;
}

export type CallDisposition = string;

export interface CallAttemptRecord {
  id: string;
  timestamp: string;
  counselorId?: string;
  counselorName?: string;
  disposition?: CallDisposition;
  callDisposition?: CallDisposition;
  status?: string;
  notes?: string;
  callNotes?: string;
  attemptNumber?: number;
  durationSeconds?: number;
  callDurationSeconds?: number;
  scheduledFollowUp?: string;
  nextFollowUpDate?: string;
  nextFollowUpAt?: string;
  [key: string]: any;
}

export interface DuplicateMatchInfo {
  isDuplicate?: boolean;
  matchField?: 'phone' | 'email' | 'passport' | string;
  matchedFields?: string[];
  matchedStudentId?: string;
  matchedLeadId?: string;
  matchedRecordId?: string;
  existingLeadId?: string;
  existingStudentId?: string;
  existingRefNo?: string;
  existingName?: string;
  assignedCounselorName?: string;
  matchScore?: number;
  createdAt?: any;
  [key: string]: any;
}

export interface CounsellingSessionData {
  scheduledAt?: string;
  scheduledTime?: string;
  completedAt?: string;
  counselorId?: string;
  counselorName?: string;
  notes?: string;
  status?: string;
  outcome?: string;
  mode?: string;
  [key: string]: any;
}

export interface RegistrationRecord {
  id?: string;
  isRegistered?: boolean;
  registeredAt?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  amount?: number;
  feeAmountINR?: number;
  gstAmountINR?: any;
  totalAmountINR?: any;
  registrationFeeAmount?: number;
  paymentStatus?: 'unpaid' | 'partial' | 'paid' | 'waived' | string;
  agreementSigned?: boolean;
  agreementSignedAt?: string;
  studentId?: string;
  studentRefNo?: string;
  onboardingTasksCreated?: string[];
  [key: string]: any;
}

export type CounselorAvailabilityStatus = 'available' | 'on_leave' | 'busy' | 'offline' | string;

export interface CounselorDailyScheduleEntry {
  dateIso: string;
  dayLabel: string;
  status: CounselorAvailabilityStatus;
  note?: string;
  [key: string]: any;
}

export interface CounselorAssignmentProfile {
  id: string;
  name: string;
  email: string;
  branch: string;
  isAvailable: boolean;
  activeLeadCount: number;
  maxLeadCapacity: number;
  schedule?: CounselorDailyScheduleEntry[];
  targetCountries?: string[];
  conversionRatePct?: number;
  [key: string]: any;
}

export interface LeadAssignmentConfiguration {
  ruleType: 'round_robin' | 'capacity_weighted' | 'strict_manual' | string;
  counselors: CounselorAssignmentProfile[];
  rules?: any[];
  defaultCounselorId?: string;
  [key: string]: any;
}

export interface LeadRecord {
  id: string;
  leadReferenceId?: string;
  studentRefNo?: string;
  createdAt?: string;
  updatedAt?: string;
  enquiryDateTime?: string;
  source: LeadSource;
  subSource?: string;
  campaign?: string;
  campaignData?: any;
  priority: any;
  status: string;
  leadScore?: number;
  branch?: string;
  assignedCounselorId?: string;
  assignedCounselorName?: string;
  assignedCounselorEmail?: string;
  contact: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    city?: string;
    state?: string;
    country?: string;
    [key: string]: any;
  };
  preferences?: {
    targetCountries?: string[];
    targetDegree?: string;
    targetIntakeSeason?: string;
    targetIntakeYear?: number;
    targetFields?: string[];
    budgetCapInLakhsINR?: number;
    requiresLoan?: boolean;
    [key: string]: any;
  };
  studyPreferences?: any;
  academics?: {
    highestQualification?: string;
    institution?: string;
    completionYear?: number;
    cgpaOrPercentage?: string;
    englishTest?: string;
    testScore?: string;
    [key: string]: any;
  };
  tasks?: any[];
  callAttempts?: CallAttemptRecord[];
  callHistory?: any[];
  counsellingSession?: CounsellingSessionData;
  registration?: RegistrationRecord;
  auditTrail?: Array<{
    id: string;
    timestamp: string;
    action: string;
    performedBy: string;
    role?: string;
    details: string;
    [key: string]: any;
  }>;
  duplicateMatch?: DuplicateMatchInfo;
  notes?: string;
  slaBreached?: boolean;
  firstCallSlaHours?: number;
  [key: string]: any;
}

export interface LeadWorkflowTestResult {
  id: string;
  name?: string;
  testName?: string;
  category?: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  details?: string;
  [key: string]: any;
}

export interface LeadImportParsedRow {
  [key: string]: any;
}

export interface LeadImportRowPreview {
  [key: string]: any;
}

export interface LeadImportPreviewResponse {
  [key: string]: any;
}

export interface LeadImportCommitResponse {
  [key: string]: any;
}
