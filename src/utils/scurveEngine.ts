import { 
  StudentMasterProfile, 
  LifecycleStage, 
  SCurveProgressData, 
  SCurveMilestone, 
  JourneyMilestoneRecord,
  LIFECYCLE_STAGES 
} from '../types/crm';

export interface MilestoneDefinition {
  phaseNumber: number;
  phaseName: string;
  stageId: LifecycleStage;
  targetCumulativePct: number;
  weightPct: number;
  description: string;
  defaultAction: string;
}

export interface RawMilestoneConfig {
  stepNumber: number;
  id: string;
  title: string;
  stage: LifecycleStage;
  stageName: string;
  description: string;
  deliverable: string;
  prerequisiteStep: number;
}

export const COMPLETE_33_JOURNEY_MILESTONES: RawMilestoneConfig[] = [
  // Stage 1: Lead & Inquiry (Steps 1-3)
  {
    stepNumber: 1,
    id: 'ms_01',
    title: 'Lead Registration & Intake Dossier',
    stage: 'lead',
    stageName: 'Lead & Inquiry',
    description: 'Initial student inquiry captured with contact details, destination country, level of study, and desired intake.',
    deliverable: 'Verified Lead Record in CRM',
    prerequisiteStep: 0
  },
  {
    stepNumber: 2,
    id: 'ms_02',
    title: 'Preliminary Profile Screening & Eligibility Evaluation',
    stage: 'lead',
    stageName: 'Lead & Inquiry',
    description: 'Academic background, degree grade, and eligibility evaluated against entry criteria for target destinations.',
    deliverable: 'Preliminary Academic Eligibility Clearance',
    prerequisiteStep: 1
  },
  {
    stepNumber: 3,
    id: 'ms_03',
    title: 'Initial Counsellor Allocation & Welcome Introduction',
    stage: 'counselling',
    stageName: 'Counselling & Discovery',
    description: 'Lead assigned to dedicated branch counselor, first contact disposition and welcome call logged.',
    deliverable: 'First Contact Call Logged & Counselor Tagged',
    prerequisiteStep: 2
  },

  // Stage 2: Counselling & Discovery (Steps 4-6)
  {
    stepNumber: 4,
    id: 'ms_04',
    title: 'Comprehensive Counselling & Study Abroad Roadmap',
    stage: 'counselling',
    stageName: 'Counselling & Discovery',
    description: 'In-depth assessment of career aspirations, target courses, university tiers, and application timeline.',
    deliverable: 'Comprehensive Counselling Assessment Dossier',
    prerequisiteStep: 3
  },
  {
    stepNumber: 5,
    id: 'ms_05',
    title: 'Budget Planning, ROI & Country Selection Consultation',
    stage: 'counselling',
    stageName: 'Counselling & Discovery',
    description: 'Tuition fees, living expenses, currency exchange rates, scholarship opportunities, and part-time work viability reviewed.',
    deliverable: 'Financial Feasibility & Country Strategy Note',
    prerequisiteStep: 4
  },
  {
    stepNumber: 6,
    id: 'ms_06',
    title: 'Terms of Engagement & Service Agreement Confirmation',
    stage: 'counselling',
    stageName: 'Counselling & Discovery',
    description: 'Student formally reviews and signs advisory terms of service, agreeing to consulting deliverables and milestone schedule.',
    deliverable: 'Signed Engagement Agreement Form',
    prerequisiteStep: 5
  },

  // Stage 3: Registration & Onboarding (Steps 7-9)
  {
    stepNumber: 7,
    id: 'ms_07',
    title: 'Registration Package Finalization & Fee Invoice',
    stage: 'registration',
    stageName: 'Registration & Onboarding',
    description: 'Registration package selected, formal invoice generated, and secure payment checkout link dispatched.',
    deliverable: 'Service Invoice & Payment Link Dispatched',
    prerequisiteStep: 6
  },
  {
    stepNumber: 8,
    id: 'ms_08',
    title: 'Student Registration Payment Verification & Finance Approval',
    stage: 'registration',
    stageName: 'Registration & Onboarding',
    description: 'Transaction reference, payment amount, and bank confirmation validated and formally approved by Finance team.',
    deliverable: 'Finance Verified Payment Receipt',
    prerequisiteStep: 7
  },
  {
    stepNumber: 9,
    id: 'ms_09',
    title: 'Student Portal Account Activation & Welcome Credentials',
    stage: 'registration',
    stageName: 'Registration & Onboarding',
    description: 'Official Student Reference Number issued, authenticated portal credentials generated, and welcome onboarding kit dispatched.',
    deliverable: 'Active Portal Login & Student Welcome Dossier',
    prerequisiteStep: 8
  },

  // Stage 4: Documentation & Vault (Steps 10-13)
  {
    stepNumber: 10,
    id: 'ms_10',
    title: 'Academic Transcripts & Degree Certificates Vault Upload',
    stage: 'documentation',
    stageName: 'Documentation & Vault',
    description: '10th, 12th, Bachelor marks memos, consolidated transcript, and degree certificates uploaded to encrypted vault.',
    deliverable: 'Cryptographic Document Vault Storage',
    prerequisiteStep: 9
  },
  {
    stepNumber: 11,
    id: 'ms_11',
    title: 'Standardized English Test Scorecard Verification',
    stage: 'documentation',
    stageName: 'Documentation & Vault',
    description: 'Official TRF scorecard (IELTS, TOEFL, PTE, or Duolingo) uploaded and verified against issuing authority portal.',
    deliverable: 'Verified English Proficiency Scorecard',
    prerequisiteStep: 10
  },
  {
    stepNumber: 12,
    id: 'ms_12',
    title: 'Statement of Purpose (SOP) & Letters of Recommendation (LOR) Drafts',
    stage: 'documentation',
    stageName: 'Documentation & Vault',
    description: 'Custom academic SOP draft, resume/CV, and 2-3 academic/work recommendation letters compiled and reviewed.',
    deliverable: 'Vetted Statement of Purpose & Referees List',
    prerequisiteStep: 11
  },
  {
    stepNumber: 13,
    id: 'ms_13',
    title: 'Complete Document Dossier Verification & Attestation',
    stage: 'documentation',
    stageName: 'Documentation & Vault',
    description: 'Processing officer conducts holistic review of all uploaded documents with zero defects.',
    deliverable: 'Certified Document Dossier Clearance',
    prerequisiteStep: 12
  },

  // Stage 5: Profile Analysis & Shortlisting (Steps 14-17)
  {
    stepNumber: 14,
    id: 'ms_14',
    title: 'Algorithmic CGPA & University Eligibility Matching',
    stage: 'profile_analysis',
    stageName: 'Profile Analysis',
    description: 'Student academic score matched against university entry requirements, backlogs tolerances, and country admission criteria.',
    deliverable: 'Algorithmic Eligibility Match Scorecard',
    prerequisiteStep: 13
  },
  {
    stepNumber: 15,
    id: 'ms_15',
    title: 'Counsellor Review & 13 University Shortlist Proposal (8 Private + 5 Public)',
    stage: 'university_shortlisting',
    stageName: 'University Shortlisting',
    description: 'Counsellor reviews recommended universities across Ambitious, Moderate, and Safe categories to present 13 tailored options.',
    deliverable: 'Deterministic 13-University Shortlist Portfolio',
    prerequisiteStep: 14
  },
  {
    stepNumber: 16,
    id: 'ms_16',
    title: 'Student Review, Rating & Selection (5 Private + 3 Public)',
    stage: 'university_shortlisting',
    stageName: 'University Shortlisting',
    description: 'Student reviews curriculum, tuition fees, and location, selecting exactly 5 Private and 3 Public universities (8 Total).',
    deliverable: 'Validated 8-University Student Selection',
    prerequisiteStep: 15
  },
  {
    stepNumber: 17,
    id: 'ms_17',
    title: 'Student Acknowledgement & Formal Selection Lockdown',
    stage: 'university_shortlisting',
    stageName: 'University Shortlisting',
    description: 'Student submits signed selection declaration; selection plan is locked down against changes without formal approval.',
    deliverable: 'Locked Shortlist Acknowledgement Record',
    prerequisiteStep: 16
  },

  // Stage 6: Application Workspace & Filing (Steps 18-21)
  {
    stepNumber: 18,
    id: 'ms_18',
    title: 'University Application Forms & Portal Data Compilation',
    stage: 'application_filing',
    stageName: 'Application Filing',
    description: 'Application profiles, supplementary questionnaires, and module preferences prepared for each chosen university.',
    deliverable: 'Completed University Application Dossiers',
    prerequisiteStep: 17
  },
  {
    stepNumber: 19,
    id: 'ms_19',
    title: 'Direct University Portal Application Filing & Fee Waivers',
    stage: 'application_filing',
    stageName: 'Application Filing',
    description: 'Applications submitted via official university direct portals or agents with institutional fee waivers applied.',
    deliverable: 'Application Submission IDs & Receipts',
    prerequisiteStep: 18
  },
  {
    stepNumber: 20,
    id: 'ms_20',
    title: 'Official Academic Referee Recommendations Dispatched',
    stage: 'application_filing',
    stageName: 'Application Filing',
    description: 'Electronic reference submission links dispatched to academic referees and tracked until submitted.',
    deliverable: 'Confirmed Academic Referee Submissions',
    prerequisiteStep: 19
  },
  {
    stepNumber: 21,
    id: 'ms_21',
    title: 'All 8 University Application Submissions Confirmed & Tracked',
    stage: 'application_filing',
    stageName: 'Application Filing',
    description: 'Formal acknowledgement of complete dossiers received from all 8 destination university admissions offices.',
    deliverable: 'Complete Filing Acknowledgements in CRM',
    prerequisiteStep: 20
  },

  // Stage 7: Offer Desk & Admission Confirmation (Steps 22-24)
  {
    stepNumber: 22,
    id: 'ms_22',
    title: 'University Decision Letters & Offer Letters Logged',
    stage: 'offer_management',
    stageName: 'Offer Management',
    description: 'Admissions committee decisions received: conditional offers, unconditional offers, or alternative course options logged.',
    deliverable: 'Official University Offer Letters in CRM',
    prerequisiteStep: 21
  },
  {
    stepNumber: 23,
    id: 'ms_23',
    title: 'Conditional / Unconditional Offer Evaluation & Condition Clearance',
    stage: 'offer_management',
    stageName: 'Offer Management',
    description: 'Academic, financial, and English conditions evaluated and verified with university admissions officers.',
    deliverable: 'Unconditional Admission Offer Clearance',
    prerequisiteStep: 22
  },
  {
    stepNumber: 24,
    id: 'ms_24',
    title: 'Final Admission Acceptance & Seat Deposit / Tuition Payment',
    stage: 'admission_confirmation',
    stageName: 'Admission Confirmation',
    description: 'Student confirms single final university choice and deposits seat reservation fee to secure admission.',
    deliverable: 'Official CAS / I-20 / Electronic Confirmation of Enrolment',
    prerequisiteStep: 23
  },

  // Stage 8: Financial Services & Loan Assistance (Steps 25-27)
  {
    stepNumber: 25,
    id: 'ms_25',
    title: 'Education Loan Assessment & Sanction Letter Processing',
    stage: 'financial_visa_services',
    stageName: 'Financial & Visa Services',
    description: 'Collateral/non-collateral education loan evaluated with partner financial institutions and sanction letter issued.',
    deliverable: 'Formal Education Loan Sanction Letter',
    prerequisiteStep: 24
  },
  {
    stepNumber: 26,
    id: 'ms_26',
    title: 'Blocked Account Opening & Proof of Funds Attestation',
    stage: 'financial_visa_services',
    stageName: 'Financial & Visa Services',
    description: 'Mandatory German blocked account (Coracle/Expatrio) funded or 28-day financial sponsorship bank certificate issued.',
    deliverable: 'Official Blocked Account / Proof of Funds Certificate',
    prerequisiteStep: 25
  },
  {
    stepNumber: 27,
    id: 'ms_27',
    title: 'Living Expenses & Multi-Currency Forex Account Setup',
    stage: 'financial_visa_services',
    stageName: 'Financial & Visa Services',
    description: 'International multi-currency Forex student debit card account created with zero-margin ATM withdrawal terms.',
    deliverable: 'Student Multi-Currency Forex Card Account',
    prerequisiteStep: 26
  },

  // Stage 9: Visa Filing & Consular Processing (Steps 28-30)
  {
    stepNumber: 28,
    id: 'ms_28',
    title: 'Consular Visa Dossier Preparation & Vetting',
    stage: 'financial_visa_services',
    stageName: 'Financial & Visa Services',
    description: 'Comprehensive visa filing dossier compiled: CAS/I-20, sponsorship letter, visa SOP, and biometric checklist.',
    deliverable: 'Certified Consular Visa Filing Dossier',
    prerequisiteStep: 27
  },
  {
    stepNumber: 29,
    id: 'ms_29',
    title: 'Consular Visa Application Lodgment & VFS Biometrics Appointment',
    stage: 'financial_visa_services',
    stageName: 'Financial & Visa Services',
    description: 'Official visa application fee paid, consular portal filed, and VFS/Embassy biometrics appointment booked.',
    deliverable: 'VFS Visa Submission Stamped Receipt',
    prerequisiteStep: 28
  },
  {
    stepNumber: 30,
    id: 'ms_30',
    title: 'Visa Interview Attendance & Official Visa Stamp / Vignette Grant',
    stage: 'financial_visa_services',
    stageName: 'Financial & Visa Services',
    description: 'Mock interview conducted, embassy appointment attended, and stamped visa passport returned to student.',
    deliverable: 'Approved Student Visa Vignette in Passport',
    prerequisiteStep: 29
  },

  // Stage 10: Travel Preparation & Post-Landing (Steps 31-33)
  {
    stepNumber: 31,
    id: 'ms_31',
    title: 'Flight Itinerary Booking & Travel Health Insurance',
    stage: 'travel_preparation',
    stageName: 'Travel Preparation',
    description: 'Flight ticket booked with student luggage allowance and mandatory overseas student health insurance activated.',
    deliverable: 'Confirmed Flight Ticket & Insurance Policy',
    prerequisiteStep: 30
  },
  {
    stepNumber: 32,
    id: 'ms_32',
    title: 'Pre-Departure Briefing & Forex Multi-Currency Card Handover',
    stage: 'departure',
    stageName: 'Departure',
    description: 'Student and parents attend pre-departure orientation covering customs, cultural adaptation, and emergency protocols.',
    deliverable: 'Pre-Departure Orientation Certificate & Card Handover',
    prerequisiteStep: 31
  },
  {
    stepNumber: 33,
    id: 'ms_33',
    title: 'Airport Landing Arrival, University Registration & Post-Landing Orientation',
    stage: 'post_landing',
    stageName: 'Post-Landing',
    description: 'Student lands abroad, airport pickup completed, university student ID card collected, and local bank account opened.',
    deliverable: 'Post-Landing Completion & Global Alumni Network Welcome',
    prerequisiteStep: 32
  }
];

