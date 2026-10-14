/**
 * Student Lifecycle CRM - Student Lifecycle CRM Domain Types
 * Primary Source of Truth for Student Lifecycle Stages, RBAC, SLAs, and Data Schema
 */

export type UserRole = 
  | 'master_super_admin'
  | 'super_admin'
  | 'branch_manager'
  | 'counselor'
  | 'processing_officer'
  | 'visa_officer'
  | 'finance_officer'
  | 'student';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branch: string;
  avatarUrl?: string;
}

export type LifecycleStage =
  | 'lead'
  | 'counselling'
  | 'registration'
  | 'documentation'
  | 'profile_analysis'
  | 'university_shortlisting'
  | 'application_filing'
  | 'offer_management'
  | 'admission_confirmation'
  | 'financial_visa_services'
  | 'travel_preparation'
  | 'departure'
  | 'post_landing';

export interface StageMetadata {
  id: LifecycleStage;
  number: number;
  label: string;
  description: string;
  responsibleRole: UserRole;
  defaultSlaHours: number;
  color: string;
}

export const LIFECYCLE_STAGES: StageMetadata[] = [
  { id: 'lead', number: 1, label: 'Lead Capture', description: 'Inquiry capture, deduplication check, channel attribution', responsibleRole: 'counselor', defaultSlaHours: 4, color: 'sky' },
  { id: 'counselling', number: 2, label: 'Counselling & Assessment', description: 'Initial counseling session, study abroad goals, country preference', responsibleRole: 'counselor', defaultSlaHours: 24, color: 'blue' },
  { id: 'registration', number: 3, label: 'Registration & Sign-up', description: 'Formal agreement signup, registration fee token, onboarding invoice', responsibleRole: 'counselor', defaultSlaHours: 48, color: 'indigo' },
  { id: 'documentation', number: 4, label: 'Documentation Vault', description: 'Academic transcripts, passport, IELTS/TOEFL, SOP, LOR collection', responsibleRole: 'processing_officer', defaultSlaHours: 72, color: 'violet' },
  { id: 'profile_analysis', number: 5, label: 'Profile Analysis', description: 'GPA conversion, credential evaluation, eligibility gap analysis', responsibleRole: 'processing_officer', defaultSlaHours: 48, color: 'purple' },
  { id: 'university_shortlisting', number: 6, label: 'Shortlisting & Selection', description: 'Ambitious, moderate, and safe university & course matrix selection', responsibleRole: 'counselor', defaultSlaHours: 48, color: 'fuchsia' },
  { id: 'application_filing', number: 7, label: 'Application Filing', description: 'Portal submissions, fee waivers, referee submissions, reference tracking', responsibleRole: 'processing_officer', defaultSlaHours: 72, color: 'rose' },
  { id: 'offer_management', number: 8, label: 'Offer Letter Management', description: 'Conditional, unconditional offers tracking, condition clearing', responsibleRole: 'processing_officer', defaultSlaHours: 24, color: 'amber' },
  { id: 'admission_confirmation', number: 9, label: 'Admission Confirmation', description: 'Deposit payment, CAS/I-20 issuance, seat locking', responsibleRole: 'counselor', defaultSlaHours: 48, color: 'emerald' },
  { id: 'financial_visa_services', number: 10, label: 'Financial & Visa Services', description: 'Blocked account, loan sanction, visa file compilation, mock interviews', responsibleRole: 'visa_officer', defaultSlaHours: 120, color: 'teal' },
  { id: 'travel_preparation', number: 11, label: 'Travel Preparation', description: 'Pre-departure briefing, flight ticketing, forex card, student insurance', responsibleRole: 'branch_manager', defaultSlaHours: 48, color: 'cyan' },
  { id: 'departure', number: 12, label: 'Departure', description: 'Airport departure check, immigration pack confirmation, emergency contacts', responsibleRole: 'counselor', defaultSlaHours: 24, color: 'blue' },
  { id: 'post_landing', number: 13, label: 'Post-Landing Support', description: 'Accommodation check-in, university registration, SIM card, local buddy', responsibleRole: 'branch_manager', defaultSlaHours: 72, color: 'green' }
];

