/**
 * Student Lifecycle CRM - Services & Visa Management Domain Types
 */

import { UserRole } from './crm';

export type ServiceType = string;

export type ServiceStatus = 
  | 'not_started'
  | 'in_progress'
  | 'pending_documents'
  | 'pending_approval'
  | 'completed'
  | 'blocked'
  | 'cancelled'
  | string;

export type ServicePriority = 'low' | 'medium' | 'high' | 'urgent' | string;

export interface ServiceMilestoneTask {
  id?: string;
  label?: string;
  isMandatory?: boolean;
  completed?: boolean;
  completedAt?: string;
  completedBy?: string;
  [key: string]: any;
}

export interface ManagedServiceRecord {
  id: string;
  studentId?: string;
  studentRefNo?: string;
  studentName?: string;
  serviceType?: ServiceType;
  title?: string;
  serviceTitle?: string;
  category?: string;
  department?: string;
  assignedTeam?: string;
  assignedOfficerName?: string;
  assignedOwner?: string;
  assignedOfficerRole?: UserRole | string;
  assignedOwnerRole?: UserRole | string;
  status?: ServiceStatus;
  statusDetails?: string;
  priority?: ServicePriority;
  slaHours?: number;
  slaHoursRemaining?: number;
  isOverdue?: boolean;
  dependencies?: any[];
  tasks?: ServiceMilestoneTask[];
  deliverables?: string[];
  createdAt?: string;
  updatedAt?: string;
  dueDate?: string;
  sla?: any;
  timeline?: any[];
  notes?: any;
  [key: string]: any;
}

export type VisaStage = string;

export interface DestinationVisaRequirements {
  country?: string;
  visaSubclass?: string;
  mandatoryDocuments?: string[];
  proofOfFundsType?: string;
  minimumLivingCostINR?: number;
  financialBenchmarkInr?: number;
  financialBenchmarkExplanation?: string;
  requirements?: any[];
  specialDirectives?: string[];
  healthInsuranceMandatory?: boolean;
  biometricsRequired?: boolean;
  interviewLikelihood?: string;
  standardProcessingWeeks?: number;
  [key: string]: any;
}

export interface AppointmentEligibility {
  isEligible?: boolean;
  checkedAt?: string;
  checkedBy?: string;
  blockingReasons?: string[];
  blockReasons?: string[];
  missingDocuments?: string[];
  financialsVerified?: boolean;
  admissionLetterConfirmed?: boolean;
  unsatisfiedPrerequisites?: string[];
  auditApprovalGranted?: boolean;
  [key: string]: any;
}

export interface VisaAppointmentBooking {
  id?: string;
  bookingId?: string;
  vacCenterName?: string;
  city?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  referenceNumber?: string;
  bookedAt?: string;
  bookedBy?: string;
  status?: string;
  confirmationReceiptUrl?: string;
  [key: string]: any;
}

export interface VisaDocumentAudit {
  id?: string;
  auditedBy?: string;
  auditedAt?: string;
  passed?: boolean;
  approved?: any;
  twoTierManagerSignoff?: any;
  checklistItems?: Array<{
    itemName: string;
    status: 'verified' | 'deficient' | 'pending' | string;
    notes?: string;
    [key: string]: any;
  }>;
  reviewRemarks?: string;
  [key: string]: any;
}

export interface VisaMockInterviewRecord {
  id?: string;
  interviewDate?: string;
  conductedBy?: string;
  scoreOutOf10?: number;
  result?: 'pass' | 're_mock_required' | 'fail' | string;
  feedback?: any;
  [key: string]: any;
}

export interface VisaDecisionRecord {
  decision?: string;
  decisionDate?: string;
  visaNumber?: string;
  validFrom?: string;
  validUntil?: string;
  refusalClause?: string;
  notes?: string;
  [key: string]: any;
}

export interface PassportTrackingRecord {
  id?: string;
  courierProvider?: string;
  courierPartner?: string;
  trackingNumber?: string;
  airwayBillNumber?: string;
  currentStatus?: string;
  deliveryStatus?: string;
  location?: string;
  receivedAt?: string;
  lastTrackingUpdate?: string;
  [key: string]: any;
}

export interface VisaStampVerificationRecord {
  id?: string;
  verified?: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  stampPhotoUrl?: string;
  remarks?: string;
  [key: string]: any;
}

export interface VisaReapplicationRecord {
  id?: string;
  previousRefusalDate?: string;
  refusalGrounds?: string;
  mitigationStrategy?: string;
  revisedFilingDate?: string;
  [key: string]: any;
}

export interface VisaCaseRecord {
  id: string;
  studentId?: string;
  studentRefNo?: string;
  studentName?: string;
  country?: string;
  destinationCountry?: string;
  targetUniversityName?: string;
  admittedUniversityName?: string;
  currentStage?: VisaStage;
  appointmentEligibility?: AppointmentEligibility;
  appointmentBooking?: VisaAppointmentBooking;
  documentAudit?: VisaDocumentAudit;
  finalDocumentAudit?: VisaDocumentAudit;
  mockInterviews?: VisaMockInterviewRecord[];
  decision?: VisaDecisionRecord;
  passportTracking?: PassportTrackingRecord;
  stampVerification?: VisaStampVerificationRecord;
  reapplicationDetails?: VisaReapplicationRecord;
  reapplicationHistory?: any[];
  updatedAt?: string;
  [key: string]: any;
}

export interface ServiceTestResult {
  id: string;
  testName?: string;
  name?: string;
  passed: boolean;
  details: string;
  [key: string]: any;
}