/**
 * Initializes or syncs the 33-milestone array for a given student record.
 * Guarantees Step 1 is in_progress initially if newly created.
 */
export function initializeStudentMilestones(student: StudentMasterProfile): JourneyMilestoneRecord[] {
  if (student.journeyMilestones && Array.isArray(student.journeyMilestones) && student.journeyMilestones.length === 33) {
    return student.journeyMilestones;
  }

  // Check if student is an existing advanced stage seed (e.g. std_02, std_03 with advanced stages beyond onboarding)
  const isAdvancedLegacySeed = student.id === 'std_02' || student.id === 'std_03';
  const currentStageIndex = LIFECYCLE_STAGES.findIndex(s => s.id === student.currentStage);

  // Map each config to an active JourneyMilestoneRecord
  const milestones: JourneyMilestoneRecord[] = COMPLETE_33_JOURNEY_MILESTONES.map(cfg => {
    let status: 'pending' | 'in_progress' | 'completed' | 'blocked' = 'pending';
    let completedAt: string | undefined;

    if (isAdvancedLegacySeed) {
      if (cfg.stepNumber <= 13 && currentStageIndex >= 4) {
        status = 'completed';
        completedAt = '2026-09-11T12:00:00Z';
      } else if (cfg.stepNumber <= 17 && currentStageIndex >= 6) {
        status = 'completed';
        completedAt = '2026-09-13T16:00:00Z';
      }
    } else {
      // For all newly onboarded or standard students, Step 1 is in_progress initially, and all other steps are pending
      if (cfg.stepNumber === 1) {
        status = 'in_progress';
      } else {
        status = 'pending';
      }
    }

    return {
      stepNumber: cfg.stepNumber,
      id: cfg.id,
      title: cfg.title,
      stage: cfg.stage,
      stageName: cfg.stageName,
      description: cfg.description,
      deliverable: cfg.deliverable,
      status,
      completedAt,
      prerequisiteStep: cfg.prerequisiteStep
    };
  });

  // Ensure Step 1 is in_progress if no other step is in_progress
  if (!milestones.some(m => m.status === 'in_progress' || m.status === 'blocked')) {
    const firstPending = milestones.find(m => m.status === 'pending');
    if (firstPending) {
      firstPending.status = 'in_progress';
    } else {
      milestones[0].status = 'in_progress';
    }
  }

  student.journeyMilestones = milestones;
  return milestones;
}

