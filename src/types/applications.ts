/**
 * Student Lifecycle CRM - Applications & University Shortlisting Domain Types
 */

export type ShortlistCategory = 'Ambitious' | 'Moderate' | 'Safe' | string;
export type UniversityTypeCode = 'PUBLIC' | 'PRIVATE' | 'Public' | 'Private' | string;

export interface UniversityMasterRecord {
  id: string;
  universityId?: string;
  name?: string;
  universityName?: string;
  country?: string;
  city?: string;
  stateOrLocation?: string;
  globalRanking?: number;
  nationalRanking?: number;
  type?: 'Public' | 'Private' | string;
  universityType?: UniversityTypeCode;
  minCgpa?: number;
  recommendedCgpa?: number;
  minPercentage?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  accreditation?: string;
  website?: string;
  portalType?: string;
  standardCurrency?: string;
  inrExchangeRate?: number;
  description?: string;
  dataSourceCitation?: string;
  [key: string]: any;
}

export interface CourseIntake {
  season?: 'Fall' | 'Spring' | 'Summer' | string;
  year?: number;
  regularDeadline?: string;
  hardCutoffDeadline?: string;
  isRolling?: boolean;
  [key: string]: any;
}

export interface CourseFees {
  tuitionFeePerYear?: number;
  estimatedLivingCostPerYear?: number;
  semesterFeePerYear?: number;
  currency?: string;
  applicationFee?: number;
  [key: string]: any;
}

export interface CourseEntryCriteria {
  minGpa10Scale?: number;
  germanGpaMinThreshold?: number;
  englishRequirements?: {
    testAccepted?: string[];
    minOverallIelts?: number;
    minIeltsSubBands?: { listening: number; reading: number; writing: number; speaking: number };
    minToefl?: number;
    waiverAllowed?: boolean;
    [key: string]: any;
  };
  greGmat?: string;
  minGreScore?: number;
  maxBacklogsAccepted?: number;
  workExperienceMonthsRequired?: number;
  [key: string]: any;
}

export interface CourseMasterRecord {
  id: string;
  universityId?: string;
  universityName?: string;
  country?: string;
  courseName?: string;
  faculty?: string;
  degreeLevel?: string;
  durationMonths?: number;
  credits?: number;
  intakes?: CourseIntake[];
  fees?: CourseFees;
  entryCriteria?: CourseEntryCriteria;
  specificPrerequisites?: string[];
  postStudyWorkVisaMonths?: number;
  dataSourceCitation?: string;
  [key: string]: any;
}

export interface ShortlistRecommendationItem {
  id: string;
  studentId?: string;
  courseId?: string;
  universityId?: string;
  universityName?: string;
  universityType?: UniversityTypeCode;
  courseName?: string;
  country?: string;
  stateOrLocation?: string;
  category?: ShortlistCategory;
  studentSelectionStatus?: string;
  counselorRecommendation?: string;
  rationale?: string;
  fees?: CourseFees;
  intake?: CourseIntake;
  portalType?: string;
  isSelected?: boolean;
  categoryRationale?: string;
  minCgpaRequired?: number;
  studentCgpaEvaluated?: number;
  [key: string]: any;
}

export type ShortlistWorkflowStepCode = string;

export interface ShortlistWorkflowStepDefinition {
  code?: ShortlistWorkflowStepCode;
  stepCode?: string;
  stepName?: string;
  label?: string;
  description?: string;
  authorizedRoles?: string[];
  responsibleActor?: string;
  order?: number;
  isEnabled?: boolean;
  isSystemCore?: boolean;
  [key: string]: any;
}

export type ShortlistCriterionCode = string;

export interface ShortlistCriterionDefinition {
  code: ShortlistCriterionCode;
  name?: string;
  label?: string;
  weight?: number;
  weightPct?: number;
  mandatory?: boolean;
  description?: string;
  isEnabled?: boolean;
  category?: string;
  configParams?: any;
  [key: string]: any;
}

export interface ShortlistAcknowledgement {
  acknowledged?: boolean;
  acknowledgedAt?: string;
  studentName?: string;
  studentEmail?: string;
  ipAddress?: string;
  [key: string]: any;
}

export interface ShortlistGovernanceContext {
  lockedAt?: string;
  lockedBy?: string;
  lockedByRole?: string;
  unlockedAt?: string;
  unlockedBy?: string;
  unlockReason?: string;
  [key: string]: any;
}

export interface ShortlistChangeRequest {
  id: string;
  requestedAt?: string;
  requestedBy?: string;
  requestedByUserId?: string;
  assignedApproverUserId?: string;
  reason?: string;
  status?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  [key: string]: any;
}

export interface StudentShortlistPlan {
  id: string;
  studentId: string;
  studentRefNo?: string;
  evaluatedCgpa?: number;
  isLocked?: boolean;
  lockedAt?: string;
  lockedBy?: string;
  items: ShortlistRecommendationItem[];
  workflowStep?: ShortlistWorkflowStepCode;
  studentSignature?: ShortlistAcknowledgement;
  studentAcknowledgement?: any;
  selectedPrivateCount?: number;
  selectedPublicCount?: number;
  selectedCount?: number;
  governance?: ShortlistGovernanceContext;
  changeRequests?: ShortlistChangeRequest[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface PrerequisiteBlockingItem {
  id: string;
  prerequisiteKey?: string;
  title: string;
  description?: string;
  isCompleted?: boolean;
  completedAt?: string;
  completedBy?: string;
  isBlocking?: boolean;
  [key: string]: any;
}

export interface ApplicationWorkspaceRecord {
  id: string;
  studentId?: string;
  universityId?: string;
  universityName?: string;
  courseId?: string;
  courseName?: string;
  category?: ShortlistCategory;
  country?: string;
  status?: string;
  submissionStatus?: string;
  portalUrl?: string;
  portalType?: string;
  portalCredentials?: any;
  applicationId?: string;
  submittedAt?: string;
  appliedDate?: string;
  deadlines?: any;
  prerequisites?: PrerequisiteBlockingItem[];
  canSubmit?: boolean;
  isSubmissionOverridden?: boolean;
  overrideAuthorizedBy?: string;
  daysRemaining?: number;
  isCriticalDeadline?: boolean;
  notes?: any;
  updatedAt?: string;
  auditLog?: any[];
  [key: string]: any;
}

export interface OfferConditionItem {
  id: string;
  conditionText?: string;
  category?: string;
  isSatisfied?: boolean;
  status?: string;
  satisfiedAt?: string;
  verifiedBy?: string;
  documentRefId?: string;
  [key: string]: any;
}

export interface OfferRecord {
  id: string;
  studentId?: string;
  applicationId?: string;
  universityId?: string;
  universityName?: string;
  courseName?: string;
  offerType?: string;
  offerDate?: string;
  tuitionDepositDeadline?: string;
  depositDeadline?: string;
  acceptanceDeadline?: string;
  depositAmount?: number;
  depositRequired?: any;
  depositStatus?: string;
  conditions?: OfferConditionItem[];
  isDecisionLocked?: boolean;
  decisionLockedAt?: string;
  decisionLockedBy?: string;
  officialOfferLetterUrl?: string;
  isFinalAdmittedInstitution?: boolean;
  decisionStatus?: string;
  country?: string;
  currency?: string;
  annualTuitionFee?: number;
  estimatedAnnualLivingCost?: number;
  totalFirstYearCostInr?: number;
  updatedAt?: string;
  [key: string]: any;
}

export interface OfferComparisonMatrixRow {
  [key: string]: any;
}