export interface StudentMasterProfile {
  id: string;
  studentRefNo: string; // e.g., GMI-2026-0042
  createdAt: string;
  updatedAt: string;
  currentStage: LifecycleStage;
  branch: string;
  assignedCounselorId: string;
  assignedCounselorName: string;
  assignedProcessingOfficerId?: string;
  assignedProcessingOfficerName?: string;
  assignedVisaOfficerId?: string;
  assignedVisaOfficerName?: string;

  // Personal Info
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    whatsapp: string;
    dateOfBirth: string;
    nationality: string;
    passportNumber?: string;
    aadhaarNumber?: string;
    panNumber?: string;
    city: string;
    state: string;
    gender?: string;
    emergencyContact?: {
      name: string;
      relation: string;
      phone: string;
      email?: string;
      portalAccessEnabled?: boolean;
    };
  };

  // Lead Attribution & Deduplication
  leadDetails: {
    source: 
      | 'website'
      | 'google_ads'
      | 'instagram'
      | 'facebook'
      | 'whatsapp'
      | 'phone_call'
      | 'walk_in'
      | 'referral'
      | 'education_fairs'
      | 'college_visits'
      | 'events'
      | 'google_search' 
      | 'education_fair' 
      | 'website_form';
    subSource?: string;
    campaign?: string;
    leadScore: number; // 0 - 100
    firstContactDate: string;
    duplicateFlag: boolean;
    duplicateMatchField?: 'phone' | 'email' | 'passport';
  };

  // Academic & Test Profile
  academics: {
    highestQualification: string;
    institution: string;
    completionYear: number;
    scoreType: 'gpa_10' | 'gpa_4' | 'percentage';
    scoreValue: number;
    cgpaOrPercentage?: string;
    backlogs: number;
    englishTest?: {
      testType: 'IELTS' | 'PTE' | 'TOEFL' | 'Duolingo' | 'Pending';
      overallScore?: number;
      bands?: { listening?: number; reading?: number; writing?: number; speaking?: number };
      testDate?: string;
    };
    greGmat?: {
      testType: 'GRE' | 'GMAT' | 'Waiver' | 'Not Required';
      score?: number;
    };
  };

  // Study Abroad Goals
  preferences: {
    targetCountries: string[]; // e.g. ['UK', 'USA', 'Germany', 'Australia']
    targetDegree: 'Bachelors' | 'Masters' | 'MBA' | 'PhD' | 'Diploma' | '';
    targetIntakeSeason: 'Fall' | 'Spring' | 'Summer' | '';
    targetIntakeYear: number;
    targetFields: string[]; // e.g. ['Computer Science', 'Data Analytics']
    budgetCapInLakhsINR: number;
    requiresLoan: boolean;
  };

  // Financial & Registration Info
  registration: {
    isRegistered: boolean;
    registrationDate?: string;
    registrationFeeAmount?: number;
    paymentStatus: 'unpaid' | 'partial' | 'paid' | 'waived';
    agreementSigned: boolean;
    agreementSignedAt?: string;
  };

  // Onboarding, Profile Completion & Credentials Dispatch
  onboardingStatus?: 'onboarded' | 'pending_profile' | 'profile_completed';
  profileCompleted?: boolean;
  profileCompletedAt?: string;
  profileCompletionPct?: number; // 0 - 100%
  credentialsSent?: boolean;
  credentialsSentAt?: string;
  paymentDetails?: {
    transactionReference: string;
    amountPaid: number;
    paymentDate: string;
    paymentMode?: string;
    verifiedByFinance: string;
    verifiedAt: string;
    receiptNumber?: string;
    invoiceNumber?: string;
  };

  // Parallel Services Activated
  parallelServices: {
    educationLoan: {
      active: boolean;
      partnerBank?: 'SBI' | 'HDFC Credila' | 'Avanse' | 'InCred' | 'Prodigy';
      sanctionAmount?: number;
      status: 'not_required' | 'applied' | 'in_review' | 'sanctioned' | 'disbursed';
    };
    testPrep: {
      active: boolean;
      course?: 'IELTS Coaching' | 'PTE Crash Course' | 'GRE Quantitative';
      enrolledAt?: string;
    };
    forexCard: {
      active: boolean;
      status: 'pending' | 'issued' | 'delivered';
    };
    simCard: {
      active: boolean;
      provider?: 'Giffgaff' | 'Lyca' | 'Mint Mobile';
      status: 'pending' | 'dispatched';
    };
    accommodation: {
      active: boolean;
      status: 'searching' | 'shortlisted' | 'booked';
      housingPartner?: 'AmberStudent' | 'Casita' | 'University Dorms';
    };
  };

  // Applications & Offers Tracking
  applications: Array<{
    id: string;
    universityName: string;
    country: string;
    courseName: string;
    category: 'Ambitious' | 'Moderate' | 'Safe';
    status: 'draft' | 'submitted' | 'conditional_offer' | 'unconditional_offer' | 'rejected' | 'accepted';
    applicationRefId?: string;
    appliedDate?: string;
    offerReceivedDate?: string;
    tuitionDepositDeadline?: string;
  }>;

  // Documents
  documents: Array<{
    id: string;
    name: string;
    category: 'Academic' | 'Financial' | 'Identity' | 'Statement' | 'Visa';
    status: 'pending' | 'uploaded' | 'verified' | 'rejected';
    verificationNotes?: string;
    uploadedAt?: string;
    fileSizeMb?: number;
  }>;

  // Active Tasks & SLA Tracking
  tasks: Array<{
    id: string;
    title: string;
    assignedToRole: UserRole;
    assignedToName: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    completed: boolean;
    slaHoursRemaining: number;
    isOverdue: boolean;
  }>;

  // Audit Log Entries
  auditTrail: Array<{
    id: string;
    timestamp: string;
    action: string;
    performedBy: string;
    role: UserRole;
    details: string;
  }>;

  // Granular 33-Milestone Study Abroad Journey Persistence
  journeyMilestones?: JourneyMilestoneRecord[];
}