export const SCURVE_PHASE_DEFINITIONS: MilestoneDefinition[] = [
  {
    phaseNumber: 1,
    phaseName: 'Onboarding & Registration Verification',
    stageId: 'registration',
    targetCumulativePct: 15,
    weightPct: 15,
    description: 'Registration fee confirmed by Finance, student ID issued, and welcome kit dispatched.',
    defaultAction: 'Complete registration agreement and payment verification.'
  },
  {
    phaseNumber: 2,
    phaseName: 'Student Profile & Emergency Contacts',
    stageId: 'registration',
    targetCumulativePct: 30,
    weightPct: 15,
    description: 'Personal details, passport number, emergency contact, and study goals completed in student portal.',
    defaultAction: 'Review and complete remaining fields in your Student Profile.'
  },
  {
    phaseNumber: 3,
    phaseName: 'Document Vault Collection & Verification',
    stageId: 'documentation',
    targetCumulativePct: 45,
    weightPct: 15,
    description: 'Academic transcripts, degree certificates, English test scorecards, and SOP drafts verified.',
    defaultAction: 'Upload pending academic transcripts and test scorecards to Vault.'
  },
  {
    phaseNumber: 4,
    phaseName: 'University Shortlisting & Selection (5 Priv + 3 Pub)',
    stageId: 'university_shortlisting',
    targetCumulativePct: 60,
    weightPct: 15,
    description: 'Formal student review and acknowledgement of exactly 5 Private and 3 Public universities.',
    defaultAction: 'Review recommended universities and acknowledge selection.'
  },
  {
    phaseNumber: 5,
    phaseName: 'University Application Filing & Submission',
    stageId: 'application_filing',
    targetCumulativePct: 75,
    weightPct: 15,
    description: 'Direct university portal applications filed, fee waivers applied, and official referee links submitted.',
    defaultAction: 'Monitor university application filing and portal application IDs.'
  },
  {
    phaseNumber: 6,
    phaseName: 'Offer Management & Seat Deposit Confirmation',
    stageId: 'offer_management',
    targetCumulativePct: 85,
    weightPct: 10,
    description: 'Conditional or unconditional admission offers evaluated, conditions cleared, and seat deposit paid.',
    defaultAction: 'Review admission offer letters and secure seat deposit.'
  },
  {
    phaseNumber: 7,
    phaseName: 'Financial Services & Consular Visa Stamping',
    stageId: 'financial_visa_services',
    targetCumulativePct: 95,
    weightPct: 10,
    description: 'Blocked account or loan disbursement confirmed, VFS appointment attended, and visa vignette issued.',
    defaultAction: 'Complete visa dossier and attend consular interview / VFS biometrics.'
  },
  {
    phaseNumber: 8,
    phaseName: 'Pre-Departure Briefing & Travel Arrival',
    stageId: 'departure',
    targetCumulativePct: 100,
    weightPct: 5,
    description: 'Flight ticket confirmed, multi-currency Forex card loaded, airport pickup booked, and orientation attended.',
    defaultAction: 'Attend pre-departure briefing and receive airport arrival pass.'
  }
];

// Helper to determine stage order index
const STAGE_ORDER: Record<LifecycleStage, number> = {
  lead: 1,
  counselling: 2,
  registration: 3,
  documentation: 4,
  profile_analysis: 5,
  university_shortlisting: 6,
  application_filing: 7,
  offer_management: 8,
  admission_confirmation: 9,
  financial_visa_services: 10,
  travel_preparation: 11,
  departure: 12,
  post_landing: 13
};

/**
 * Computes profile completeness percentage (0-100%) from real student master fields.
 */
export function calculateProfileCompletionPct(student: StudentMasterProfile): number {
  if (student.profileCompletionPct !== undefined && student.profileCompletionPct > 0) {
    return student.profileCompletionPct;
  }

  const checks = [
    Boolean(student.personal?.firstName && student.personal?.lastName),
    Boolean(student.personal?.email),
    Boolean(student.personal?.phone),
    Boolean(student.personal?.city && student.personal?.state),
    Boolean(student.personal?.dateOfBirth),
    Boolean(student.personal?.passportNumber && !student.personal.passportNumber.includes('•')),
    Boolean(student.personal?.emergencyContact?.name && student.personal?.emergencyContact?.phone),
    Boolean(student.academics?.highestQualification && student.academics?.institution),
    Boolean((student.academics?.scoreValue && student.academics.scoreValue > 0) || student.academics?.cgpaOrPercentage),
    Boolean(student.preferences?.targetCountries && student.preferences.targetCountries.length > 0),
    Boolean(student.preferences?.targetDegree),
    Boolean(student.preferences?.targetIntakeSeason && student.preferences?.targetIntakeYear)
  ];

  const completedCount = checks.filter(Boolean).length;
  return Math.round((completedCount / checks.length) * 100);
}