export interface JourneyMilestoneRecord {
  stepNumber: number; // 1 to 33
  id: string; // milestone_1 to milestone_33
  title: string;
  stage: LifecycleStage;
  stageName: string;
  description: string;
  deliverable?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  blockerReason?: string;
  completedAt?: string;
  completedByUserId?: string;
  completedByUserName?: string;
  completedByUserRole?: string;
  prerequisiteStep?: number;
}

export interface DuplicateCheckPayload {
  email: string;
  phone: string;
  passportNumber?: string;
}

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  matchType?: 'email' | 'phone' | 'passport';
  existingStudent?: {
    id: string;
    studentRefNo: string;
    name: string;
    currentStage: LifecycleStage;
    assignedCounselorName: string;
    createdAt: string;
  };
}

export interface SystemArchitectureComponent {
  layer: 'Presentation (PWA)' | 'Application (API)' | 'Domain Services' | 'Persistence & Vault' | 'Security & Compliance';
  techStack: string;
  beginnerExplanation: string;
  productionStandard: string;
  status: 'Foundation Ready' | 'Planned in Phase 2' | 'Planned in Phase 3';
}

export interface SCurveMilestone {
  id: string;
  phaseNumber: number;
  phaseName: string;
  stageId: LifecycleStage;
  targetCumulativePct: number;
  actualCumulativePct: number;
  status: 'completed' | 'in_progress' | 'upcoming';
  completedAt?: string;
  actionRequired?: string;
  details: string;
}

export interface SCurveProgressData {
  studentId: string;
  studentRefNo: string;
  studentName: string;
  targetCountry: string;
  targetIntake: string;
  targetDegree?: string;
  assignedCounselorName: string;
  currentStage: LifecycleStage;
  onboardingStatus: string;
  overallProgressPct: number; // 0 - 100%
  plannedBaselinePct: number; // expected % by this point
  velocityStatus: 'On Track' | 'Ahead of Schedule' | 'Needs Attention';
  profileCompletionPct: number;
  documentsVerifiedCount: number;
  documentsTotalCount: number;
  shortlistCount: number;
  isShortlistLocked: boolean;
  applicationsCount: number;
  offersCount: number;
  visaStatus: string;
  milestones: SCurveMilestone[];
  milestones33?: JourneyMilestoneRecord[];
  completedMilestonesCount?: number;
  totalMilestonesCount?: number;
  currentMilestoneStep?: number;
  hasBlocker?: boolean;
  curvePoints: Array<{
    phase: string;
    step: number;
    plannedPct: number;
    actualPct: number;
    isCurrent: boolean;
  }>;
}