/**
 * Computes the complete Study Abroad S-Curve progress and milestone breakdown.
 * Everything is DATABASE-BACKED based on actual student master profile records.
 */
export function computeSCurveProgress(student: StudentMasterProfile): SCurveProgressData {
  const currentStageIndex = STAGE_ORDER[student.currentStage] || 3;
  const profilePct = calculateProfileCompletionPct(student);

  // 1. Phase 1: Onboarding & Registration (15%)
  const isRegistered = Boolean(
    student.registration?.isRegistered ||
    student.onboardingStatus === 'onboarded' ||
    currentStageIndex >= 3
  );
  const phase1Earned = isRegistered ? 15 : 0;

  // 2. Phase 2: Student Profile Complete (15%)
  const phase2Earned = Math.round((profilePct / 100) * 15);

  // 3. Phase 3: Documents (15%)
  const docs = student.documents || [];
  const verifiedDocsCount = docs.filter(d => d.status === 'verified').length;
  const totalDocsCount = Math.max(docs.length, 4); // Standard minimum 4 docs (Passport, Transcript, English, SOP)
  const docRatio = docs.length > 0 ? verifiedDocsCount / totalDocsCount : currentStageIndex >= 5 ? 1 : 0.5;
  const phase3Earned = Math.round(docRatio * 15);

  // 4. Phase 4: University Shortlisting (15%)
  const isShortlistLocked = Boolean(
    currentStageIndex > 6 ||
    (student.applications && student.applications.length > 0) ||
    student.auditTrail?.some(a => a.action?.toLowerCase().includes('shortlist') && a.action?.toLowerCase().includes('lock'))
  );
  const shortlistCount = (student.applications && student.applications.length > 0) ? student.applications.length : 8;
  const phase4Earned = isShortlistLocked ? 15 : currentStageIndex >= 6 ? 10 : 0;

  // 5. Phase 5: Applications Filing (15%)
  const apps = student.applications || [];
  const submittedApps = apps.filter(a => a.status !== 'draft');
  const appRatio = apps.length > 0 ? submittedApps.length / apps.length : currentStageIndex >= 8 ? 1 : currentStageIndex === 7 ? 0.6 : 0;
  const phase5Earned = Math.round(appRatio * 15);

  // 6. Phase 6: Offer Letters & Deposit (10%)
  const hasOffer = apps.some(a => a.status === 'conditional_offer' || a.status === 'unconditional_offer' || a.status === 'accepted') || currentStageIndex >= 9;
  const phase6Earned = hasOffer ? 10 : currentStageIndex >= 8 ? 5 : 0;

  // 7. Phase 7: Financial Services & Visa (10%)
  const visaApproved = currentStageIndex >= 11 || student.parallelServices?.educationLoan?.status === 'sanctioned' || student.currentStage === 'financial_visa_services';
  const phase7Earned = currentStageIndex >= 12 ? 10 : currentStageIndex === 11 ? 8 : currentStageIndex === 10 ? 5 : 0;

  // 8. Phase 8: Departure & Post-Landing (5%)
  const phase8Earned = currentStageIndex >= 13 ? 5 : currentStageIndex === 12 ? 3 : 0;

  const overallProgressPct = Math.min(
    100,
    Math.max(
      phase1Earned,
      phase1Earned + phase2Earned + phase3Earned + phase4Earned + phase5Earned + phase6Earned + phase7Earned + phase8Earned
    )
  );

  // Standard Expected Planned Baseline based on Stage
  const plannedBaselinePct = Math.min(100, Math.round((currentStageIndex / 13) * 100));

  let velocityStatus: 'On Track' | 'Ahead of Schedule' | 'Needs Attention' = 'On Track';
  if (overallProgressPct >= plannedBaselinePct + 5) {
    velocityStatus = 'Ahead of Schedule';
  } else if (overallProgressPct < plannedBaselinePct - 15) {
    velocityStatus = 'Needs Attention';
  }

  // Construct Milestones list
  let accumulated = 0;
  const milestones: SCurveMilestone[] = SCURVE_PHASE_DEFINITIONS.map((def, idx) => {
    let earned = 0;
    if (idx === 0) earned = phase1Earned;
    else if (idx === 1) earned = phase2Earned;
    else if (idx === 2) earned = phase3Earned;
    else if (idx === 3) earned = phase4Earned;
    else if (idx === 4) earned = phase5Earned;
    else if (idx === 5) earned = phase6Earned;
    else if (idx === 6) earned = phase7Earned;
    else if (idx === 7) earned = phase8Earned;

    accumulated += earned;

    const isDone = earned === def.weightPct || overallProgressPct >= def.targetCumulativePct;
    const isCurrent = !isDone && (idx === 0 || overallProgressPct >= SCURVE_PHASE_DEFINITIONS[idx - 1].targetCumulativePct - 5);

    return {
      id: `milestone_${def.phaseNumber}`,
      phaseNumber: def.phaseNumber,
      phaseName: def.phaseName,
      stageId: def.stageId,
      targetCumulativePct: def.targetCumulativePct,
      actualCumulativePct: Math.min(def.targetCumulativePct, Math.round(accumulated)),
      status: isDone ? 'completed' : isCurrent ? 'in_progress' : 'upcoming',
      completedAt: isDone ? (student.updatedAt || new Date().toISOString()) : undefined,
      actionRequired: !isDone ? def.defaultAction : undefined,
      details: def.description
    };
  });

  // Generate 8-point smooth curve coordinates (planned vs actual)
  const curvePoints = SCURVE_PHASE_DEFINITIONS.map((def, idx) => {
    const isCurrent = milestones[idx]?.status === 'in_progress';
    return {
      phase: `P${def.phaseNumber}`,
      step: def.phaseNumber,
      plannedPct: def.targetCumulativePct,
      actualPct: milestones[idx]?.actualCumulativePct || 0,
      isCurrent
    };
  });

  // Ensure 33 milestones are initialized on student
  const milestones33 = student.journeyMilestones && student.journeyMilestones.length === 33
    ? student.journeyMilestones
    : initializeStudentMilestones(student);
  
  const completedMilestonesCount = milestones33.filter(m => m.status === 'completed').length;
  const totalMilestonesCount = 33;
  const hasBlocker = milestones33.some(m => m.status === 'blocked');
  const currentActiveMilestone = milestones33.find(m => m.status === 'in_progress' || m.status === 'blocked');
  const currentMilestoneStep = currentActiveMilestone ? currentActiveMilestone.stepNumber : 1;

  // Real database percentage based on 33 milestones
  const progressFrom33Pct = Math.round((completedMilestonesCount / 33) * 100);

  return {
    studentId: student.id,
    studentRefNo: student.studentRefNo,
    studentName: `${student.personal?.firstName || 'Student'} ${student.personal?.lastName || ''}`.trim(),
    targetCountry: (student.preferences?.targetCountries || ['United Kingdom'])[0],
    targetIntake: `${student.preferences?.targetIntakeSeason || 'Fall'} ${student.preferences?.targetIntakeYear || 2026}`,
    targetDegree: student.preferences?.targetDegree || 'Masters',
    assignedCounselorName: student.assignedCounselorName || 'Assigned Counsellor',
    currentStage: student.currentStage,
    onboardingStatus: student.onboardingStatus || (student.registration?.isRegistered ? 'onboarded' : 'pending_profile'),
    overallProgressPct: progressFrom33Pct,
    plannedBaselinePct,
    velocityStatus,
    profileCompletionPct: profilePct,
    documentsVerifiedCount: verifiedDocsCount,
    documentsTotalCount: docs.length,
    shortlistCount,
    isShortlistLocked,
    applicationsCount: apps.length,
    offersCount: apps.filter(a => a.status.includes('offer')).length,
    visaStatus: currentStageIndex >= 11 ? 'Granted' : currentStageIndex === 10 ? 'In Process' : 'Upcoming',
    milestones,
    milestones33,
    completedMilestonesCount,
    totalMilestonesCount,
    currentMilestoneStep,
    hasBlocker,
    curvePoints
  };
}
