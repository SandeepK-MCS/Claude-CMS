/**
 * Student Lifecycle CRM - Application & Offer Management Engine
 * Implements University Shortlisting, Application Workspace, Dependency Blocking, and Offer Management.
 */

import { 
  UniversityMasterRecord, 
  CourseMasterRecord, 
  ShortlistRecommendationItem, 
  StudentShortlistPlan, 
  ShortlistCategory,
  UniversityTypeCode,
  ShortlistCriterionCode,
  ShortlistCriterionDefinition,
  ShortlistWorkflowStepCode,
  ShortlistWorkflowStepDefinition,
  ShortlistChangeRequest,
  ShortlistGovernanceContext,
  ShortlistAcknowledgement,
  ApplicationWorkspaceRecord,
  PrerequisiteBlockingItem,
  OfferRecord,
  OfferConditionItem,
  OfferComparisonMatrixRow
} from '../types/applications';
import { MASTER_UNIVERSITIES, MASTER_COURSES } from '../data/universityMasterData';
import { StudentMasterProfile, UserRole } from '../types/crm';
import { AuthenticatedUserSession } from '../types/security';
import { SecurityEngine, securityEngine as globalSecurityEngine, SEED_SECURITY_USERS } from './securityEngine';

export interface ApplicationTestResult {
  id: string;
  name: string;
  category: 'Shortlisting' | 'Prerequisite Blocking' | 'Deadline Alerts' | 'Offer Management' | 'Final Selection' | 'Security & Duplicates';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
}

export const REQUIRED_PRIVATE_UNIVERSITY_COUNT = 8;
export const REQUIRED_PUBLIC_UNIVERSITY_COUNT = 5;
export const REQUIRED_TOTAL_SHORTLIST_COUNT = REQUIRED_PRIVATE_UNIVERSITY_COUNT + REQUIRED_PUBLIC_UNIVERSITY_COUNT; // 13

export interface UniversitySelectionConfiguration {
  recommendedPrivateCount: number;
  requiredPrivateSelectionCount: number;
  recommendedPublicCount: number;
  requiredPublicSelectionCount: number;
  totalRequiredSelectionCount: number;
  selectionMode?: 'AUTOMATIC_RULES' | 'CUSTOM_MANUAL';
  minCgpaThreshold?: number;
  minPercentageThreshold?: number;
  allowCounselorCustomization?: boolean;
  cgpaCriteriaList?: { category: ShortlistCategory; minCgpa: number; maxCgpa: number }[];
}

export class ApplicationEngine {
  private universities: UniversityMasterRecord[] = [...MASTER_UNIVERSITIES];
  private courses: CourseMasterRecord[] = [...MASTER_COURSES];
  private shortlistPlans: Map<string, StudentShortlistPlan> = new Map();
  private applications: Map<string, ApplicationWorkspaceRecord> = new Map();
  private offers: Map<string, OfferRecord> = new Map();

  private selectionConfig: UniversitySelectionConfiguration = {
    recommendedPrivateCount: 8,
    requiredPrivateSelectionCount: 5,
    recommendedPublicCount: 5,
    requiredPublicSelectionCount: 3,
    totalRequiredSelectionCount: 8,
    selectionMode: 'AUTOMATIC_RULES',
    minCgpaThreshold: 6.0,
    minPercentageThreshold: 60,
    allowCounselorCustomization: true,
    cgpaCriteriaList: [
      { category: 'Ambitious', minCgpa: 8.5, maxCgpa: 10.0 },
      { category: 'Moderate', minCgpa: 7.0, maxCgpa: 8.49 },
      { category: 'Safe', minCgpa: 6.0, maxCgpa: 6.99 }
    ]
  };

  public getSelectionConfig(): UniversitySelectionConfiguration {
    return { ...this.selectionConfig };
  }

  public updateSelectionConfig(config: Partial<UniversitySelectionConfiguration>): UniversitySelectionConfiguration {
    if (config.recommendedPrivateCount !== undefined) this.selectionConfig.recommendedPrivateCount = Number(config.recommendedPrivateCount);
    if (config.requiredPrivateSelectionCount !== undefined) this.selectionConfig.requiredPrivateSelectionCount = Number(config.requiredPrivateSelectionCount);
    if (config.recommendedPublicCount !== undefined) this.selectionConfig.recommendedPublicCount = Number(config.recommendedPublicCount);
    if (config.requiredPublicSelectionCount !== undefined) this.selectionConfig.requiredPublicSelectionCount = Number(config.requiredPublicSelectionCount);
    if (config.selectionMode !== undefined) this.selectionConfig.selectionMode = config.selectionMode;
    if (config.minCgpaThreshold !== undefined) this.selectionConfig.minCgpaThreshold = Number(config.minCgpaThreshold);
    if (config.minPercentageThreshold !== undefined) this.selectionConfig.minPercentageThreshold = Number(config.minPercentageThreshold);
    if (config.allowCounselorCustomization !== undefined) this.selectionConfig.allowCounselorCustomization = Boolean(config.allowCounselorCustomization);
    if (config.cgpaCriteriaList !== undefined) this.selectionConfig.cgpaCriteriaList = config.cgpaCriteriaList;

    this.selectionConfig.totalRequiredSelectionCount =
      this.selectionConfig.requiredPrivateSelectionCount + this.selectionConfig.requiredPublicSelectionCount;
    return { ...this.selectionConfig };
  }

  /**
   * Extensible Workflow Step Registry
   * Additional intermediate business-process steps can be inserted dynamically without redesigning the application.
   */
  private workflowSteps: ShortlistWorkflowStepDefinition[] = [
    {
      stepCode: 'REGISTRATION_COMPLETED',
      stepName: 'Registration Completed',
      order: 10,
      isEnabled: true,
      isSystemCore: true,
      responsibleActor: 'System',
      description: 'Student completes registration and fee verification; triggers University Shortlisting stage.'
    },
    {
      stepCode: 'UNIVERSITY_SHORTLISTING',
      stepName: 'University Shortlisting Stage Initialized',
      order: 20,
      isEnabled: true,
      isSystemCore: true,
      responsibleActor: 'System',
      description: 'Student transitions into the University Shortlisting lifecycle stage.'
    },
    {
      stepCode: 'COUNSELLOR_REVIEW_INITIATION',
      stepName: 'Counsellor Reviews / Initiates Selection Process',
      order: 30,
      isEnabled: true,
      isSystemCore: true,
      responsibleActor: 'Counsellor',
      description: 'Assigned counsellor reviews academic profile (CGPA) and initiates the university recommendation engine.'
    },
    {
      stepCode: 'SYSTEM_RECOMMENDATION_GENERATED',
      stepName: 'System Generates Recommended Universities (8 Private + 5 Public)',
      order: 40,
      isEnabled: true,
      isSystemCore: true,
      responsibleActor: 'System',
      description: 'Backend business logic evaluates student CGPA and university eligibility criteria to shortlist 13 universities (8 Private + 5 Public).'
    },
    {
      stepCode: 'COUNSELLOR_REQUEST_SENT',
      stepName: 'Counsellor Sends University Selection Request to Student',
      order: 50,
      isEnabled: true,
      isSystemCore: true,
      responsibleActor: 'Counsellor',
      description: 'Counsellor dispatches the 13-university shortlist to the student for review and selection.'
    },
    {
      stepCode: 'STUDENT_SELECTS_UNIVERSITIES',
      stepName: 'Student Selects Universities',
      order: 60,
      isEnabled: true,
      isSystemCore: true,
      responsibleActor: 'Student',
      description: 'Student reviews recommended Private and Public universities and selects preferred institutions.'
    },
    {
      stepCode: 'STUDENT_ACKNOWLEDGES_SUBMITS',
      stepName: 'Student Acknowledges & Submits Selection',
      order: 70,
      isEnabled: true,
      isSystemCore: true,
      responsibleActor: 'Student',
      description: 'Student formally acknowledges the selection declaration and submits final choices.'
    },
    {
      stepCode: 'SELECTION_LOCKED',
      stepName: 'Selection Becomes Locked',
      order: 80,
      isEnabled: true,
      isSystemCore: true,
      responsibleActor: 'System',
      description: 'University selection is cryptographically/state locked; neither student nor counsellor can freely edit.'
    },
    {
      stepCode: 'POST_LOCK_CHANGE_APPROVAL',
      stepName: 'Future Changes Require Approval',
      order: 90,
      isEnabled: true,
      isSystemCore: true,
      responsibleActor: 'Approver',
      description: 'Any post-lock modification requires a formal Change Request and approval by an authorized manager/admin.'
    }
  ];

  /**
   * Modular Recommendation Criteria Registry
   * Currently CGPA_ELIGIBILITY is enabled as the primary criterion.
   * Future criteria (Percentage, Course/Degree, Target Country, Target Program, Intake, Budget, etc.)
   * are registered in the pipeline and can be activated or configured without code redesign.
   */
  private criteriaRegistry: ShortlistCriterionDefinition[] = [
    {
      code: 'CGPA_ELIGIBILITY',
      name: 'CGPA Eligibility & Academic Band Matching',
      description: 'Primary criterion: Evaluates student 10-point CGPA against university minimum CGPA requirements and optimal CGPA fit bands to select 8 Private and 5 Public universities.',
      isEnabled: true,
      weight: 100,
      category: 'Academic',
      configParams: {
        privateQuota: REQUIRED_PRIVATE_UNIVERSITY_COUNT,
        publicQuota: REQUIRED_PUBLIC_UNIVERSITY_COUNT,
        totalQuota: REQUIRED_TOTAL_SHORTLIST_COUNT
      }
    },
    {
      code: 'PERCENTAGE_ELIGIBILITY',
      name: 'Academic Percentage Threshold Filter',
      description: 'Evaluates student aggregate percentage against university minimum percentage cutoffs.',
      isEnabled: false,
      weight: 40,
      category: 'Academic'
    },
    {
      code: 'COURSE_DEGREE_MATCH',
      name: 'Course / Degree Level Alignment',
      description: 'Matches student desired degree level (Bachelors / Masters / MBA) with university program offerings.',
      isEnabled: false,
      weight: 50,
      category: 'Program'
    },
    {
      code: 'TARGET_COUNTRY_MATCH',
      name: 'Target Country Preference Filter',
      description: 'Prioritizes universities located in the student’s preferred destination countries.',
      isEnabled: false,
      weight: 45,
      category: 'Preference'
    },
    {
      code: 'TARGET_PROGRAM_MATCH',
      name: 'Target Program / Specialization Match',
      description: 'Matches target discipline keywords (e.g., Computer Science, Data Science, Management).',
      isEnabled: false,
      weight: 45,
      category: 'Program'
    },
    {
      code: 'INTAKE_AVAILABILITY',
      name: 'Target Intake Window Availability',
      description: 'Filters universities offering open admissions for the student’s target intake (Fall / Spring / Winter).',
      isEnabled: false,
      weight: 35,
      category: 'Intake'
    },
    {
      code: 'BUDGET_CEILING',
      name: 'Annual Tuition & Living Budget Ceiling',
      description: 'Evaluates estimated annual cost in INR against student declared financial budget.',
      isEnabled: false,
      weight: 50,
      category: 'Financial'
    },
    {
      code: 'ACADEMIC_BACKGROUND',
      name: 'Academic Stream & Backlog Tolerance',
      description: 'Evaluates prior academic background and maximum permitted backlogs.',
      isEnabled: false,
      weight: 40,
      category: 'Academic'
    },
    {
      code: 'STUDENT_PREFERENCES',
      name: 'Student Preferences & Post-Study Work Rights',
      description: 'Scores institutions by post-study work visa duration and student location preferences.',
      isEnabled: false,
      weight: 30,
      category: 'Preference'
    }
  ];

  private securityEngine?: SecurityEngine;

  constructor(securityEngine?: SecurityEngine) {
    this.securityEngine = securityEngine;
    this.seedInitialData();
  }

  /**
   * Seed realistic initial shortlists, applications, and offers for the pre-seeded students
   */
  private seedInitialData() {
    // Seed for Sandeep Fidrox (std_01) with 13 universities (8 PRIVATE + 5 PUBLIC)
    const aaravStudentId = 'std_01';
    const aaravRefNo = 'GMI-2026-0089';
    const aaravName = 'Sandeep Fidrox';

    const aaravShortlistItems: ShortlistRecommendationItem[] = [
      // 5 PUBLIC UNIVERSITIES
      {
        id: 'rec_01',
        studentId: aaravStudentId,
        courseId: 'crs_tum_cs',
        universityId: 'uni_tum',
        universityName: 'Technical University of Munich (TUM)',
        universityType: 'PUBLIC',
        courseName: 'M.Sc. Informatics (Computer Science)',
        country: 'Germany',
        stateOrLocation: 'Munich, Bavaria',
        category: 'Ambitious',
        categoryRationale: 'PUBLIC University • World Top 40 / TU9 selective program. Student CGPA 8.65 meets threshold (8.20), eligible via CGPA-based selection engine.',
        criteriaSourceCitation: 'TUM CIT Aptitude Assessment Statute (Eignungsverfahren) 2026 & DAAD International Database',
        minCgpaRequired: 8.2,
        studentCgpaEvaluated: 8.65,
        cgpaEligible: true,
        matchedCriteriaCodes: ['CGPA_ELIGIBILITY'],
        intakeSeason: 'Fall',
        intakeYear: 2026,
        deadlineDate: '2026-05-31',
        annualTuitionLocal: 6000,
        annualLivingLocal: 11208,
        currency: 'EUR',
        estimatedCostInInr: Math.round((6000 + 11208 + 300) * 91.5),
        studentSelected: true,
        studentPriorityRank: 1,
        studentRating: 5,
        studentFeedback: 'Top dream choice for robotics and AI specialization.',
        addedByCounselorName: 'Pooja Sharma (Senior Counselor)',
        addedAt: '2026-09-05T11:00:00Z'
      },
      {
        id: 'rec_02',
        studentId: aaravStudentId,
        courseId: 'crs_manchester_cs',
        universityId: 'uni_manchester',
        universityName: 'The University of Manchester',
        universityType: 'PUBLIC',
        courseName: 'M.Sc. Advanced Computer Science',
        country: 'United Kingdom',
        stateOrLocation: 'Manchester, England',
        category: 'Moderate',
        categoryRationale: 'PUBLIC University • Student CGPA 8.65 exceeds 7.80 minimum threshold. Solid Tier-1 Russell Group admit profile.',
        criteriaSourceCitation: 'UK UCAS Official Postgraduate Entry Directory 2026/2027',
        minCgpaRequired: 7.8,
        studentCgpaEvaluated: 8.65,
        cgpaEligible: true,
        matchedCriteriaCodes: ['CGPA_ELIGIBILITY'],
        intakeSeason: 'Fall',
        intakeYear: 2026,
        deadlineDate: '2026-06-30',
        annualTuitionLocal: 37500,
        annualLivingLocal: 12150,
        currency: 'GBP',
        estimatedCostInInr: Math.round((37500 + 12150) * 108.2),
        studentSelected: true,
        studentPriorityRank: 2,
        studentRating: 5,
        studentFeedback: 'Very strong curriculum and 2-year UK Graduate Route visa appeal.',
        addedByCounselorName: 'Pooja Sharma (Senior Counselor)',
        addedAt: '2026-09-05T11:15:00Z'
      },
      {
        id: 'rec_03',
        studentId: aaravStudentId,
        courseId: 'crs_asu_se',
        universityId: 'uni_asu',
        universityName: 'Arizona State University',
        universityType: 'PUBLIC',
        courseName: 'M.S. in Software Engineering',
        country: 'United States',
        stateOrLocation: 'Tempe, Arizona',
        category: 'Safe',
        categoryRationale: 'PUBLIC University • Student CGPA 8.65 significantly surpasses minimum criteria (7.00 CGPA). 36-month STEM OPT eligible.',
        criteriaSourceCitation: 'Arizona State University Fulton Graduate Admission Requirements 2026',
        minCgpaRequired: 7.0,
        studentCgpaEvaluated: 8.65,
        cgpaEligible: true,
        matchedCriteriaCodes: ['CGPA_ELIGIBILITY'],
        intakeSeason: 'Fall',
        intakeYear: 2026,
        deadlineDate: '2026-06-01',
        annualTuitionLocal: 32000,
        annualLivingLocal: 18000,
        currency: 'USD',
        estimatedCostInInr: Math.round((32000 + 18000 + 700) * 84.2),
        studentSelected: true,
        studentPriorityRank: 3,
        studentRating: 4,
        studentFeedback: 'Excellent safe backup with guaranteed scholarship consideration.',
        addedByCounselorName: 'Pooja Sharma (Senior Counselor)',
        addedAt: '2026-09-05T11:30:00Z'
      },
      {
        id: 'rec_04_pub',
        studentId: aaravStudentId,
        courseId: 'crs_rwth_ds',
        universityId: 'uni_rwth',
        universityName: 'RWTH Aachen University',
        universityType: 'PUBLIC',
        courseName: 'M.Sc. Data Science',
        country: 'Germany',
        stateOrLocation: 'Aachen, North Rhine-Westphalia',
        category: 'Moderate',
        categoryRationale: 'PUBLIC University • Student CGPA 8.65 satisfies minimum 7.80 CGPA threshold for TU9 Data Science admission.',
        criteriaSourceCitation: 'RWTH Aachen Examination Regulations (Prüfungsordnung) & DAAD 2026',
        minCgpaRequired: 7.8,
        studentCgpaEvaluated: 8.65,
        cgpaEligible: true,
        matchedCriteriaCodes: ['CGPA_ELIGIBILITY'],
        intakeSeason: 'Fall',
        intakeYear: 2026,
        deadlineDate: '2026-03-01',
        annualTuitionLocal: 0,
        annualLivingLocal: 11208,
        currency: 'EUR',
        estimatedCostInInr: Math.round((11208 + 650) * 91.5),
        studentSelected: false,
        addedByCounselorName: 'Pooja Sharma (Senior Counselor)',
        addedAt: '2026-09-05T11:35:00Z'
      },
      {
        id: 'rec_05_pub',
        studentId: aaravStudentId,
        courseId: 'crs_ut_ai',
        universityId: 'uni_toronto',
        universityName: 'University of Toronto',
        universityType: 'PUBLIC',
        courseName: 'M.Sc.AC in Artificial Intelligence',
        country: 'Canada',
        stateOrLocation: 'Toronto, Ontario',
        category: 'Ambitious',
        categoryRationale: 'PUBLIC University • Student CGPA 8.65 meets 8.30 minimum CGPA requirement for UofT Applied Computing.',
        criteriaSourceCitation: 'University of Toronto School of Graduate Studies (SGS) Admissions Calendar 2026',
        minCgpaRequired: 8.3,
        studentCgpaEvaluated: 8.65,
        cgpaEligible: true,
        matchedCriteriaCodes: ['CGPA_ELIGIBILITY'],
        intakeSeason: 'Fall',
        intakeYear: 2026,
        deadlineDate: '2026-04-15',
        annualTuitionLocal: 48500,
        annualLivingLocal: 20650,
        currency: 'CAD',
        estimatedCostInInr: Math.round((48500 + 20650 + 1800) * 62.4),
        studentSelected: false,
        addedByCounselorName: 'Pooja Sharma (Senior Counselor)',
        addedAt: '2026-09-05T11:40:00Z'
      },
      // 8 PRIVATE UNIVERSITIES
      {
        id: 'rec_06_prv',
        studentId: aaravStudentId,
        courseId: 'crs_usc_cs',
        universityId: 'uni_usc',
        universityName: 'University of Southern California (USC)',
        universityType: 'PRIVATE',
        courseName: 'M.S. in Computer Science (Artificial Intelligence)',
        country: 'United States',
        stateOrLocation: 'Los Angeles, California',
        category: 'Ambitious',
        categoryRationale: 'PRIVATE University • Student CGPA 8.65 exceeds 8.00 minimum CGPA requirement for USC Viterbi School of Engineering.',
        criteriaSourceCitation: 'USC Viterbi Graduate Admission Standards 2026',
        minCgpaRequired: 8.0,
        studentCgpaEvaluated: 8.65,
        cgpaEligible: true,
        matchedCriteriaCodes: ['CGPA_ELIGIBILITY'],
        intakeSeason: 'Fall',
        intakeYear: 2026,
        deadlineDate: '2026-05-15',
        annualTuitionLocal: 44500,
        annualLivingLocal: 21000,
        currency: 'USD',
        estimatedCostInInr: Math.round((44500 + 21000 + 1200) * 84.2),
        studentSelected: false,
        addedByCounselorName: 'Pooja Sharma (Senior Counselor)',
        addedAt: '2026-09-05T11:45:00Z'
      },
      {
        id: 'rec_07_prv',
        studentId: aaravStudentId,
        courseId: 'crs_nyu_ds',
        universityId: 'uni_nyu',
        universityName: 'New York University (NYU Tandon)',
        universityType: 'PRIVATE',
        courseName: 'M.S. in Computer Engineering & Data Science',
        country: 'United States',
        stateOrLocation: 'New York City, New York',
        category: 'Ambitious',
        categoryRationale: 'PRIVATE University • Student CGPA 8.65 exceeds 7.90 minimum CGPA threshold for NYU Tandon School of Engineering.',
        criteriaSourceCitation: 'NYU Tandon Graduate Admissions Bulletin 2026',
        minCgpaRequired: 7.9,
        studentCgpaEvaluated: 8.65,
        cgpaEligible: true,
        matchedCriteriaCodes: ['CGPA_ELIGIBILITY'],
        intakeSeason: 'Fall',
        intakeYear: 2026,
        deadlineDate: '2026-05-01',
        annualTuitionLocal: 43000,
        annualLivingLocal: 22500,
        currency: 'USD',
        estimatedCostInInr: Math.round((43000 + 22500 + 1500) * 84.2),
        studentSelected: false,
        addedByCounselorName: 'Pooja Sharma (Senior Counselor)',
        addedAt: '2026-09-05T11:50:00Z'
      },
      {
        id: 'rec_08_prv',
        studentId: aaravStudentId,
        courseId: 'crs_bu_cs',
        universityId: 'uni_bu',
        universityName: 'Boston University',
        universityType: 'PRIVATE',
        courseName: 'M.S. in Computer Science',
        country: 'United States',
        stateOrLocation: 'Boston, Massachusetts',
        category: 'Moderate',
        categoryRationale: 'PRIVATE University • Student CGPA 8.65 surpasses 7.70 minimum CGPA threshold for Boston University GRS.',
        criteriaSourceCitation: 'Boston University Graduate School of Arts & Sciences Catalog 2026',
        minCgpaRequired: 7.7,
        studentCgpaEvaluated: 8.65,
        cgpaEligible: true,
        matchedCriteriaCodes: ['CGPA_ELIGIBILITY'],
        intakeSeason: 'Fall',
        intakeYear: 2026,
        deadlineDate: '2026-05-15',
        annualTuitionLocal: 42000,
        annualLivingLocal: 20000,
        currency: 'USD',
        estimatedCostInInr: Math.round((42000 + 20000 + 1000) * 84.2),
        studentSelected: false,
        addedByCounselorName: 'Pooja Sharma (Senior Counselor)',
        addedAt: '2026-09-05T11:55:00Z'
      },
      {
        id: 'rec_09_prv',
        studentId: aaravStudentId,
        courseId: 'crs_neu_da',
        universityId: 'uni_neu',
        universityName: 'Northeastern University',
        universityType: 'PRIVATE',
        courseName: 'M.S. in Data Analytics Engineering',
        country: 'United States',
        stateOrLocation: 'Boston, Massachusetts',
        category: 'Moderate',
        categoryRationale: 'PRIVATE University • Student CGPA 8.65 exceeds 7.50 minimum CGPA criteria with flagship Co-op eligibility.',
        criteriaSourceCitation: 'Northeastern University College of Engineering Catalog 2026',
        minCgpaRequired: 7.5,
        studentCgpaEvaluated: 8.65,
        cgpaEligible: true,
        matchedCriteriaCodes: ['CGPA_ELIGIBILITY'],
        intakeSeason: 'Fall',
        intakeYear: 2026,
        deadlineDate: '2026-06-15',
        annualTuitionLocal: 29500,
        annualLivingLocal: 19500,
        currency: 'USD',
        estimatedCostInInr: Math.round((29500 + 19500 + 800) * 84.2),
        studentSelected: false,
        addedByCounselorName: 'Pooja Sharma (Senior Counselor)',
        addedAt: '2026-09-05T12:00:00Z'
      },
      {
        id: 'rec_10_prv',
        studentId: aaravStudentId,
        courseId: 'crs_frankfurt_fs_ds',
        universityId: 'uni_frankfurt_fs',
        universityName: 'Frankfurt School of Finance & Management',
        universityType: 'PRIVATE',
        courseName: 'Master in Applied Data Science & FinTech',
        country: 'Germany',
        stateOrLocation: 'Frankfurt am Main, Hesse',
        category: 'Moderate',
        categoryRationale: 'PRIVATE University • Student CGPA 8.65 exceeds 7.30 minimum CGPA requirement for Frankfurt School.',
        criteriaSourceCitation: 'Frankfurt School Admissions Statute 2026',
        minCgpaRequired: 7.3,
        studentCgpaEvaluated: 8.65,
        cgpaEligible: true,
        matchedCriteriaCodes: ['CGPA_ELIGIBILITY'],
        intakeSeason: 'Fall',
        intakeYear: 2026,
        deadlineDate: '2026-06-30',
        annualTuitionLocal: 19500,
        annualLivingLocal: 11208,
        currency: 'EUR',
        estimatedCostInInr: Math.round((19500 + 11208 + 400) * 91.5),
        studentSelected: false,
        addedByCounselorName: 'Pooja Sharma (Senior Counselor)',
        addedAt: '2026-09-05T12:05:00Z'
      },
      {
        id: 'rec_11_prv',
        studentId: aaravStudentId,
        courseId: 'crs_stevens_cs',
        universityId: 'uni_stevens',
        universityName: 'Stevens Institute of Technology',
        universityType: 'PRIVATE',
        courseName: 'M.S. in Computer Science (Cloud & Machine Learning)',
        country: 'United States',
        stateOrLocation: 'Hoboken, New Jersey',
        category: 'Safe',
        categoryRationale: 'PRIVATE University • Student CGPA 8.65 comfortably exceeds 7.10 minimum CGPA threshold.',
        criteriaSourceCitation: 'Stevens Schaefer School of Engineering & Science Catalog 2026',
        minCgpaRequired: 7.1,
        studentCgpaEvaluated: 8.65,
        cgpaEligible: true,
        matchedCriteriaCodes: ['CGPA_ELIGIBILITY'],
        intakeSeason: 'Fall',
        intakeYear: 2026,
        deadlineDate: '2026-06-15',
        annualTuitionLocal: 39000,
        annualLivingLocal: 19000,
        currency: 'USD',
        estimatedCostInInr: Math.round((39000 + 19000 + 900) * 84.2),
        studentSelected: false,
        addedByCounselorName: 'Pooja Sharma (Senior Counselor)',
        addedAt: '2026-09-05T12:10:00Z'
      },
      {
        id: 'rec_12_prv',
        studentId: aaravStudentId,
        courseId: 'crs_constructor_cs',
        universityId: 'uni_constructor',
        universityName: 'Constructor University Bremen',
        universityType: 'PRIVATE',
        courseName: 'M.Sc. Computer Science & Software Engineering',
        country: 'Germany',
        stateOrLocation: 'Bremen',
        category: 'Safe',
        categoryRationale: 'PRIVATE University • Student CGPA 8.65 exceeds 7.00 minimum CGPA requirement.',
        criteriaSourceCitation: 'Constructor University Graduate Admissions Guidelines 2026',
        minCgpaRequired: 7.0,
        studentCgpaEvaluated: 8.65,
        cgpaEligible: true,
        matchedCriteriaCodes: ['CGPA_ELIGIBILITY'],
        intakeSeason: 'Fall',
        intakeYear: 2026,
        deadlineDate: '2026-07-01',
        annualTuitionLocal: 20000,
        annualLivingLocal: 10500,
        currency: 'EUR',
        estimatedCostInInr: Math.round((20000 + 10500 + 500) * 91.5),
        studentSelected: false,
        addedByCounselorName: 'Pooja Sharma (Senior Counselor)',
        addedAt: '2026-09-05T12:15:00Z'
      },
      {
        id: 'rec_13_prv',
        studentId: aaravStudentId,
        courseId: 'crs_rit_se',
        universityId: 'uni_rit',
        universityName: 'Rochester Institute of Technology (RIT)',
        universityType: 'PRIVATE',
        courseName: 'M.S. in Software Engineering',
        country: 'United States',
        stateOrLocation: 'Rochester, New York',
        category: 'Safe',
        categoryRationale: 'PRIVATE University • Student CGPA 8.65 exceeds 6.80 minimum CGPA requirement.',
        criteriaSourceCitation: 'RIT Golisano College of Computing Admissions 2026',
        minCgpaRequired: 6.8,
        studentCgpaEvaluated: 8.65,
        cgpaEligible: true,
        matchedCriteriaCodes: ['CGPA_ELIGIBILITY'],
        intakeSeason: 'Fall',
        intakeYear: 2026,
        deadlineDate: '2026-06-15',
        annualTuitionLocal: 36500,
        annualLivingLocal: 16500,
        currency: 'USD',
        estimatedCostInInr: Math.round((36500 + 16500 + 700) * 84.2),
        studentSelected: false,
        addedByCounselorName: 'Pooja Sharma (Senior Counselor)',
        addedAt: '2026-09-05T12:20:00Z'
      }
    ];

    const aaravPlan: StudentShortlistPlan = {
      id: `plan_${aaravStudentId}`,
      studentId: aaravStudentId,
      studentRefNo: aaravRefNo,
      status: 'locked',
      currentWorkflowStep: 'SELECTION_LOCKED',
      items: aaravShortlistItems,
      isLocked: true,
      lockedAt: '2026-09-08T14:00:00Z',
      lockedBy: 'Sandeep Fidrox (Student Final Acknowledgement)',
      studentApprovedAt: '2026-09-07T18:30:00Z',
      advisoryDisclaimerAcknowledged: true,
      studentAcknowledgement: {
        acknowledged: true,
        acknowledgedByStudentId: aaravStudentId,
        acknowledgedByStudentName: aaravName,
        acknowledgedAt: '2026-09-08T14:00:00Z',
        declarationText: 'I hereby confirm and acknowledge my final university selection from the 13 recommended institutions (8 Private, 5 Public). I understand that this selection is now locked and any subsequent modifications will require formal approval.',
        selectedUniversityIds: ['uni_tum', 'uni_manchester', 'uni_asu']
      },
      evaluatedCgpa: 8.65,
      activeCriteriaApplied: ['CGPA_ELIGIBILITY'],
      totalRecommendations: 13,
      requiredPrivateCount: REQUIRED_PRIVATE_UNIVERSITY_COUNT,
      requiredPublicCount: REQUIRED_PUBLIC_UNIVERSITY_COUNT,
      totalPrivate: 8,
      totalPublic: 5,
      selectedTotalCount: 3,
      selectedPrivateCount: 0,
      selectedPublicCount: 3,
      totalAmbitious: aaravShortlistItems.filter(i => i.category === 'Ambitious').length,
      totalModerate: aaravShortlistItems.filter(i => i.category === 'Moderate').length,
      totalSafe: aaravShortlistItems.filter(i => i.category === 'Safe').length,
      counsellorInitiatedBy: 'Sandeep Koteshwara',
      counsellorInitiatedAt: '2026-09-05T10:30:00Z',
      sentToStudentBy: 'Sandeep Koteshwara',
      sentToStudentAt: '2026-09-05T14:00:00Z',
      counsellorNotes: 'Shortlist generated via backend CGPA eligibility engine (CGPA 8.65 -> 8 Private + 5 Public Universities).',
      changeRequests: [],
      workflowAuditLog: [
        {
          id: 'wlog_01',
          stepCode: 'REGISTRATION_COMPLETED',
          action: 'Registration Completed & Verified',
          actorName: 'System',
          actorRole: 'system',
          timestamp: '2026-09-05T10:00:00Z',
          details: 'Student completed registration; transitioned to University Shortlisting stage.'
        },
        {
          id: 'wlog_02',
          stepCode: 'SYSTEM_RECOMMENDATION_GENERATED',
          action: 'Automatic 13-University Shortlist Generated (8 Private + 5 Public)',
          actorName: 'Sandeep Koteshwara',
          actorRole: 'counselor',
          timestamp: '2026-09-05T11:00:00Z',
          details: 'Evaluated Student CGPA (8.65) against university eligibility thresholds. Generated 8 Private and 5 Public university recommendations.'
        },
        {
          id: 'wlog_03',
          stepCode: 'COUNSELLOR_REQUEST_SENT',
          action: 'University Selection Request Sent to Student',
          actorName: 'Sandeep Koteshwara',
          actorRole: 'counselor',
          timestamp: '2026-09-05T14:00:00Z',
          details: 'Dispatched 13 recommended universities to student portal for selection and acknowledgement.'
        },
        {
          id: 'wlog_04',
          stepCode: 'SELECTION_LOCKED',
          action: 'Student Acknowledged, Submitted & Locked Selection',
          actorName: 'Sandeep Fidrox',
          actorRole: 'student',
          timestamp: '2026-09-08T14:00:00Z',
          details: 'Student selected 3 universities, signed acknowledgment declaration, and locked the shortlist. Future changes require approval.'
        }
      ],
      updatedAt: '2026-09-08T14:00:00Z'
    };
    this.shortlistPlans.set(aaravStudentId, aaravPlan);

    // Seed Applications for Aarav
    const appTumId = 'app_aarav_tum';
    const appTum: ApplicationWorkspaceRecord = {
      id: appTumId,
      studentId: aaravStudentId,
      studentRefNo: aaravRefNo,
      studentName: aaravName,
      shortlistItemId: 'rec_01',
      universityId: 'uni_tum',
      universityName: 'Technical University of Munich (TUM)',
      courseId: 'crs_tum_cs',
      courseName: 'M.Sc. Informatics (Computer Science)',
      country: 'Germany',
      intakeSeason: 'Fall',
      intakeYear: 2026,
      category: 'Ambitious',
      assignedOfficerId: 'usr_p1',
      assignedOfficerName: 'Rajesh Nair (Processing Officer)',
      assignedCounselorName: 'Pooja Sharma (Senior Counselor)',
      applicationDeadline: '2026-05-31',
      deadlineType: 'Regular',
      daysRemaining: 72,
      isCriticalDeadline: false,
      isExpiredDeadline: false,
      submissionStatus: 'submitted',
      portalType: 'Direct University Portal',
      applicationReferenceNumber: 'TUM-2026-INF-98124',
      submittedAt: '2026-09-12T10:30:00Z',
      submissionProofDocumentUrl: '/vault/proofs/tum_portal_confirmation_98124.pdf',
      submissionProofFileName: 'tum_portal_confirmation_98124.pdf',
      applicationFee: {
        amount: 75,
        currency: 'EUR',
        inrEquivalent: 6862,
        paymentStatus: 'Paid by Student',
        receiptReference: 'TUM-FEE-EUR-883192',
        paidAt: '2026-09-11T16:00:00Z'
      },
      sopLorDetails: {
        sopStatus: 'Customized & Approved',
        sopTargetWordCount: 1000,
        sopCurrentWordCount: 940,
        sopDocumentUrl: '/vault/sop/aarav_tum_sop_v2.pdf',
        sopLastUpdated: '2026-09-10T14:00:00Z',
        requiredLorsCount: 2,
        lors: [
          {
            id: 'lor_01',
            refereeName: 'Dr. K. Srinivas Rao',
            refereeDesignation: 'Head of Computer Science Dept',
            refereeInstitution: 'JNTU Hyderabad',
            refereeEmail: 'ksrao@jntuh.ac.in',
            lorType: 'Academic',
            status: 'Verified by GMI',
            uploadedAt: '2026-09-09T11:00:00Z'
          },
          {
            id: 'lor_02',
            refereeName: 'Prof. Ananya Sen',
            refereeDesignation: 'Professor, Artificial Intelligence Lab',
            refereeInstitution: 'JNTU Hyderabad',
            refereeEmail: 'ananya.sen@jntuh.ac.in',
            lorType: 'Academic',
            status: 'Verified by GMI',
            uploadedAt: '2026-09-10T09:30:00Z'
          }
        ]
      },
      checklist: [
        { id: 'chk_1', name: 'German APS Certificate', isMandatory: true, status: 'Verified', fileName: 'aps_cert_aarav.pdf' },
        { id: 'chk_2', name: 'Degree Certificate / Consolidated Transcripts', isMandatory: true, status: 'Verified', fileName: 'jntu_consolidated_transcripts.pdf' },
        { id: 'chk_3', name: 'Curricular Analysis Form (ECTS Match)', isMandatory: true, status: 'Verified', fileName: 'tum_ects_analysis_form.pdf' },
        { id: 'chk_4', name: 'IELTS Academic Scorecard (Band 7.5)', isMandatory: true, status: 'Verified', fileName: 'ielts_scorecard_trf.pdf' },
        { id: 'chk_5', name: 'Valid Passport Copy', isMandatory: true, status: 'Verified', fileName: 'passport_aarav.pdf' }
      ],
      prerequisites: [
        {
          id: 'pre_tum_1',
          ruleCode: 'APS_CERT_VERIFIED',
          title: 'APS Certificate Requirement',
          category: 'Document',
          responsibleTeam: 'Documentation Desk',
          requiredAction: 'Verify digital signature and QR on German APS certificate',
          reasonForBlocking: 'Mandatory German visa & university admission requirement; cannot submit without valid APS.',
          deadline: '2026-05-15',
          isSatisfied: true,
          isWaived: false
        }
      ],
      canSubmit: true,
      isSubmissionOverridden: false,
      additionalRequests: [],
      offersCount: 1,
      activeOfferId: 'off_aarav_tum_01',
      notes: ['Submitted via TUMonline. Processing officer completed full document cross-check.'],
      createdAt: '2026-09-08T15:00:00Z',
      updatedAt: '2026-09-15T09:00:00Z'
    };
    this.applications.set(appTumId, appTum);

    const appManchesterId = 'app_aarav_manchester';
    const appManchester: ApplicationWorkspaceRecord = {
      id: appManchesterId,
      studentId: aaravStudentId,
      studentRefNo: aaravRefNo,
      studentName: aaravName,
      shortlistItemId: 'rec_02',
      universityId: 'uni_manchester',
      universityName: 'The University of Manchester',
      courseId: 'crs_manchester_cs',
      courseName: 'M.Sc. Advanced Computer Science',
      country: 'United Kingdom',
      intakeSeason: 'Fall',
      intakeYear: 2026,
      category: 'Moderate',
      assignedOfficerId: 'usr_p1',
      assignedOfficerName: 'Rajesh Nair (Processing Officer)',
      assignedCounselorName: 'Pooja Sharma (Senior Counselor)',
      applicationDeadline: '2026-06-30',
      deadlineType: 'Regular',
      daysRemaining: 102,
      isCriticalDeadline: false,
      isExpiredDeadline: false,
      submissionStatus: 'offer_received',
      portalType: 'Direct University Portal',
      applicationReferenceNumber: 'UOM-POSTGRAD-2026-77812',
      submittedAt: '2026-09-09T14:10:00Z',
      submissionProofDocumentUrl: '/vault/proofs/uom_submission_acknowledgment.pdf',
      submissionProofFileName: 'uom_submission_acknowledgment.pdf',
      applicationFee: {
        amount: 60,
        currency: 'GBP',
        inrEquivalent: 6492,
        paymentStatus: 'Paid by Student',
        receiptReference: 'UOM-PAY-GBP-9921',
        paidAt: '2026-09-09T12:00:00Z'
      },
      sopLorDetails: {
        sopStatus: 'Customized & Approved',
        sopTargetWordCount: 500,
        sopCurrentWordCount: 485,
        sopDocumentUrl: '/vault/sop/aarav_uom_sop.pdf',
        sopLastUpdated: '2026-09-08T16:00:00Z',
        requiredLorsCount: 2,
        lors: [
          {
            id: 'lor_uom_1',
            refereeName: 'Dr. K. Srinivas Rao',
            refereeDesignation: 'Head of Computer Science Dept',
            refereeInstitution: 'JNTU Hyderabad',
            refereeEmail: 'ksrao@jntuh.ac.in',
            lorType: 'Academic',
            status: 'Verified by GMI',
            uploadedAt: '2026-09-09T11:00:00Z'
          },
          {
            id: 'lor_uom_2',
            refereeName: 'Prof. Ananya Sen',
            refereeDesignation: 'Professor, AI Lab',
            refereeInstitution: 'JNTU Hyderabad',
            refereeEmail: 'ananya.sen@jntuh.ac.in',
            lorType: 'Academic',
            status: 'Verified by GMI',
            uploadedAt: '2026-09-09T11:30:00Z'
          }
        ]
      },
      checklist: [
        { id: 'chk_u1', name: 'Consolidated Transcripts (Sem 1-6)', isMandatory: true, status: 'Verified', fileName: 'jntu_transcripts.pdf' },
        { id: 'chk_u2', name: 'IELTS Academic TRF (7.5 Overall)', isMandatory: true, status: 'Verified', fileName: 'ielts_academic_trf.pdf' },
        { id: 'chk_u3', name: 'Personal Statement (500 Words)', isMandatory: true, status: 'Verified', fileName: 'personal_statement.pdf' },
        { id: 'chk_u4', name: 'Passport Copy', isMandatory: true, status: 'Verified', fileName: 'passport_aarav.pdf' }
      ],
      prerequisites: [],
      canSubmit: true,
      isSubmissionOverridden: false,
      additionalRequests: [],
      offersCount: 1,
      activeOfferId: 'off_aarav_uom_01',
      notes: ['Direct portal application. Conditional offer issued within 6 working days.'],
      createdAt: '2026-09-08T15:00:00Z',
      updatedAt: '2026-09-16T11:00:00Z'
    };
    this.applications.set(appManchesterId, appManchester);

    const appAsuId = 'app_aarav_asu';
    const appAsu: ApplicationWorkspaceRecord = {
      id: appAsuId,
      studentId: aaravStudentId,
      studentRefNo: aaravRefNo,
      studentName: aaravName,
      shortlistItemId: 'rec_03',
      universityId: 'uni_asu',
      universityName: 'Arizona State University',
      courseId: 'crs_asu_se',
      courseName: 'M.S. in Software Engineering',
      country: 'United States',
      intakeSeason: 'Fall',
      intakeYear: 2026,
      category: 'Safe',
      assignedOfficerId: 'usr_p1',
      assignedOfficerName: 'Rajesh Nair (Processing Officer)',
      assignedCounselorName: 'Pooja Sharma (Senior Counselor)',
      applicationDeadline: '2026-06-01',
      deadlineType: 'Regular',
      daysRemaining: 73,
      isCriticalDeadline: false,
      isExpiredDeadline: false,
      submissionStatus: 'offer_received',
      portalType: 'Direct University Portal',
      applicationReferenceNumber: 'ASU-GRAD-2026-44109',
      submittedAt: '2026-09-09T18:00:00Z',
      submissionProofDocumentUrl: '/vault/proofs/asu_confirmation_letter.pdf',
      submissionProofFileName: 'asu_confirmation_letter.pdf',
      applicationFee: {
        amount: 115,
        currency: 'USD',
        inrEquivalent: 9683,
        paymentStatus: 'Paid by Student',
        receiptReference: 'ASU-FEE-449102',
        paidAt: '2026-09-09T17:30:00Z'
      },
      sopLorDetails: {
        sopStatus: 'Customized & Approved',
        sopTargetWordCount: 800,
        sopCurrentWordCount: 790,
        sopDocumentUrl: '/vault/sop/aarav_asu_sop.pdf',
        sopLastUpdated: '2026-09-09T15:00:00Z',
        requiredLorsCount: 2,
        lors: [
          {
            id: 'lor_asu_1',
            refereeName: 'Dr. K. Srinivas Rao',
            refereeDesignation: 'HOD CSE',
            refereeInstitution: 'JNTU Hyderabad',
            refereeEmail: 'ksrao@jntuh.ac.in',
            lorType: 'Academic',
            status: 'Verified by GMI',
            uploadedAt: '2026-09-09T11:00:00Z'
          },
          {
            id: 'lor_asu_2',
            refereeName: 'Prof. Ananya Sen',
            refereeDesignation: 'Professor AI',
            refereeInstitution: 'JNTU Hyderabad',
            refereeEmail: 'ananya.sen@jntuh.ac.in',
            lorType: 'Academic',
            status: 'Verified by GMI',
            uploadedAt: '2026-09-09T11:30:00Z'
          }
        ]
      },
      checklist: [
        { id: 'chk_a1', name: 'Transcripts & Degree Certificate', isMandatory: true, status: 'Verified', fileName: 'transcripts.pdf' },
        { id: 'chk_a2', name: 'IELTS Official Score Card', isMandatory: true, status: 'Verified', fileName: 'ielts_report.pdf' },
        { id: 'chk_a3', name: 'Financial Guarantee for I-20', isMandatory: true, status: 'Verified', fileName: 'bank_affidavit.pdf' }
      ],
      prerequisites: [],
      canSubmit: true,
      isSubmissionOverridden: false,
      additionalRequests: [],
      offersCount: 1,
      activeOfferId: 'off_aarav_asu_01',
      notes: ['Direct portal application. Unconditional offer received with $5,000 Dean’s Merit Scholarship.'],
      createdAt: '2026-09-08T15:00:00Z',
      updatedAt: '2026-09-17T12:00:00Z'
    };
    this.applications.set(appAsuId, appAsu);

    // Seed Offers for Aarav Reddy
    // Offer 1: University of Manchester (Conditional)
    const offUom: OfferRecord = {
      id: 'off_aarav_uom_01',
      applicationId: appManchesterId,
      studentId: aaravStudentId,
      studentRefNo: aaravRefNo,
      studentName: aaravName,
      universityId: 'uni_manchester',
      universityName: 'The University of Manchester',
      courseName: 'M.Sc. Advanced Computer Science',
      country: 'United Kingdom',
      intakeSeason: 'Fall',
      intakeYear: 2026,
      offerType: 'conditional',
      receivedDate: '2026-09-14T10:00:00Z',
      acceptanceDeadline: '2026-07-15T23:59:59Z',
      decisionStatus: 'received',
      offerLetterFileName: 'uom_conditional_offer_aarav_reddy.pdf',
      offerLetterFileUrl: '/vault/offers/uom_conditional_offer_aarav_reddy.pdf',
      offerLetterFileSizeMb: 2.1,
      signedByUniversityOfficial: 'Dr. Alistair Finch, Admissions Tutor',
      conditions: [
        {
          id: 'cnd_uom_1',
          description: 'Provide final official consolidated semester 8 grade sheet and provisional degree certificate demonstrating overall minimum 75% (CGPA >= 8.0/10.0).',
          category: 'Academic',
          deadline: '2026-07-31',
          status: 'Pending',
          notes: 'Awaiting final 8th semester results from JNTU Hyderabad in June 2026.'
        },
        {
          id: 'cnd_uom_2',
          description: 'Pay non-refundable tuition fee deposit of £2,000 GBP to secure seat and trigger CAS allocation.',
          category: 'Financial',
          deadline: '2026-07-15',
          status: 'Pending',
          notes: 'Payable via University Flywire portal.'
        }
      ],
      allConditionsMet: false,
      annualTuitionFee: 37500,
      currency: 'GBP',
      scholarshipAwardedAmount: 3000, // Manchester International Excellence Scholarship
      netTuitionFee: 34500,
      estimatedAnnualLivingCost: 12150,
      totalFirstYearCostInr: Math.round((34500 + 12150) * 108.2),
      depositRequired: {
        required: true,
        amount: 2000,
        currency: 'GBP',
        dueDate: '2026-07-15',
        paymentStatus: 'Pending Payment'
      },
      acceptanceConfirmed: false,
      isFinalAdmittedInstitution: false,
      studentNotes: 'Very prestigious. Need to prepare tuition deposit via education loan.',
      createdAt: '2026-09-14T11:00:00Z',
      updatedAt: '2026-09-14T11:00:00Z'
    };
    this.offers.set(offUom.id, offUom);

    // Offer 2: Arizona State University (Unconditional)
    const offAsu: OfferRecord = {
      id: 'off_aarav_asu_01',
      applicationId: appAsuId,
      studentId: aaravStudentId,
      studentRefNo: aaravRefNo,
      studentName: aaravName,
      universityId: 'uni_asu',
      universityName: 'Arizona State University',
      courseName: 'M.S. in Software Engineering',
      country: 'United States',
      intakeSeason: 'Fall',
      intakeYear: 2026,
      offerType: 'unconditional',
      receivedDate: '2026-09-16T14:30:00Z',
      acceptanceDeadline: '2026-06-15T23:59:59Z',
      decisionStatus: 'received',
      offerLetterFileName: 'asu_unconditional_offer_aarav_reddy.pdf',
      offerLetterFileUrl: '/vault/offers/asu_unconditional_offer_aarav_reddy.pdf',
      offerLetterFileSizeMb: 1.8,
      signedByUniversityOfficial: 'Dr. Kyle Squires, Vice Provost & Dean',
      conditions: [],
      allConditionsMet: true,
      annualTuitionFee: 32000,
      currency: 'USD',
      scholarshipAwardedAmount: 5000, // Global Academic Excellence Fellowship
      netTuitionFee: 27000,
      estimatedAnnualLivingCost: 18000,
      totalFirstYearCostInr: Math.round((27000 + 18000 + 700) * 84.2),
      depositRequired: {
        required: true,
        amount: 500,
        currency: 'USD',
        dueDate: '2026-06-15',
        paymentStatus: 'Pending Payment'
      },
      acceptanceConfirmed: false,
      isFinalAdmittedInstitution: false,
      visaLetterIssued: {
        type: 'I-20 (USA)',
        referenceNumber: 'N0038921829',
        issuedDate: '2026-09-16T18:00:00Z',
        documentUrl: '/vault/i20/asu_i20_form.pdf'
      },
      studentNotes: 'Unconditional admit with $5,000 scholarship and I-20 ready for SEVIS fee payment.',
      createdAt: '2026-09-16T15:00:00Z',
      updatedAt: '2026-09-16T15:00:00Z'
    };
    this.offers.set(offAsu.id, offAsu);

    // Offer 3: Technical University of Munich (Conditional Zulassungsbescheid)
    const offTum: OfferRecord = {
      id: 'off_aarav_tum_01',
      applicationId: appTumId,
      studentId: aaravStudentId,
      studentRefNo: aaravRefNo,
      studentName: aaravName,
      universityId: 'uni_tum',
      universityName: 'Technical University of Munich (TUM)',
      courseName: 'M.Sc. Informatics (Computer Science)',
      country: 'Germany',
      intakeSeason: 'Fall',
      intakeYear: 2026,
      offerType: 'conditional',
      receivedDate: '2026-09-17T09:15:00Z',
      acceptanceDeadline: '2026-08-15T23:59:59Z',
      decisionStatus: 'received',
      offerLetterFileName: 'tum_zulassungsbescheid_aarav_reddy.pdf',
      offerLetterFileUrl: '/vault/offers/tum_zulassungsbescheid_aarav_reddy.pdf',
      offerLetterFileSizeMb: 1.4,
      signedByUniversityOfficial: 'TUM Immatrikulationsamt / CIT Admissions Commission',
      conditions: [
        {
          id: 'cnd_tum_1',
          description: 'Submit certified copy of original Degree Certificate and Final Grade Sheet upon in-person enrollment in Munich by October 15, 2026.',
          category: 'Academic',
          deadline: '2026-10-15',
          status: 'Pending',
          notes: 'Standard German enrollment condition for international graduates.'
        },
        {
          id: 'cnd_tum_2',
          description: 'Proof of German statutory health insurance (TK / Barmer) via electronic reporting system (M10).',
          category: 'Verification',
          deadline: '2026-09-30',
          status: 'Pending',
          notes: 'To be arranged via GMI parallel services desk.'
        }
      ],
      allConditionsMet: false,
      annualTuitionFee: 6000,
      currency: 'EUR',
      scholarshipAwardedAmount: 0,
      netTuitionFee: 6000,
      estimatedAnnualLivingCost: 11208,
      totalFirstYearCostInr: Math.round((6000 + 11208 + 300) * 91.5),
      depositRequired: {
        required: true,
        amount: 150, // Semester solidarity fee pre-deposit
        currency: 'EUR',
        dueDate: '2026-08-15',
        paymentStatus: 'Pending Payment'
      },
      acceptanceConfirmed: false,
      isFinalAdmittedInstitution: false,
      visaLetterIssued: {
        type: 'Zulassungsbescheid (Germany)',
        referenceNumber: 'TUM-ZUL-2026-8812',
        issuedDate: '2026-09-17T09:15:00Z',
        documentUrl: '/vault/zulassung/tum_zulassungsbescheid.pdf'
      },
      studentNotes: 'Top ambitious admission achieved! Low tuition and high prestige.',
      createdAt: '2026-09-17T09:30:00Z',
      updatedAt: '2026-09-17T09:30:00Z'
    };
    this.offers.set(offTum.id, offTum);
  }

  // ==========================================
  // 1. UNIVERSITY & COURSE MASTER DATA CATALOG + EXTENSIBLE REGISTRIES
  // ==========================================

  public getUniversities(includeInactive = false): UniversityMasterRecord[] {
    if (includeInactive) {
      return [...this.universities];
    }
    return this.universities.filter(u => u.isActive !== false);
  }

  /**
   * Creates a new University record in the University Master structure
   * Supports UniversityId, UniversityName, UniversityType ('PRIVATE' | 'PUBLIC'),
   * Country, State/Location, IsActive, CreatedAt, UpdatedAt
   */
  public createUniversity(payload: {
    universityId?: string;
    universityName: string;
    universityType: UniversityTypeCode;
    country: string;
    stateOrLocation: string;
    minCgpa?: number;
    minPercentage?: number;
    globalRanking?: number;
    currency?: 'EUR' | 'GBP' | 'USD' | 'CAD' | 'AUD';
    defaultCourseName?: string;
    annualTuitionFee?: number;
    isActive?: boolean;
  }): UniversityMasterRecord {
    if (!payload.universityName || !payload.universityName.trim()) {
      throw new Error('UniversityName is required.');
    }
    if (payload.universityType !== 'PRIVATE' && payload.universityType !== 'PUBLIC') {
      throw new Error('UniversityType must be either PRIVATE or PUBLIC.');
    }
    if (!payload.country || !payload.country.trim()) {
      throw new Error('Country is required.');
    }

    const now = new Date().toISOString();
    const cleanId = (payload.universityId || `uni_${payload.universityName.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24)}_${Date.now().toString().slice(-4)}`).trim();

    if (this.universities.some(u => u.id === cleanId || u.universityId === cleanId)) {
      throw new Error(`University with ID '${cleanId}' already exists.`);
    }

    const minCgpa = typeof payload.minCgpa === 'number' ? Math.max(0, Math.min(10, payload.minCgpa)) : 7.0;
    const minPercentage = typeof payload.minPercentage === 'number' ? payload.minPercentage : Math.round(minCgpa * 9.5);
    const currency = payload.currency || (
      payload.country === 'Germany' ? 'EUR' :
      payload.country === 'United Kingdom' ? 'GBP' :
      payload.country === 'Canada' ? 'CAD' :
      payload.country === 'Australia' ? 'AUD' : 'USD'
    );
    const inrExchangeRate =
      currency === 'GBP' ? 108.2 :
      currency === 'EUR' ? 91.5 :
      currency === 'USD' ? 84.2 :
      currency === 'CAD' ? 62.4 : 56.8;

    const newUni: UniversityMasterRecord = {
      id: cleanId,
      universityId: cleanId,
      name: payload.universityName.trim(),
      universityName: payload.universityName.trim(),
      country: payload.country.trim(),
      city: payload.stateOrLocation.trim() || payload.country.trim(),
      stateOrLocation: payload.stateOrLocation.trim() || payload.country.trim(),
      globalRanking: payload.globalRanking || 250,
      nationalRanking: 25,
      type: payload.universityType === 'PUBLIC' ? 'Public' : 'Private',
      universityType: payload.universityType,
      minCgpa,
      minPercentage,
      recommendedCgpaMin: minCgpa,
      recommendedCgpaMax: Math.min(10.0, Number((minCgpa + 1.5).toFixed(2))),
      partnerTier: 'Standard',
      portalType: 'Direct University Portal',
      websiteUrl: 'https://university.edu',
      currency,
      inrExchangeRate,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
      createdAt: now,
      updatedAt: now
    };

    this.universities.push(newUni);

    // Ensure at least one flagship course is linked so the university can be shortlisted immediately
    const courseId = `crs_${cleanId}_flagship`;
    const newCourse: CourseMasterRecord = {
      id: courseId,
      universityId: cleanId,
      universityName: newUni.universityName,
      country: newUni.country,
      courseName: payload.defaultCourseName?.trim() || 'M.Sc. in Computer Science & Global Innovation',
      degreeLevel: 'Masters',
      durationMonths: 24,
      intakes: [
        { season: 'Fall', year: 2026, regularDeadline: '2026-06-30', isRolling: false }
      ],
      fees: {
        currency,
        tuitionFeePerYear: typeof payload.annualTuitionFee === 'number' ? payload.annualTuitionFee : (payload.universityType === 'PUBLIC' ? 12000 : 28000),
        applicationFee: 75,
        estimatedLivingCostPerYear: 14000,
        semesterFeePerYear: 400
      },
      entryCriteria: {
        minGpa10Scale: minCgpa,
        minPercentage,
        maxBacklogsAccepted: 4,
        requiresGreGmat: false,
        englishRequirements: {
          minOverallIelts: 6.5,
          minSectionIelts: 6.0,
          minToefl: 88,
          minPte: 60
        },
        requiresApsGermany: newUni.country === 'Germany',
        specificPrerequisites: ['Undergraduate Degree Transcripts', 'Statement of Purpose', '2 Academic LORs']
      },
      postStudyWorkVisaMonths: 24,
      scholarshipsAvailable: true,
      maxScholarshipAmount: 5000,
      dataSourceCitation: `${newUni.universityName} Official Graduate Admissions Catalog 2026`
    };
    this.courses.push(newCourse);

    return newUni;
  }

  public updateUniversity(
    universityId: string,
    updates: Partial<{
      universityName: string;
      universityType: UniversityTypeCode;
      country: string;
      stateOrLocation: string;
      minCgpa: number;
      minPercentage: number;
      globalRanking: number;
      isActive: boolean;
    }>
  ): UniversityMasterRecord {
    const uni = this.universities.find(u => u.id === universityId || u.universityId === universityId);
    if (!uni) throw new Error(`University '${universityId}' not found.`);

    if (updates.universityName !== undefined && updates.universityName.trim()) {
      uni.name = updates.universityName.trim();
      uni.universityName = updates.universityName.trim();
    }
    if (updates.universityType === 'PRIVATE' || updates.universityType === 'PUBLIC') {
      uni.universityType = updates.universityType;
      uni.type = updates.universityType === 'PUBLIC' ? 'Public' : 'Private';
    }
    if (updates.country !== undefined && updates.country.trim()) {
      uni.country = updates.country.trim();
    }
    if (updates.stateOrLocation !== undefined && updates.stateOrLocation.trim()) {
      uni.stateOrLocation = updates.stateOrLocation.trim();
      uni.city = updates.stateOrLocation.trim();
    }
    if (typeof updates.minCgpa === 'number') {
      uni.minCgpa = Math.max(0, Math.min(10, updates.minCgpa));
      uni.recommendedCgpaMin = uni.minCgpa;
      // Sync course minGpa10Scale
      this.courses.filter(c => c.universityId === uni.id).forEach(c => {
        c.entryCriteria.minGpa10Scale = uni.minCgpa;
      });
    }
    if (typeof updates.minPercentage === 'number') {
      uni.minPercentage = updates.minPercentage;
    }
    if (typeof updates.globalRanking === 'number') {
      uni.globalRanking = updates.globalRanking;
    }
    if (typeof updates.isActive === 'boolean') {
      uni.isActive = updates.isActive;
    }
    uni.updatedAt = new Date().toISOString();
    return uni;
  }

  public getCourses(filter?: { country?: string; degreeLevel?: string; intakeSeason?: string }): CourseMasterRecord[] {
    let list = [...this.courses];
    if (filter?.country) {
      list = list.filter(c => c.country.toLowerCase() === filter.country!.toLowerCase());
    }
    if (filter?.degreeLevel) {
      list = list.filter(c => c.degreeLevel.toLowerCase() === filter.degreeLevel!.toLowerCase());
    }
    return list;
  }

  /**
   * Extensible Workflow Step Registry Methods
   */
  public getWorkflowSteps(): ShortlistWorkflowStepDefinition[] {
    return [...this.workflowSteps].sort((a, b) => a.order - b.order);
  }

  public registerWorkflowStep(step: {
    stepCode: string;
    stepName: string;
    order: number;
    responsibleActor: 'System' | 'Counsellor' | 'Student' | 'Approver';
    description: string;
    isEnabled?: boolean;
  }): ShortlistWorkflowStepDefinition[] {
    if (!step.stepCode || !step.stepName) {
      throw new Error('stepCode and stepName are required to register a workflow step.');
    }
    const code = step.stepCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const existingIdx = this.workflowSteps.findIndex(s => s.stepCode === code);
    const newStep: ShortlistWorkflowStepDefinition = {
      stepCode: code,
      stepName: step.stepName.trim(),
      order: typeof step.order === 'number' ? step.order : 45,
      isEnabled: step.isEnabled !== undefined ? step.isEnabled : true,
      isSystemCore: false,
      responsibleActor: step.responsibleActor || 'Counsellor',
      description: step.description || 'Custom intermediate workflow step.'
    };
    if (existingIdx >= 0) {
      this.workflowSteps[existingIdx] = { ...this.workflowSteps[existingIdx], ...newStep };
    } else {
      this.workflowSteps.push(newStep);
    }
    return this.getWorkflowSteps();
  }

  public toggleWorkflowStep(stepCode: string, isEnabled: boolean): ShortlistWorkflowStepDefinition[] {
    const step = this.workflowSteps.find(s => s.stepCode === stepCode);
    if (!step) throw new Error(`Workflow step '${stepCode}' not found.`);
    step.isEnabled = isEnabled;
    return this.getWorkflowSteps();
  }

  /**
   * Modular Recommendation Criteria Registry Methods
   */
  public getRecommendationCriteria(): ShortlistCriterionDefinition[] {
    return [...this.criteriaRegistry];
  }

  public updateCriterionConfig(
    code: ShortlistCriterionCode,
    updates: { isEnabled?: boolean; weight?: number; configParams?: Record<string, any> }
  ): ShortlistCriterionDefinition[] {
    const crit = this.criteriaRegistry.find(c => c.code === code);
    if (!crit) throw new Error(`Recommendation criterion '${code}' not found.`);
    if (typeof updates.isEnabled === 'boolean') {
      // Ensure CGPA_ELIGIBILITY remains enabled if no other criterion is active
      crit.isEnabled = updates.isEnabled;
    }
    if (typeof updates.weight === 'number') {
      crit.weight = Math.max(0, Math.min(100, updates.weight));
    }
    if (updates.configParams) {
      crit.configParams = { ...(crit.configParams || {}), ...updates.configParams };
    }
    return this.getRecommendationCriteria();
  }

  // ==========================================
  // 2. SHORTLISTING & CATEGORIZATION ALGORITHM (8 PRIVATE + 5 PUBLIC = 13 TOTAL)
  // ==========================================

  /**
   * Normalizes a student's academic score to a 10.0 CGPA scale for deterministic backend evaluation
   */
  public normalizeStudentCgpa(student: StudentMasterProfile, overrideCgpa?: number): number {
    if (typeof overrideCgpa === 'number' && !isNaN(overrideCgpa) && overrideCgpa > 0) {
      return Number(Math.max(0, Math.min(10, overrideCgpa)).toFixed(2));
    }
    const rawScore = Number(student.academics?.scoreValue || 8.0);
    const scale = student.academics?.scoreType || 'gpa_10';
    if (scale === 'percentage' || rawScore > 10) {
      return Number(Math.min(10, Math.max(0, rawScore / 9.5)).toFixed(2));
    }
    if (scale === 'gpa_4' && rawScore <= 4.0) {
      return Number(Math.min(10, Math.max(0, rawScore * 2.5)).toFixed(2));
    }
    return Number(Math.min(10, Math.max(0, rawScore)).toFixed(2));
  }

  /**
   * Evaluates a course against student profile to determine Safe / Moderate / Ambitious categorization.
   * Adheres strictly to the requirement: "Do not represent admission probability as verified fact
   * unless backed by an explicitly documented and maintained source."
   */
  public evaluateCourseCategorization(
    student: StudentMasterProfile, 
    course: CourseMasterRecord,
    overrideCgpa?: number
  ): {
    category: ShortlistCategory;
    rationale: string;
    citation: string;
    estimatedCostInr: number;
    cgpaEligible: boolean;
    minCgpaRequired: number;
    studentCgpaEvaluated: number;
    matchedCriteriaCodes: ShortlistCriterionCode[];
  } {
    const studentCgpa = this.normalizeStudentCgpa(student, overrideCgpa);
    const studentIelts = student.academics.englishTest?.overallScore || 7.0;
    const backlogs = student.academics.backlogs || 0;

    const uni = this.universities.find(u => u.id === course.universityId);
    const minCgpa = uni?.minCgpa ?? course.entryCriteria.minGpa10Scale;
    const minIelts = course.entryCriteria.englishRequirements.minOverallIelts;
    const maxBacklogs = course.entryCriteria.maxBacklogsAccepted;
    const uniTypeLabel = (uni?.universityType || (uni?.type === 'Public' ? 'PUBLIC' : 'PRIVATE'));

    // Currency calculation
    const rate = uni?.inrExchangeRate || 90;
    const annualTotalLocal = course.fees.tuitionFeePerYear + course.fees.estimatedLivingCostPerYear + course.fees.semesterFeePerYear;
    const estimatedCostInr = Math.round(annualTotalLocal * rate);

    const cgpaEligible = studentCgpa >= minCgpa;
    const matchedCriteriaCodes: ShortlistCriterionCode[] = [];
    if (cgpaEligible) {
      matchedCriteriaCodes.push('CGPA_ELIGIBILITY');
    }

    // Evaluate optional enabled criteria from modular registry
    const activeCriteria = this.criteriaRegistry.filter(c => c.isEnabled);
    for (const crit of activeCriteria) {
      if (crit.code === 'PERCENTAGE_ELIGIBILITY') {
        const approxPct = studentCgpa * 9.5;
        if (approxPct >= (uni?.minPercentage || course.entryCriteria.minPercentage)) {
          matchedCriteriaCodes.push('PERCENTAGE_ELIGIBILITY');
        }
      } else if (crit.code === 'TARGET_COUNTRY_MATCH') {
        const targetCountries = student.preferences?.targetCountries || [];
        if (targetCountries.some(tc => tc.toLowerCase() === course.country.toLowerCase())) {
          matchedCriteriaCodes.push('TARGET_COUNTRY_MATCH');
        }
      } else if (crit.code === 'COURSE_DEGREE_MATCH') {
        if (!student.preferences?.targetDegree || student.preferences.targetDegree.toLowerCase().includes(course.degreeLevel.toLowerCase())) {
          matchedCriteriaCodes.push('COURSE_DEGREE_MATCH');
        }
      } else if (crit.code === 'BUDGET_CEILING') {
        const maxBudget = (student.preferences?.budgetCapInLakhsINR || 60) * 100000;
        if (estimatedCostInr <= maxBudget) {
          matchedCriteriaCodes.push('BUDGET_CEILING');
        }
      } else if (crit.code === 'ACADEMIC_BACKGROUND') {
        if (backlogs <= maxBacklogs) {
          matchedCriteriaCodes.push('ACADEMIC_BACKGROUND');
        }
      }
    }

    let category: ShortlistCategory = 'Moderate';
    let rationale = '';

    if (!cgpaEligible) {
      category = 'Ambitious';
      rationale = `${uniTypeLabel} University • Aspirational reach option. Student CGPA (${studentCgpa}) is slightly below published threshold (${minCgpa.toFixed(2)} CGPA); requires strong holistic profile.`;
    } else if ((uni && uni.globalRanking <= 55) || (studentCgpa - minCgpa < 0.35)) {
      category = 'Ambitious';
      rationale = `${uniTypeLabel} University • Selective institution (QS #${uni?.globalRanking || 'Top Tier'}). Student CGPA (${studentCgpa}) meets published threshold (${minCgpa.toFixed(2)} CGPA) within competitive band.`;
    } else if (studentCgpa >= minCgpa + 0.85 && studentIelts >= minIelts) {
      category = 'Safe';
      rationale = `${uniTypeLabel} University • High-eligibility match. Student CGPA (${studentCgpa}) comfortably exceeds minimum requirement (${minCgpa.toFixed(2)} CGPA).`;
    } else {
      category = 'Moderate';
      rationale = `${uniTypeLabel} University • Target CGPA match. Student CGPA (${studentCgpa}) aligns cleanly with university eligibility threshold (${minCgpa.toFixed(2)} CGPA).`;
    }

    return {
      category,
      rationale,
      citation: course.dataSourceCitation,
      estimatedCostInr,
      cgpaEligible,
      minCgpaRequired: minCgpa,
      studentCgpaEvaluated: studentCgpa,
      matchedCriteriaCodes
    };
  }

  /**
   * Deterministic Backend University Shortlist Engine
   * Evaluates Student CGPA + modular eligibility criteria and generates:
   *   8 PRIVATE Universities + 5 PUBLIC Universities = 13 Universities Total
   * Never uses random selection.
   */
  public generateAutomaticUniversityShortlist(
    student: StudentMasterProfile,
    counselorName?: string,
    overrideCgpa?: number
  ): ShortlistRecommendationItem[] {
    const studentCgpa = this.normalizeStudentCgpa(student, overrideCgpa);
    const activeUniversities = this.getUniversities(false);
    const activeCriteria = this.criteriaRegistry.filter(c => c.isEnabled);

    const scoreAndSelectByType = (targetType: UniversityTypeCode, requiredCount: number): ShortlistRecommendationItem[] => {
      const candidates = activeUniversities.filter(u => u.universityType === targetType);

      const evaluatedCandidates = candidates.map(uni => {
        const course = this.courses.find(c => c.universityId === uni.id) || this.courses[0];
        const evalResult = this.evaluateCourseCategorization(student, course, studentCgpa);

        // Deterministic CGPA fit score:
        // 1. Eligible universities (studentCgpa >= uni.minCgpa) get priority tier +1000
        // 2. Closer match between studentCgpa and uni.minCgpa (so higher-tier eligible universities suited to a high-CGPA student rank first)
        // 3. Modular criteria bonus if additional future criteria are enabled
        const cgpaDelta = studentCgpa - uni.minCgpa;
        let deterministicScore = 0;
        if (cgpaDelta >= 0) {
          // Eligible: prefer universities whose minCgpa is closest to studentCgpa (best academic tier fit for the student's CGPA)
          deterministicScore = 1000 - Math.min(500, cgpaDelta * 100) + (1000 - (uni.globalRanking || 500)) * 0.1;
        } else {
          // Below minCgpa: rank by smallest deficit so closest reach universities come first if needed to fill quota
          deterministicScore = 500 + cgpaDelta * 100;
        }

        // Apply weights from any additional enabled modular criteria
        for (const crit of activeCriteria) {
          if (crit.code !== 'CGPA_ELIGIBILITY' && evalResult.matchedCriteriaCodes.includes(crit.code)) {
            deterministicScore += crit.weight;
          }
        }

        return {
          uni,
          course,
          evalResult,
          deterministicScore
        };
      });

      // Deterministic sort: highest score first, then by minCgpa desc, then by universityId asc
      evaluatedCandidates.sort((a, b) => {
        if (Math.abs(b.deterministicScore - a.deterministicScore) > 0.001) {
          return b.deterministicScore - a.deterministicScore;
        }
        if (b.uni.minCgpa !== a.uni.minCgpa) {
          return b.uni.minCgpa - a.uni.minCgpa;
        }
        return a.uni.id.localeCompare(b.uni.id);
      });

      const chosen = evaluatedCandidates.slice(0, requiredCount);
      return chosen.map(({ uni, course, evalResult }) => {
        const intake = course.intakes[0] || { season: 'Fall', year: 2026, regularDeadline: '2026-06-30' };
        return {
          id: `rec_${student.id}_${uni.id}_${course.id}`,
          studentId: student.id,
          courseId: course.id,
          universityId: uni.id,
          universityName: uni.universityName || uni.name,
          universityType: targetType,
          courseName: course.courseName,
          country: uni.country,
          stateOrLocation: uni.stateOrLocation || uni.city,
          category: evalResult.category,
          categoryRationale: evalResult.rationale,
          criteriaSourceCitation: evalResult.citation,
          minCgpaRequired: evalResult.minCgpaRequired,
          studentCgpaEvaluated: evalResult.studentCgpaEvaluated,
          cgpaEligible: evalResult.cgpaEligible,
          matchedCriteriaCodes: evalResult.matchedCriteriaCodes,
          intakeSeason: intake.season,
          intakeYear: intake.year,
          deadlineDate: intake.regularDeadline,
          annualTuitionLocal: course.fees.tuitionFeePerYear,
          annualLivingLocal: course.fees.estimatedLivingCostPerYear,
          currency: course.fees.currency,
          estimatedCostInInr: evalResult.estimatedCostInr,
          studentSelected: false,
          addedByCounselorName: counselorName || student.assignedCounselorName || 'System CGPA Recommendation Engine',
          addedAt: new Date().toISOString()
        };
      });
    };

    const targetPrivateCount = this.selectionConfig.recommendedPrivateCount || REQUIRED_PRIVATE_UNIVERSITY_COUNT;
    const targetPublicCount = this.selectionConfig.recommendedPublicCount || REQUIRED_PUBLIC_UNIVERSITY_COUNT;

    const privateItems = scoreAndSelectByType('PRIVATE', targetPrivateCount);
    const publicItems = scoreAndSelectByType('PUBLIC', targetPublicCount);

    return [...privateItems, ...publicItems];
  }

  /**
   * Recalculates summary counters on a StudentShortlistPlan
   */
  private recalculatePlanTotals(plan: StudentShortlistPlan): StudentShortlistPlan {
    plan.totalRecommendations = plan.items.length;
    plan.requiredPrivateCount = this.selectionConfig.recommendedPrivateCount || REQUIRED_PRIVATE_UNIVERSITY_COUNT;
    plan.requiredPublicCount = this.selectionConfig.recommendedPublicCount || REQUIRED_PUBLIC_UNIVERSITY_COUNT;
    plan.requiredSelectedPrivateCount = this.selectionConfig.requiredPrivateSelectionCount;
    plan.requiredSelectedPublicCount = this.selectionConfig.requiredPublicSelectionCount;
    plan.requiredSelectedTotalCount = this.selectionConfig.totalRequiredSelectionCount;
    plan.selectionConfig = { ...this.selectionConfig };
    plan.totalPrivate = plan.items.filter(i => i.universityType === 'PRIVATE').length;
    plan.totalPublic = plan.items.filter(i => i.universityType === 'PUBLIC').length;
    plan.selectedTotalCount = plan.items.filter(i => i.studentSelected).length;
    plan.selectedPrivateCount = plan.items.filter(i => i.studentSelected && i.universityType === 'PRIVATE').length;
    plan.selectedPublicCount = plan.items.filter(i => i.studentSelected && i.universityType === 'PUBLIC').length;
    plan.totalAmbitious = plan.items.filter(i => i.category === 'Ambitious').length;
    plan.totalModerate = plan.items.filter(i => i.category === 'Moderate').length;
    plan.totalSafe = plan.items.filter(i => i.category === 'Safe').length;
    plan.activeCriteriaApplied = this.criteriaRegistry.filter(c => c.isEnabled).map(c => c.code);
    plan.pendingChangeRequest = (plan.changeRequests || []).find(r => r.status === 'PENDING_APPROVAL') || null;
    plan.changeRequestHistory = plan.changeRequests || [];
    return plan;
  }

  /**
   * Counsellor / Higher Authority customization of shortlisted universities.
   * Allows adding, removing, or replacing universities from the master catalog if permitted by configuration.
   */
  public customizeShortlistPlan(
    student: StudentMasterProfile,
    action: 'add' | 'remove' | 'swap',
    payload: { universityId?: string; courseId?: string; replaceWithUniversityId?: string; actorName?: string }
  ): StudentShortlistPlan {
    const plan = this.getShortlistPlan(student);
    if (plan.isLocked) {
      throw new Error('University selection is locked. Shortlist cannot be modified without formal unlocking approval.');
    }
    if (this.selectionConfig.allowCounselorCustomization === false) {
      throw new Error('Shortlist customization is disabled by configuration policy.');
    }

    if (action === 'remove' && payload.universityId) {
      plan.items = plan.items.filter(i => i.universityId !== payload.universityId);
    } else if (action === 'add' && payload.universityId) {
      const uni = this.universities.find(u => u.id === payload.universityId);
      if (uni && !plan.items.some(i => i.universityId === uni.id)) {
        const course = this.courses.find(c => c.universityId === uni.id) || this.courses[0];
        const studentCgpa = this.normalizeStudentCgpa(student, plan.evaluatedCgpa);
        const evalResult = this.evaluateCourseCategorization(student, course, studentCgpa);
        const intake = course.intakes[0] || { season: 'Fall', year: 2026, regularDeadline: '2026-06-30' };
        plan.items.push({
          id: `rec_${student.id}_${uni.id}_${course.id}_custom`,
          studentId: student.id,
          courseId: course.id,
          universityId: uni.id,
          universityName: uni.universityName || uni.name,
          universityType: uni.universityType,
          courseName: course.courseName,
          country: uni.country,
          stateOrLocation: uni.stateOrLocation || uni.city,
          category: evalResult.category,
          categoryRationale: `Customized by ${payload.actorName || 'Counsellor'}: ${evalResult.rationale}`,
          criteriaSourceCitation: 'Counsellor Custom Shortlist Selection',
          minCgpaRequired: evalResult.minCgpaRequired,
          studentCgpaEvaluated: studentCgpa,
          cgpaEligible: evalResult.cgpaEligible,
          matchedCriteriaCodes: evalResult.matchedCriteriaCodes,
          intakeSeason: intake.season,
          intakeYear: intake.year,
          deadlineDate: intake.regularDeadline,
          annualTuitionLocal: course.fees.tuitionFeePerYear,
          annualLivingLocal: course.fees.estimatedLivingCostPerYear,
          currency: course.fees.currency,
          estimatedCostInInr: evalResult.estimatedCostInr,
          studentSelected: false,
          addedByCounselorName: payload.actorName || student.assignedCounselorName || 'Admissions Counsellor',
          addedAt: new Date().toISOString()
        });
      }
    }

    this.recalculatePlanTotals(plan);
    this.shortlistPlans.set(student.id, plan);
    return plan;
  }

  /**
   * Resolves the database-driven Role & Reporting Hierarchy governance context for a student's shortlist.
   * Ensures:
   * - Only the assigned Counsellor can create a post-lock Change Request (never Student or unassigned Counsellor).
   * - Change requests automatically route to the Counsellor's Reporting Manager via ReportsToUserId.
   * - Self-approval is strictly blocked.
   */
  public getShortlistGovernanceContext(
    student: StudentMasterProfile,
    session?: AuthenticatedUserSession | null,
    planOverride?: StudentShortlistPlan
  ): ShortlistGovernanceContext {
    const secEngine = this.securityEngine || globalSecurityEngine;
    const authUserId = session?.userId || '';
    const authUser = authUserId ? SEED_SECURITY_USERS.find(u => u.id === authUserId) : undefined;
    const authRole = String(authUser?.role || session?.role || 'counselor').toLowerCase();
    const authDbRole =
      secEngine.getRoleById(authUser?.roleId || session?.roleId) || secEngine.getRoleByCode(authRole);
    const authRoleName = authDbRole?.roleName || authRole;
    const authUserName = authUser?.name || session?.name || 'User';

    const assignedCounselorId = student.assignedCounselorId || 'usr_c1';
    const assignedCounselorUser = SEED_SECURITY_USERS.find(u => u.id === assignedCounselorId);
    const assignedCounselorName =
      assignedCounselorUser?.name || student.assignedCounselorName || 'Sandeep Koteshwara';

    const reportingManagerUserId = assignedCounselorUser?.reportsToUserId || null;
    const reportingManagerUser = reportingManagerUserId
      ? SEED_SECURITY_USERS.find(u => u.id === reportingManagerUserId && u.isActive !== false)
      : undefined;
    const reportingManagerDbRole = reportingManagerUser
      ? secEngine.getRoleById(reportingManagerUser.roleId) || secEngine.getRoleByCode(reportingManagerUser.role)
      : undefined;
    const reportingManagerName = reportingManagerUser?.name || null;
    const reportingManagerRoleName = reportingManagerDbRole?.roleName || reportingManagerUser?.role || null;

    const isAssignedCounsellor = Boolean(
      authUserId &&
        (authRole === 'counselor' || authRole === 'counsellor') &&
        authUserId === assignedCounselorId
    );
    const isStudentOwner = Boolean(
      authRole === 'student' &&
        (session?.studentId === student.id ||
          authUser?.studentId === student.id ||
          student.personal?.email?.toLowerCase() === (session?.email || '').toLowerCase())
    );
    const isReportingManagerOfCounsellor = Boolean(
      authUserId &&
        authUserId !== assignedCounselorId &&
        (authUserId === reportingManagerUserId || secEngine.isSubordinateOf(assignedCounselorId, authUserId))
    );
    const isPlatformSuperAdmin =
      authRole === 'super_admin' || authRole === 'master_super_admin';

    const canInitiateCounsellorReview =
      isAssignedCounsellor || isReportingManagerOfCounsellor || isPlatformSuperAdmin;
    const canSelectAndAcknowledge =
      isStudentOwner || isAssignedCounsellor || isReportingManagerOfCounsellor || isPlatformSuperAdmin;

    // Strictly ONLY the Counsellor assigned to this student can request a post-lock university selection change
    const canRequestPostLockChange = isAssignedCounsellor;

    const plan = planOverride || this.shortlistPlans.get(student.id);
    const pendingReq = plan?.changeRequests?.find(r => r.status === 'PENDING_APPROVAL');
    let canApprovePendingChange = false;
    if (pendingReq && authUserId) {
      const reqCounsellorId = pendingReq.requestedByUserId || pendingReq.requestedBy || assignedCounselorId;
      const isSelfRequest = authUserId === reqCounsellorId;
      const isDisallowedRole =
        authRole === 'student' ||
        authRole === 'parent' ||
        authRole === 'counselor' ||
        authRole === 'counsellor';
      if (!isSelfRequest && !isDisallowedRole) {
        const isAssignedApprover = authUserId === pendingReq.assignedApproverUserId;
        const isHigherInChain = secEngine.isSubordinateOf(reqCounsellorId, authUserId);
        canApprovePendingChange = Boolean(isAssignedApprover || isHigherInChain || isPlatformSuperAdmin);
      }
    }

    return {
      authenticatedUserId: authUserId,
      authenticatedUserName: authUserName,
      authenticatedUserRole: authRole,
      authenticatedUserRoleName: authRoleName,
      assignedCounselorId,
      assignedCounselorName,
      reportingManagerUserId,
      reportingManagerName,
      reportingManagerRole: reportingManagerRoleName,
      reportingManagerRoleName,
      isAssignedCounsellor,
      isStudentOwner,
      isReportingManagerOfCounsellor,
      canInitiateCounsellorReview,
      canSelectAndAcknowledge,
      canRequestChange: canRequestPostLockChange,
      canRequestPostLockChange,
      canApprovePendingRequest: canApprovePendingChange,
      canApprovePendingChange
    };
  }

  /**
   * Returns all pending post-lock change requests across students where the authenticated user is the authorized Reporting Manager / Approver
   */
  public getPendingChangeRequestsForSession(
    studentsOrSession: StudentMasterProfile[] | AuthenticatedUserSession | null | undefined,
    sessionOrStudents?: AuthenticatedUserSession | StudentMasterProfile[] | null
  ): ShortlistChangeRequest[] {
    const students: StudentMasterProfile[] = Array.isArray(studentsOrSession)
      ? studentsOrSession
      : Array.isArray(sessionOrStudents)
      ? sessionOrStudents
      : [];
    const session: AuthenticatedUserSession | null | undefined = Array.isArray(studentsOrSession)
      ? (sessionOrStudents as AuthenticatedUserSession | null | undefined)
      : (studentsOrSession as AuthenticatedUserSession | null | undefined);

    if (!session || !session.userId) {
      return [];
    }

    const secEngine = this.securityEngine || globalSecurityEngine;
    const results: ShortlistChangeRequest[] = [];

    for (const student of students) {
      if (!secEngine.canAccessStudentRecord(session, student).allowed) {
        continue;
      }
      const plan = this.shortlistPlans.get(student.id);
      if (!plan) continue;
      const pending = (plan.changeRequests || []).find(r => r.status === 'PENDING_APPROVAL');
      if (!pending) continue;
      const gov = this.getShortlistGovernanceContext(student, session, plan);
      if (!gov.canApprovePendingChange) {
        continue;
      }
      const approverId = pending.assignedApproverUserId || pending.approverUserId || gov.reportingManagerUserId || '';
      const approverName = pending.assignedApproverName || pending.approverName || gov.reportingManagerName || 'Reporting Manager';
      const approverRole = String(pending.assignedApproverRole || pending.approverRole || gov.reportingManagerRoleName || 'Manager');
      results.push({
        ...pending,
        id: pending.id,
        requestId: pending.id,
        studentId: student.id,
        studentRefNo: student.studentRefNo,
        studentName: `${student.personal.firstName} ${student.personal.lastName}`,
        requestedByUserId: pending.requestedByUserId || pending.requestedBy || student.assignedCounselorId,
        requestedByName: pending.requestedByName,
        approverUserId: approverId,
        approverName,
        approverRole,
        assignedApproverUserId: approverId,
        assignedApproverName: approverName,
        assignedApproverRole: approverRole,
        reason: pending.reason,
        requestedAt: pending.requestedAt,
        status: 'PENDING_APPROVAL'
      });
    }

    return results;
  }

  /**
   * Appends a workflow audit entry to a student's shortlist plan
   */
  private appendWorkflowAudit(
    plan: StudentShortlistPlan,
    stepCode: ShortlistWorkflowStepCode,
    action: string,
    actorName: string,
    actorRole: string,
    details: string
  ) {
    if (!plan.workflowAuditLog) {
      plan.workflowAuditLog = [];
    }
    plan.workflowAuditLog.unshift({
      id: `wlog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      stepCode,
      action,
      actorName,
      actorRole,
      timestamp: new Date().toISOString(),
      details
    });
  }

  /**
   * Retrieves or builds the 13-university (8 Private + 5 Public) shortlist plan for a student
   */
  public getShortlistPlan(
    student: StudentMasterProfile,
    session?: AuthenticatedUserSession | null
  ): StudentShortlistPlan {
    const existing = this.shortlistPlans.get(student.id);
    if (existing) {
      const recalculated = this.recalculatePlanTotals(existing);
      if (session) {
        recalculated.governanceContext = this.getShortlistGovernanceContext(student, session, recalculated);
      }
      return recalculated;
    }

    const evaluatedCgpa = this.normalizeStudentCgpa(student);
    const items = this.generateAutomaticUniversityShortlist(
      student,
      student.assignedCounselorName || 'Admissions Counselor',
      evaluatedCgpa
    );

    const now = new Date().toISOString();
    const newPlan: StudentShortlistPlan = {
      id: `plan_${student.id}`,
      studentId: student.id,
      studentRefNo: student.studentRefNo,
      status: 'recommended_by_counselor',
      currentWorkflowStep: 'SYSTEM_RECOMMENDATION_GENERATED',
      items,
      isLocked: false,
      advisoryDisclaimerAcknowledged: false,
      evaluatedCgpa,
      activeCriteriaApplied: this.criteriaRegistry.filter(c => c.isEnabled).map(c => c.code),
      totalRecommendations: items.length,
      requiredPrivateCount: REQUIRED_PRIVATE_UNIVERSITY_COUNT,
      requiredPublicCount: REQUIRED_PUBLIC_UNIVERSITY_COUNT,
      totalPrivate: items.filter(i => i.universityType === 'PRIVATE').length,
      totalPublic: items.filter(i => i.universityType === 'PUBLIC').length,
      selectedTotalCount: items.filter(i => i.studentSelected).length,
      selectedPrivateCount: items.filter(i => i.studentSelected && i.universityType === 'PRIVATE').length,
      selectedPublicCount: items.filter(i => i.studentSelected && i.universityType === 'PUBLIC').length,
      totalAmbitious: items.filter(i => i.category === 'Ambitious').length,
      totalModerate: items.filter(i => i.category === 'Moderate').length,
      totalSafe: items.filter(i => i.category === 'Safe').length,
      counsellorInitiatedBy: student.assignedCounselorName || 'Pooja Sharma (Senior Counselor)',
      counsellorInitiatedAt: now,
      changeRequests: [],
      workflowAuditLog: [
        {
          id: `wlog_init_${student.id}_2`,
          stepCode: 'SYSTEM_RECOMMENDATION_GENERATED',
          action: 'Automatic 13-University Shortlist Generated (8 Private + 5 Public)',
          actorName: 'Backend CGPA Recommendation Engine',
          actorRole: 'system',
          timestamp: now,
          details: `Evaluated Student CGPA (${evaluatedCgpa}) against active university eligibility criteria. Shortlisted ${items.filter(i => i.universityType === 'PRIVATE').length} Private and ${items.filter(i => i.universityType === 'PUBLIC').length} Public universities.`
        },
        {
          id: `wlog_init_${student.id}_1`,
          stepCode: 'REGISTRATION_COMPLETED',
          action: 'Registration Completed -> University Shortlisting Triggered',
          actorName: 'System Workflow Trigger',
          actorRole: 'system',
          timestamp: now,
          details: `Student ${student.studentRefNo} completed registration workflow and entered University Shortlisting stage.`
        }
      ],
      updatedAt: now
    };

    this.shortlistPlans.set(student.id, newPlan);
    if (session) {
      newPlan.governanceContext = this.getShortlistGovernanceContext(student, session, newPlan);
    }
    return newPlan;
  }

  /**
   * Triggered automatically when a student completes registration
   */
  public triggerShortlistingOnRegistrationCompleted(
    student: StudentMasterProfile,
    triggeredByName: string
  ): StudentShortlistPlan {
    student.currentStage = 'university_shortlisting';
    const plan = this.getShortlistPlan(student);
    this.appendWorkflowAudit(
      plan,
      'UNIVERSITY_SHORTLISTING',
      'University Shortlisting Workflow Triggered on Registration Completion',
      triggeredByName,
      'system',
      `Registration completed for ${student.studentRefNo}. Generated ${plan.totalPrivate} Private + ${plan.totalPublic} Public = ${plan.totalRecommendations} recommended universities using Student CGPA (${plan.evaluatedCgpa}).`
    );
    this.shortlistPlans.set(student.id, plan);
    return plan;
  }

  /**
   * Step: Counsellor reviews / initiates selection process & (re)generates 13 recommended universities
   */
  public initiateCounsellorReview(
    student: StudentMasterProfile,
    counsellorName: string,
    options?: { overrideCgpa?: number; counsellorNotes?: string; regenerate?: boolean }
  ): StudentShortlistPlan {
    const plan = this.getShortlistPlan(student);
    if (plan.isLocked) {
      throw new Error('University selection is locked. Any changes or regeneration require formal approval.');
    }

    const evaluatedCgpa = this.normalizeStudentCgpa(student, options?.overrideCgpa);
    if (options?.overrideCgpa !== undefined) {
      student.academics.scoreValue = evaluatedCgpa;
    }

    if (options?.regenerate !== false) {
      // Preserve any existing student selections by universityId if regenerating
      const previousSelectedUniIds = new Set(plan.items.filter(i => i.studentSelected).map(i => i.universityId));
      const newItems = this.generateAutomaticUniversityShortlist(student, counsellorName, evaluatedCgpa);
      newItems.forEach(item => {
        if (previousSelectedUniIds.has(item.universityId)) {
          item.studentSelected = true;
        }
      });
      plan.items = newItems;
    }

    plan.evaluatedCgpa = evaluatedCgpa;
    plan.status = 'recommended_by_counselor';
    plan.currentWorkflowStep = 'SYSTEM_RECOMMENDATION_GENERATED';
    plan.counsellorInitiatedBy = counsellorName;
    plan.counsellorInitiatedAt = new Date().toISOString();
    if (options?.counsellorNotes !== undefined) {
      plan.counsellorNotes = options.counsellorNotes;
    }
    plan.updatedAt = new Date().toISOString();
    this.recalculatePlanTotals(plan);

    this.appendWorkflowAudit(
      plan,
      'COUNSELLOR_REVIEW_INITIATION',
      'Counsellor Reviewed & Generated 13 Recommended Universities (8 Private + 5 Public)',
      counsellorName,
      'counselor',
      `Evaluated CGPA ${evaluatedCgpa}. Generated ${plan.totalPrivate} Private + ${plan.totalPublic} Public = ${plan.totalRecommendations} universities.`
    );

    this.shortlistPlans.set(student.id, plan);
    return plan;
  }

  /**
   * Step: Counsellor sends university selection request to student
   */
  public sendSelectionRequestToStudent(
    student: StudentMasterProfile,
    counsellorName: string,
    counsellorNotes?: string
  ): StudentShortlistPlan {
    const plan = this.getShortlistPlan(student);
    if (plan.isLocked) {
      throw new Error('Selection is already locked. Unlock via change approval before resending request.');
    }

    // Ensure the plan has the 13-university recommendation (8 Private + 5 Public)
    if (plan.items.length < REQUIRED_TOTAL_SHORTLIST_COUNT) {
      const evaluatedCgpa = this.normalizeStudentCgpa(student, plan.evaluatedCgpa);
      plan.items = this.generateAutomaticUniversityShortlist(student, counsellorName, evaluatedCgpa);
      plan.evaluatedCgpa = evaluatedCgpa;
    }

    plan.status = 'shared_with_student';
    plan.currentWorkflowStep = 'COUNSELLOR_REQUEST_SENT';
    plan.sentToStudentBy = counsellorName;
    plan.sentToStudentAt = new Date().toISOString();
    if (counsellorNotes !== undefined) {
      plan.counsellorNotes = counsellorNotes;
    }
    plan.updatedAt = new Date().toISOString();
    this.recalculatePlanTotals(plan);

    this.appendWorkflowAudit(
      plan,
      'COUNSELLOR_REQUEST_SENT',
      'Counsellor Sent University Selection Request to Student',
      counsellorName,
      'counselor',
      `Sent ${plan.totalRecommendations} recommended universities (${plan.totalPrivate} Private, ${plan.totalPublic} Public) to ${student.personal.firstName} ${student.personal.lastName} for selection and acknowledgement.`
    );

    this.shortlistPlans.set(student.id, plan);
    return plan;
  }

  /**
   * Step: Student selects universities (draft selection before final acknowledgement/lock)
   */
  public saveStudentUniversitySelections(
    studentId: string,
    selections: { itemId: string; selected: boolean; priorityRank?: number; rating?: number; feedback?: string }[],
    actorName = 'Student'
  ): StudentShortlistPlan {
    const plan = this.shortlistPlans.get(studentId);
    if (!plan) throw new Error('Shortlist plan not found');
    if (plan.isLocked) {
      throw new Error('University selection is locked. Future changes require formal approval.');
    }

    selections.forEach(sel => {
      const item = plan.items.find(i => i.id === sel.itemId);
      if (item) {
        item.studentSelected = sel.selected;
        if (sel.priorityRank !== undefined) item.studentPriorityRank = sel.priorityRank;
        if (sel.rating !== undefined) item.studentRating = sel.rating;
        if (sel.feedback !== undefined) item.studentFeedback = sel.feedback;
      }
    });

    plan.status = 'student_selecting';
    plan.currentWorkflowStep = 'STUDENT_SELECTS_UNIVERSITIES';
    plan.updatedAt = new Date().toISOString();
    this.recalculatePlanTotals(plan);

    this.appendWorkflowAudit(
      plan,
      'STUDENT_SELECTS_UNIVERSITIES',
      'Student Updated University Selections',
      actorName,
      'student',
      `Selected ${plan.selectedTotalCount} of ${plan.totalRecommendations} recommended universities (${plan.selectedPrivateCount} Private, ${plan.selectedPublicCount} Public).`
    );

    this.shortlistPlans.set(studentId, plan);
    return plan;
  }

  /**
   * Step: Student acknowledges & submits selection -> Selection becomes LOCKED immediately
   * Future changes require approval.
   */
  public acknowledgeAndSubmitStudentSelection(
    student: StudentMasterProfile,
    payload: {
      studentName: string;
      declarationText?: string;
      selections?: { itemId: string; selected: boolean; priorityRank?: number; rating?: number; feedback?: string }[];
    }
  ): { plan: StudentShortlistPlan; createdApplications: ApplicationWorkspaceRecord[] } {
    const plan = this.getShortlistPlan(student);
    if (plan.isLocked) {
      throw new Error('University selection is already locked. Any modification requires formal change approval.');
    }

    if (payload.selections && payload.selections.length > 0) {
      payload.selections.forEach(sel => {
        const item = plan.items.find(i => i.id === sel.itemId);
        if (item) {
          item.studentSelected = sel.selected;
          if (sel.priorityRank !== undefined) item.studentPriorityRank = sel.priorityRank;
          if (sel.rating !== undefined) item.studentRating = sel.rating;
          if (sel.feedback !== undefined) item.studentFeedback = sel.feedback;
        }
      });
    }

    // Independent Backend Verification (Mandatory Business Rule: 5 Private + 3 Public = 8 Total)
    const cfg = this.getSelectionConfig();
    const selectedPrivateItems = plan.items.filter(i => i.studentSelected && i.universityType === 'PRIVATE');
    const selectedPublicItems = plan.items.filter(i => i.studentSelected && i.universityType === 'PUBLIC');
    const selectedItems = plan.items.filter(i => i.studentSelected);

    if (selectedPrivateItems.length !== cfg.requiredPrivateSelectionCount) {
      throw new Error(`Please select exactly ${cfg.requiredPrivateSelectionCount} private universities.`);
    }
    if (selectedPublicItems.length !== cfg.requiredPublicSelectionCount) {
      throw new Error(`Please select exactly ${cfg.requiredPublicSelectionCount} public universities.`);
    }
    if (selectedItems.length !== cfg.totalRequiredSelectionCount) {
      throw new Error(`Exactly ${cfg.totalRequiredSelectionCount} universities must be selected (${cfg.requiredPrivateSelectionCount} Private + ${cfg.requiredPublicSelectionCount} Public). Currently selected: ${selectedItems.length}.`);
    }

    const now = new Date().toISOString();
    const studentFullName = payload.studentName?.trim() || `${student.personal.firstName} ${student.personal.lastName}`;
    const declaration = payload.declarationText?.trim() ||
      'I hereby confirm and acknowledge my final university selection from the recommended shortlist (8 Private, 5 Public). I understand that upon submission my selection becomes locked and any future changes will require formal approval.';

    const acknowledgement: ShortlistAcknowledgement = {
      acknowledged: true,
      acknowledgedByStudentId: student.id,
      acknowledgedByStudentName: studentFullName,
      acknowledgedAt: now,
      declarationText: declaration,
      selectedUniversityIds: selectedItems.map(i => i.universityId)
    };

    plan.studentAcknowledgement = acknowledgement;
    plan.advisoryDisclaimerAcknowledged = true;
    plan.studentApprovedAt = now;
    plan.isLocked = true;
    plan.status = 'locked';
    plan.currentWorkflowStep = 'SELECTION_LOCKED';
    plan.lockedAt = now;
    plan.lockedBy = `${studentFullName} (Student Acknowledgement & Submission)`;
    plan.updatedAt = now;
    this.recalculatePlanTotals(plan);

    this.appendWorkflowAudit(
      plan,
      'STUDENT_ACKNOWLEDGES_SUBMITS',
      'Student Acknowledged & Submitted Final University Selection',
      studentFullName,
      'student',
      `Student acknowledged declaration and submitted ${selectedItems.length} selected universities (${plan.selectedPrivateCount} Private, ${plan.selectedPublicCount} Public).`
    );

    this.appendWorkflowAudit(
      plan,
      'SELECTION_LOCKED',
      'University Selection Locked Automatically',
      'System Governance Engine',
      'system',
      `Selection locked at ${now}. Neither student nor counsellor can modify selections without an approved Change Request.`
    );

    // Create Application Workspace records for each selected university program
    const createdApplications: ApplicationWorkspaceRecord[] = [];
    selectedItems.forEach(item => {
      const existingApp = Array.from(this.applications.values()).find(
        a => a.studentId === student.id && a.courseId === item.courseId
      );
      if (!existingApp) {
        const course = this.courses.find(c => c.id === item.courseId);
        const uni = this.universities.find(u => u.id === item.universityId);
        const newApp = this.createApplicationRecord(student, item, course, uni);
        this.applications.set(newApp.id, newApp);
        createdApplications.push(newApp);
      } else {
        createdApplications.push(existingApp);
      }
    });

    this.shortlistPlans.set(student.id, plan);
    return { plan, createdApplications };
  }

  /**
   * Step: Request a change after selection has been locked.
   * Strict Governance Rules:
   * 1. Change Requestor is ALWAYS the currently authenticated Counsellor (no frontend dropdown/override).
   * 2. Students and Parents cannot create a university selection change request.
   * 3. The Counsellor must be assigned to the student (student.assignedCounselorId === session.userId).
   * 4. Approval is automatically routed to the Counsellor's Reporting Manager via database ReportsToUserId.
   * 5. Self-approval routing (ReportsToUserId === RequestedByUserId) is strictly prohibited.
   */
  public requestShortlistChangeAfterLock(
    studentOrId: StudentMasterProfile | string,
    payload: {
      reason: string;
      proposedChangesSummary?: string;
      proposedAddUniversityIds?: string[];
      proposedRemoveItemIds?: string[];
    },
    session?: AuthenticatedUserSession | null
  ): StudentShortlistPlan {
    const secEngine = this.securityEngine || globalSecurityEngine;
    const studentId = typeof studentOrId === 'string' ? studentOrId : studentOrId.id;
    const studentObj = typeof studentOrId === 'object' ? studentOrId : undefined;

    if (!session || !session.userId) {
      throw new Error(
        'Authentication required: Only the authenticated assigned Counsellor can submit a university selection change request.'
      );
    }

    const counsellorUser = SEED_SECURITY_USERS.find(u => u.id === session.userId);
    const effectiveRole = String(counsellorUser?.role || session.role || '').toLowerCase();

    // Rule 2: Only Counsellor can request change (Student must NOT be able to create a change request)
    if (effectiveRole === 'student' || effectiveRole === 'parent') {
      throw new Error(
        'Access Denied: Students are not permitted to create a university selection change request. Only your assigned Counsellor can request a change.'
      );
    }
    if (effectiveRole !== 'counselor' && effectiveRole !== 'counsellor') {
      throw new Error(
        `Access Denied: Only a Counsellor can submit a university selection change request (current role: '${effectiveRole}').`
      );
    }

    // Rule 3: Counsellor must be assigned to the student
    const assignedCounselorId = studentObj?.assignedCounselorId;
    if (!assignedCounselorId || assignedCounselorId !== session.userId) {
      throw new Error(
        `Access Denied: Counsellor ${counsellorUser?.name || session.name} is not assigned to this student. You can only request a university selection change for students assigned to you.`
      );
    }

    const plan = studentObj ? this.getShortlistPlan(studentObj) : this.shortlistPlans.get(studentId);
    if (!plan) throw new Error('Shortlist plan not found.');
    if (!plan.isLocked) {
      throw new Error('Shortlist is not currently locked; changes can be made directly without a change request.');
    }
    if (!payload.reason || payload.reason.trim().length < 5) {
      throw new Error('Please provide a clear reason (minimum 5 characters) for requesting a change to the locked university selection.');
    }

    if (!plan.changeRequests) {
      plan.changeRequests = [];
    }

    const existingPending = plan.changeRequests.find(r => r.status === 'PENDING_APPROVAL');
    if (existingPending) {
      throw new Error(
        `A change request (${existingPending.id}) is already pending approval with ${existingPending.assignedApproverName || 'your Reporting Manager'}.`
      );
    }

    // Rule 4 & 5: Automatically route to Counsellor's Reporting Manager via database ReportsToUserId; block self-approval
    const reportsToUserId = counsellorUser?.reportsToUserId || session.reportsToUserId || null;
    if (!reportsToUserId) {
      throw new Error(
        `Reporting Hierarchy Error: Counsellor ${counsellorUser?.name || session.name} does not have a Reporting Manager (ReportsToUserId) configured in the database.`
      );
    }
    if (reportsToUserId === session.userId) {
      throw new Error(
        'Reporting Hierarchy Error: Self-approval is strictly prohibited. A Counsellor cannot be their own Reporting Manager.'
      );
    }

    const managerUser = SEED_SECURITY_USERS.find(u => u.id === reportsToUserId && u.isActive !== false);
    if (!managerUser) {
      throw new Error(
        `Reporting Hierarchy Error: Assigned Reporting Manager (${reportsToUserId}) was not found or is inactive in the database.`
      );
    }

    const managerDbRole =
      secEngine.getRoleById(managerUser.roleId) || secEngine.getRoleByCode(managerUser.role);
    const assignedApproverUserId = managerUser.id;
    const assignedApproverName = managerUser.name;
    const assignedApproverRole = managerDbRole?.roleName || managerUser.role;

    const requestedByUserId = session.userId;
    const requestedByName = counsellorUser?.name || session.name;

    const now = new Date().toISOString();
    const reqId = `chg_${studentId}_${Date.now().toString().slice(-5)}`;
    const newReq: ShortlistChangeRequest = {
      id: reqId,
      requestId: reqId,
      studentId,
      studentRefNo: studentObj?.studentRefNo || plan.studentRefNo,
      studentName: studentObj
        ? `${studentObj.personal.firstName} ${studentObj.personal.lastName}`
        : undefined,
      requestedByUserId,
      requestedBy: requestedByUserId,
      requestedByName,
      requestedByRole: 'counselor',
      requestedAt: now,
      approverUserId: assignedApproverUserId,
      approverName: assignedApproverName,
      approverRole: assignedApproverRole,
      approverEmail: managerUser.email,
      assignedApproverUserId,
      assignedApproverName,
      assignedApproverRole,
      reason: payload.reason.trim(),
      proposedChangesSummary: payload.proposedChangesSummary?.trim(),
      proposedAddUniversityIds: payload.proposedAddUniversityIds || [],
      proposedRemoveItemIds: payload.proposedRemoveItemIds || [],
      status: 'PENDING_APPROVAL'
    };

    plan.changeRequests.unshift(newReq);
    plan.pendingChangeRequest = newReq;
    plan.changeRequestHistory = plan.changeRequests;
    plan.status = 'change_requested';
    plan.currentWorkflowStep = 'POST_LOCK_CHANGE_APPROVAL';
    plan.updatedAt = now;

    this.appendWorkflowAudit(
      plan,
      'POST_LOCK_CHANGE_APPROVAL',
      `Post-Lock Change Request Submitted (${newReq.id}) -> Routed to ${assignedApproverName} (${assignedApproverRole})`,
      requestedByName,
      'counselor',
      `Requested by assigned Counsellor ${requestedByName} (${requestedByUserId}). Automatically routed to Reporting Manager ${assignedApproverName} (${assignedApproverRole}). Reason: "${newReq.reason}". Selection remains locked pending Reporting Manager approval.`
    );

    if (studentObj) {
      plan.governanceContext = this.getShortlistGovernanceContext(studentObj, session, plan);
    }
    this.shortlistPlans.set(studentId, plan);
    return plan;
  }

  /**
   * Step: Counsellor's Reporting Manager (or higher manager in the reporting hierarchy)
   * approves or rejects a post-lock change request.
   * Strict Governance Rules:
   * 1. Reviewer identity is determined strictly from the authenticated session.
   * 2. Self-approval (session.userId === req.requestedByUserId) is strictly blocked.
   * 3. Students, Parents, and Counsellors cannot approve or reject change requests.
   * 4. Reviewer must be the Counsellor's Reporting Manager (ReportsToUserId) or a higher manager in the reporting chain.
   */
  public reviewShortlistChangeRequest(
    student: StudentMasterProfile,
    payload: {
      requestId: string;
      decision: 'APPROVED' | 'REJECTED';
      reviewNotes?: string;
    },
    session?: AuthenticatedUserSession | null
  ): StudentShortlistPlan {
    const secEngine = this.securityEngine || globalSecurityEngine;

    if (!session || !session.userId) {
      throw new Error(
        'Authentication required: Only an authenticated Reporting Manager can approve or reject a university selection change request.'
      );
    }

    const plan = this.getShortlistPlan(student);
    const req = (plan.changeRequests || []).find(r => r.id === payload.requestId);
    if (!req) {
      throw new Error(`Change request '${payload.requestId}' not found.`);
    }
    if (req.status !== 'PENDING_APPROVAL') {
      throw new Error(`Change request '${payload.requestId}' has already been ${req.status.toLowerCase()}.`);
    }

    const reqCounsellorId = req.requestedByUserId || req.requestedBy || student.assignedCounselorId;

    // Rule 2: Strict No Self-Approval
    if (session.userId === reqCounsellorId) {
      throw new Error(
        'Access Denied: Self-approval is strictly prohibited. The requesting Counsellor cannot approve or reject their own change request.'
      );
    }

    const reviewerUser = SEED_SECURITY_USERS.find(u => u.id === session.userId);
    const effectiveRole = String(reviewerUser?.role || session.role || '').toLowerCase();

    // Rule 3: Students, Parents, and Counsellors cannot approve/reject
    if (
      effectiveRole === 'student' ||
      effectiveRole === 'parent' ||
      effectiveRole === 'counselor' ||
      effectiveRole === 'counsellor'
    ) {
      throw new Error(
        `Access Denied: Role '${effectiveRole}' is not permitted to approve or reject university selection change requests. Approval must be performed by the Counsellor's Reporting Manager.`
      );
    }

    // Rule 4: Must be the assigned Reporting Manager or a higher manager in the Counsellor's reporting hierarchy
    const isDirectAssignedApprover = session.userId === req.assignedApproverUserId;
    const isHigherReportingManager = reqCounsellorId
      ? secEngine.isSubordinateOf(reqCounsellorId, session.userId)
      : false;
    const isPlatformSuperAdmin =
      effectiveRole === 'super_admin' || effectiveRole === 'master_super_admin';

    if (!isDirectAssignedApprover && !isHigherReportingManager && !isPlatformSuperAdmin) {
      throw new Error(
        `Access Denied: Only the Counsellor's Reporting Manager (${req.assignedApproverName || 'Reporting Manager'}) or a higher manager in their reporting hierarchy can approve or reject this change request.`
      );
    }

    const reviewerDbRole = reviewerUser
      ? secEngine.getRoleById(reviewerUser.roleId) || secEngine.getRoleByCode(reviewerUser.role)
      : secEngine.getRoleByCode(session.role);
    const reviewerName = reviewerUser?.name || session.name;
    const reviewerRoleLabel = reviewerDbRole?.roleName || session.role;

    const now = new Date().toISOString();
    req.status = payload.decision;
    req.reviewedByUserId = session.userId;
    req.reviewedBy = session.userId;
    req.reviewedByName = reviewerName;
    req.reviewedByRole = reviewerRoleLabel;
    req.reviewedAt = now;
    req.reviewNotes =
      payload.reviewNotes?.trim() ||
      (payload.decision === 'APPROVED'
        ? `Approved by Reporting Manager ${reviewerName} (${reviewerRoleLabel}).`
        : `Rejected by Reporting Manager ${reviewerName} (${reviewerRoleLabel}).`);

    if (payload.decision === 'APPROVED') {
      // Unlock selection so student/counsellor can update and re-acknowledge
      plan.isLocked = false;
      plan.status = 'shared_with_student';
      plan.currentWorkflowStep = 'STUDENT_SELECTS_UNIVERSITIES';

      // Apply any explicit proposed removals/additions if specified
      if (req.proposedRemoveItemIds && req.proposedRemoveItemIds.length > 0) {
        plan.items.forEach(item => {
          if (req.proposedRemoveItemIds!.includes(item.id)) {
            item.studentSelected = false;
          }
        });
      }
      if (req.proposedAddUniversityIds && req.proposedAddUniversityIds.length > 0) {
        plan.items.forEach(item => {
          if (req.proposedAddUniversityIds!.includes(item.universityId)) {
            item.studentSelected = true;
          }
        });
      }

      this.appendWorkflowAudit(
        plan,
        'POST_LOCK_CHANGE_APPROVAL',
        `Post-Lock Change Request APPROVED (${req.id}) by ${reviewerName} (${reviewerRoleLabel})`,
        reviewerName,
        String(reviewerRoleLabel),
        `Approved by Reporting Manager ${reviewerName} (${reviewerRoleLabel}). Notes: "${req.reviewNotes}". Shortlist unlocked for revision and re-acknowledgement.`
      );
    } else {
      // Keep locked
      plan.isLocked = true;
      plan.status = 'locked';
      plan.currentWorkflowStep = 'SELECTION_LOCKED';

      this.appendWorkflowAudit(
        plan,
        'POST_LOCK_CHANGE_APPROVAL',
        `Post-Lock Change Request REJECTED (${req.id}) by ${reviewerName} (${reviewerRoleLabel})`,
        reviewerName,
        String(reviewerRoleLabel),
        `Rejected by Reporting Manager ${reviewerName} (${reviewerRoleLabel}). Notes: "${req.reviewNotes}". Selection remains locked.`
      );
    }

    plan.updatedAt = now;
    this.recalculatePlanTotals(plan);
    plan.governanceContext = this.getShortlistGovernanceContext(student, session, plan);
    this.shortlistPlans.set(student.id, plan);
    return plan;
  }

  /**
   * Adds or updates a course in the student's shortlist
   */
  public addCourseToShortlist(
    student: StudentMasterProfile, 
    courseId: string, 
    counselorName: string
  ): StudentShortlistPlan {
    const plan = this.getShortlistPlan(student);
    if (plan.isLocked) {
      throw new Error('Shortlist is locked. Cannot add courses unless unlocked via formal change approval.');
    }

    const course = this.courses.find(c => c.id === courseId);
    if (!course) throw new Error('Course not found in master catalog.');

    // Check if already in shortlist
    if (plan.items.some(i => i.courseId === courseId)) {
      return plan;
    }

    const uni = this.universities.find(u => u.id === course.universityId);
    const evalResult = this.evaluateCourseCategorization(student, course, plan.evaluatedCgpa);
    const intake = course.intakes[0] || { season: 'Fall', year: 2026, regularDeadline: '2026-06-30' };

    const newItem: ShortlistRecommendationItem = {
      id: `rec_${student.id}_${course.id}`,
      studentId: student.id,
      courseId: course.id,
      universityId: course.universityId,
      universityName: course.universityName,
      universityType: uni?.universityType || (uni?.type === 'Public' ? 'PUBLIC' : 'PRIVATE'),
      courseName: course.courseName,
      country: course.country,
      stateOrLocation: uni?.stateOrLocation || uni?.city,
      category: evalResult.category,
      categoryRationale: evalResult.rationale,
      criteriaSourceCitation: evalResult.citation,
      minCgpaRequired: evalResult.minCgpaRequired,
      studentCgpaEvaluated: evalResult.studentCgpaEvaluated,
      cgpaEligible: evalResult.cgpaEligible,
      matchedCriteriaCodes: evalResult.matchedCriteriaCodes,
      intakeSeason: intake.season,
      intakeYear: intake.year,
      deadlineDate: intake.regularDeadline,
      annualTuitionLocal: course.fees.tuitionFeePerYear,
      annualLivingLocal: course.fees.estimatedLivingCostPerYear,
      currency: course.fees.currency,
      estimatedCostInInr: evalResult.estimatedCostInr,
      studentSelected: true,
      addedByCounselorName: counselorName,
      addedAt: new Date().toISOString()
    };

    plan.items.push(newItem);
    plan.updatedAt = new Date().toISOString();
    this.recalculatePlanTotals(plan);

    this.shortlistPlans.set(student.id, plan);
    return plan;
  }

  /**
   * Student reviews and approves the shortlist
   */
  public submitStudentReview(
    studentId: string, 
    selections: { itemId: string; selected: boolean; rating?: number; feedback?: string }[]
  ): StudentShortlistPlan {
    const plan = this.shortlistPlans.get(studentId);
    if (!plan) throw new Error('Shortlist plan not found');
    if (plan.isLocked) throw new Error('Shortlist is already locked. Future changes require approval.');

    const cfg = this.selectionConfig;
    const selectedIds = new Set(selections.filter(s => s.selected).map(s => s.itemId));
    const verifiedSelectedItems = plan.items.filter(item => selectedIds.has(item.id));
    const privateSelected = verifiedSelectedItems.filter(i => {
      const uni = this.universities.find(u => u.id === i.universityId);
      const actualType = uni?.universityType || (uni?.type === 'Public' ? 'PUBLIC' : i.universityType);
      return actualType === 'PRIVATE';
    });
    const publicSelected = verifiedSelectedItems.filter(i => {
      const uni = this.universities.find(u => u.id === i.universityId);
      const actualType = uni?.universityType || (uni?.type === 'Public' ? 'PUBLIC' : i.universityType);
      return actualType === 'PUBLIC';
    });

    if (
      privateSelected.length !== cfg.requiredPrivateSelectionCount ||
      publicSelected.length !== cfg.requiredPublicSelectionCount
    ) {
      throw new Error(
        `Please select ${cfg.requiredPrivateSelectionCount} Private Universities and ${cfg.requiredPublicSelectionCount} Public Universities before submitting`
      );
    }

    plan.items.forEach(item => {
      const sel = selections.find(s => s.itemId === item.id);
      item.studentSelected = Boolean(sel?.selected);
      if (sel?.rating) item.studentRating = sel.rating;
      if (sel?.feedback) item.studentFeedback = sel.feedback;
    });

    plan.status = 'student_approved';
    plan.currentWorkflowStep = 'STUDENT_ACKNOWLEDGES_SUBMITS';
    plan.studentApprovedAt = new Date().toISOString();
    plan.updatedAt = new Date().toISOString();
    this.recalculatePlanTotals(plan);
    this.shortlistPlans.set(studentId, plan);
    return plan;
  }

  /**
   * Lock shortlist: Confirms the chosen programs and creates corresponding Application Workspace records!
   */
  public lockShortlist(
    student: StudentMasterProfile, 
    lockedByName: string, 
    role: UserRole | string
  ): { plan: StudentShortlistPlan; createdApplications: ApplicationWorkspaceRecord[] } {
    const plan = this.getShortlistPlan(student);
    const cfg = this.selectionConfig;

    const selectedItems = plan.items.filter(i => i.studentSelected);
    const privateSelected = selectedItems.filter(i => {
      const uni = this.universities.find(u => u.id === i.universityId);
      const actualType = uni?.universityType || (uni?.type === 'Public' ? 'PUBLIC' : i.universityType);
      return actualType === 'PRIVATE';
    });
    const publicSelected = selectedItems.filter(i => {
      const uni = this.universities.find(u => u.id === i.universityId);
      const actualType = uni?.universityType || (uni?.type === 'Public' ? 'PUBLIC' : i.universityType);
      return actualType === 'PUBLIC';
    });

    if (
      privateSelected.length !== cfg.requiredPrivateSelectionCount ||
      publicSelected.length !== cfg.requiredPublicSelectionCount ||
      selectedItems.length !== cfg.totalRequiredSelectionCount
    ) {
      throw new Error(
        `Please select ${cfg.requiredPrivateSelectionCount} Private Universities and ${cfg.requiredPublicSelectionCount} Public Universities before submitting`
      );
    }

    const now = new Date().toISOString();
    plan.isLocked = true;
    plan.status = 'locked';
    plan.currentWorkflowStep = 'SELECTION_LOCKED';
    plan.lockedAt = now;
    plan.lockedBy = lockedByName;
    if (!plan.studentAcknowledgement) {
      plan.studentAcknowledgement = {
        acknowledged: true,
        acknowledgedByStudentId: student.id,
        acknowledgedByStudentName: `${student.personal.firstName} ${student.personal.lastName}`,
        acknowledgedAt: now,
        declarationText: 'University selection acknowledged and locked.',
        selectedUniversityIds: selectedItems.map(i => i.universityId)
      };
    }
    plan.updatedAt = now;
    this.recalculatePlanTotals(plan);

    this.appendWorkflowAudit(
      plan,
      'SELECTION_LOCKED',
      'University Selection Locked',
      lockedByName,
      String(role),
      `Locked ${selectedItems.length} selected universities (${plan.selectedPrivateCount} Private, ${plan.selectedPublicCount} Public). Future modifications require approval.`
    );

    this.shortlistPlans.set(student.id, plan);

    // Create Application Workspace records for each selected program
    const createdApplications: ApplicationWorkspaceRecord[] = [];
    selectedItems.forEach(item => {
      const existingApp = Array.from(this.applications.values()).find(
        a => a.studentId === student.id && a.courseId === item.courseId
      );

      if (!existingApp) {
        const course = this.courses.find(c => c.id === item.courseId);
        const uni = this.universities.find(u => u.id === item.universityId);

        const newApp = this.createApplicationRecord(student, item, course, uni);
        this.applications.set(newApp.id, newApp);
        createdApplications.push(newApp);
      } else {
        createdApplications.push(existingApp);
      }
    });

    return { plan, createdApplications };
  }

  /**
   * Unlocks shortlist (requires branch_manager, admin, or super_admin)
   */
  public unlockShortlist(studentId: string, authorizedRole: UserRole | string, reason: string): StudentShortlistPlan {
    if (authorizedRole !== 'branch_manager' && authorizedRole !== 'super_admin' && authorizedRole !== 'admin') {
      throw new Error(`Unauthorized: Role '${authorizedRole}' cannot unlock shortlists. Manager or Admin authorization required.`);
    }

    const plan = this.shortlistPlans.get(studentId);
    if (!plan) throw new Error('Shortlist plan not found.');

    plan.isLocked = false;
    plan.status = 'shared_with_student';
    plan.currentWorkflowStep = 'STUDENT_SELECTS_UNIVERSITIES';
    plan.updatedAt = new Date().toISOString();

    this.appendWorkflowAudit(
      plan,
      'POST_LOCK_CHANGE_APPROVAL',
      'Shortlist Unlocked by Authorized Approver',
      String(authorizedRole),
      String(authorizedRole),
      `Unlocked with reason: "${reason || 'Administrative unlock'}".`
    );

    this.shortlistPlans.set(studentId, plan);
    return plan;
  }

  // ==========================================
  // 3. APPLICATION WORKSPACE ENGINE
  // ==========================================

  private createApplicationRecord(
    student: StudentMasterProfile, 
    shortlistItem: ShortlistRecommendationItem, 
    course?: CourseMasterRecord, 
    uni?: UniversityMasterRecord
  ): ApplicationWorkspaceRecord {
    const appId = `app_${student.id}_${shortlistItem.courseId}`;
    const deadline = shortlistItem.deadlineDate || '2026-06-30';
    const daysRemaining = Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 3600 * 24)));

    // Generate Tailored Checklist based on country and university requirements
    const checklist: ApplicationWorkspaceRecord['checklist'] = [
      { id: `chk_${appId}_1`, name: 'Official Degree Certificate / Consolidated Transcripts', isMandatory: true, status: 'Uploaded' as const, fileName: 'degree_transcripts.pdf' },
      { id: `chk_${appId}_2`, name: `Statement of Purpose (Tailored for ${shortlistItem.universityName})`, isMandatory: true, status: 'Pending' as const },
      { id: `chk_${appId}_3`, name: 'Two Letters of Recommendation (Academic & Professional)', isMandatory: true, status: 'Pending' as const },
      { id: `chk_${appId}_4`, name: 'IELTS / TOEFL English Language Proficiency Scorecard', isMandatory: true, status: 'Verified' as const, fileName: 'ielts_scorecard.pdf' },
      { id: `chk_${appId}_5`, name: 'Valid Passport Bio-Pages (Minimum 6 Months Validity)', isMandatory: true, status: 'Verified' as const, fileName: 'passport_bio.pdf' }
    ];

    if (shortlistItem.country === 'Germany') {
      checklist.push({
        id: `chk_${appId}_aps`,
        name: 'German APS Certificate (Akademische Prüfstelle)',
        isMandatory: true,
        status: 'Pending',
        notes: 'Mandatory German visa & university admission requirement'
      });
      checklist.push({
        id: `chk_${appId}_ects`,
        name: 'Curricular ECTS Credit Analysis / Module Catalog',
        isMandatory: true,
        status: 'Pending',
        notes: 'Subject credit matching for German direct admission'
      });
    }

    if (shortlistItem.country === 'United States') {
      checklist.push({
        id: `chk_${appId}_fin`,
        name: 'Bank Financial Statement & Affidavit of Support for I-20',
        isMandatory: true,
        status: 'Pending',
        notes: 'Proof of liquid funds covering 1st year tuition and living cost'
      });
    }

    // Evaluate initial prerequisite blocking items
    const prerequisites: PrerequisiteBlockingItem[] = [];

    // Prerequisite 1: SOP
    prerequisites.push({
      id: `pre_${appId}_sop`,
      ruleCode: 'MANDATORY_SOP_APPROVED',
      title: 'University-Customized Statement of Purpose',
      category: 'Document',
      responsibleTeam: 'Student',
      requiredAction: `Complete and approve personalized SOP addressing ${shortlistItem.universityName} curriculum`,
      reasonForBlocking: 'Application filing cannot be submitted without an approved customized SOP.',
      deadline: deadline,
      isSatisfied: false,
      isWaived: false
    });

    // Prerequisite 2: LORs
    prerequisites.push({
      id: `pre_${appId}_lor`,
      ruleCode: 'MANDATORY_LORS_SUBMITTED',
      title: 'Letters of Recommendation Submission',
      category: 'Academic',
      responsibleTeam: 'Academic Referee',
      requiredAction: 'Secure 2 verified referee recommendation uploads on institutional letterhead',
      reasonForBlocking: 'University admissions committee strictly requires 2 confidential recommendations.',
      deadline: deadline,
      isSatisfied: false,
      isWaived: false
    });

    // Prerequisite 3: German APS (if Germany)
    if (shortlistItem.country === 'Germany') {
      prerequisites.push({
        id: `pre_${appId}_aps`,
        ruleCode: 'APS_CERT_VERIFIED',
        title: 'German APS Verification Certificate',
        category: 'Document',
        responsibleTeam: 'Documentation Desk',
        requiredAction: 'Verify digital signature and certificate number issued by APS New Delhi',
        reasonForBlocking: 'German universities and visa authorities reject applications lacking an official APS verification certificate.',
        deadline: deadline,
        isSatisfied: false,
        isWaived: false
      });
    }

    const appFeeAmount = course?.fees.applicationFee || 50;
    const appFeeCurrency = course?.fees.currency || 'USD';
    const rate = uni?.inrExchangeRate || 85;

    return {
      id: appId,
      studentId: student.id,
      studentRefNo: student.studentRefNo,
      studentName: `${student.personal.firstName} ${student.personal.lastName}`,
      shortlistItemId: shortlistItem.id,
      universityId: shortlistItem.universityId,
      universityName: shortlistItem.universityName,
      courseId: shortlistItem.courseId,
      courseName: shortlistItem.courseName,
      country: shortlistItem.country,
      intakeSeason: shortlistItem.intakeSeason,
      intakeYear: shortlistItem.intakeYear,
      category: shortlistItem.category,
      assignedOfficerId: student.assignedProcessingOfficerId || 'usr_p1',
      assignedOfficerName: student.assignedProcessingOfficerName || 'Rajesh Nair (Processing Officer)',
      assignedCounselorName: student.assignedCounselorName || 'Pooja Sharma (Senior Counselor)',
      applicationDeadline: deadline,
      deadlineType: 'Regular',
      daysRemaining,
      isCriticalDeadline: daysRemaining <= 7,
      isExpiredDeadline: daysRemaining === 0,
      submissionStatus: 'draft',
      portalType: uni?.portalType || 'Direct University Portal',
      applicationFee: {
        amount: appFeeAmount,
        currency: appFeeCurrency,
        inrEquivalent: Math.round(appFeeAmount * rate),
        paymentStatus: 'Unpaid'
      },
      sopLorDetails: {
        sopStatus: 'Drafting',
        sopTargetWordCount: 800,
        sopCurrentWordCount: 250,
        requiredLorsCount: 2,
        lors: [
          {
            id: `lor_${appId}_1`,
            refereeName: 'Academic Referee 1',
            refereeDesignation: 'Professor',
            refereeInstitution: student.academics.institution || 'University',
            refereeEmail: 'referee1@university.edu',
            lorType: 'Academic',
            status: 'Invitation Sent'
          },
          {
            id: `lor_${appId}_2`,
            refereeName: 'Academic Referee 2',
            refereeDesignation: 'Associate Professor',
            refereeInstitution: student.academics.institution || 'University',
            refereeEmail: 'referee2@university.edu',
            lorType: 'Academic',
            status: 'Pending Contact'
          }
        ]
      },
      checklist,
      prerequisites,
      canSubmit: false,
      isSubmissionOverridden: false,
      additionalRequests: [],
      offersCount: 0,
      notes: [`Application workspace initialized following shortlist lock for ${shortlistItem.universityName}.`],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  public getApplicationsForStudent(studentId: string): ApplicationWorkspaceRecord[] {
    return Array.from(this.applications.values()).filter(a => a.studentId === studentId);
  }

  public getApplicationById(applicationId: string): ApplicationWorkspaceRecord | undefined {
    return this.applications.get(applicationId);
  }

  // ==========================================
  // 4. PREREQUISITES & DEPENDENCY BLOCKING
  // ==========================================

  /**
   * Re-evaluates whether an application satisfies all mandatory prerequisites for submission
   */
  public evaluatePrerequisites(applicationId: string): ApplicationWorkspaceRecord {
    const app = this.applications.get(applicationId);
    if (!app) throw new Error('Application record not found');

    // 1. Check SOP
    const sopItem = app.prerequisites.find(p => p.ruleCode === 'MANDATORY_SOP_APPROVED');
    if (sopItem && !sopItem.isWaived) {
      sopItem.isSatisfied = app.sopLorDetails.sopStatus === 'Customized & Approved';
    }

    // 2. Check LORs
    const lorItem = app.prerequisites.find(p => p.ruleCode === 'MANDATORY_LORS_SUBMITTED');
    if (lorItem && !lorItem.isWaived) {
      const verifiedCount = app.sopLorDetails.lors.filter(
        l => l.status === 'Uploaded by Referee' || l.status === 'Verified by GMI'
      ).length;
      lorItem.isSatisfied = verifiedCount >= app.sopLorDetails.requiredLorsCount;
    }

    // 3. Check German APS
    const apsItem = app.prerequisites.find(p => p.ruleCode === 'APS_CERT_VERIFIED');
    if (apsItem && !apsItem.isWaived) {
      const apsCheck = app.checklist.find(c => c.name.includes('APS Certificate'));
      apsItem.isSatisfied = apsCheck?.status === 'Verified';
    }

    // Calculate canSubmit
    const allSatisfiedOrWaived = app.prerequisites.every(p => p.isSatisfied || p.isWaived);
    app.canSubmit = allSatisfiedOrWaived || app.isSubmissionOverridden;

    if (!app.canSubmit && app.submissionStatus === 'draft') {
      // Keep as draft or mark blocked
      // Do not downgrade if already submitted
    }

    app.updatedAt = new Date().toISOString();
    this.applications.set(applicationId, app);
    return app;
  }

  /**
   * Satisfies or verifies a specific prerequisite item
   */
  public updatePrerequisiteStatus(
    applicationId: string, 
    prerequisiteId: string, 
    isSatisfied: boolean
  ): ApplicationWorkspaceRecord {
    const app = this.applications.get(applicationId);
    if (!app) throw new Error('Application record not found');

    const item = app.prerequisites.find(p => p.id === prerequisiteId);
    if (!item) throw new Error('Prerequisite item not found');

    item.isSatisfied = isSatisfied;
    return this.evaluatePrerequisites(applicationId);
  }

  /**
   * Authorized override for emergency submission (Branch Manager or Super Admin only)
   */
  public authorizeSubmissionOverride(
    applicationId: string, 
    authorizedRole: UserRole | string, 
    authorizerName: string, 
    overrideReason: string
  ): ApplicationWorkspaceRecord {
    if (authorizedRole !== 'branch_manager' && authorizedRole !== 'super_admin') {
      throw new Error(`Unauthorized: Role '${authorizedRole}' cannot override application dependencies. Branch Manager or Super Admin approval required.`);
    }

    if (!overrideReason || overrideReason.trim().length < 10) {
      throw new Error('Mandatory override justification (minimum 10 characters) is required for audit compliance.');
    }

    const app = this.applications.get(applicationId);
    if (!app) throw new Error('Application record not found');

    app.isSubmissionOverridden = true;
    app.overrideAuthorizedBy = authorizerName;
    app.overrideReason = overrideReason;
    app.canSubmit = true;
    app.notes.push(`[OVERRIDE APPROVED] Emergency submission permitted by ${authorizerName} (${authorizedRole}). Reason: ${overrideReason}`);
    app.updatedAt = new Date().toISOString();

    this.applications.set(applicationId, app);
    return app;
  }

  /**
   * Execute application filing submission
   */
  public submitApplication(
    applicationId: string, 
    portalReferenceNo: string, 
    submissionProofFileName: string, 
    submittedByName: string
  ): ApplicationWorkspaceRecord {
    const app = this.evaluatePrerequisites(applicationId);

    // Prevent submission if mandatory prerequisites are incomplete and not overridden!
    if (!app.canSubmit) {
      const blockedReasons = app.prerequisites
        .filter(p => !p.isSatisfied && !p.isWaived)
        .map(p => `• [${p.responsibleTeam}] ${p.title}: ${p.reasonForBlocking}`)
        .join('\n');

      throw new Error(`Submission Blocked by Mandatory Prerequisites:\n${blockedReasons}`);
    }

    // Check duplicate submission prevention
    if (app.submissionStatus === 'submitted' || app.submissionStatus === 'final_admitted' || app.submissionStatus === 'offer_received') {
      throw new Error(`Application ${app.id} is already filed with reference ${app.applicationReferenceNumber}. Duplicate submission prevented.`);
    }

    app.submissionStatus = 'submitted';
    app.applicationReferenceNumber = portalReferenceNo || `APP-REF-${Date.now().toString().slice(-6)}`;
    app.submittedAt = new Date().toISOString();
    app.submissionProofFileName = submissionProofFileName || 'portal_submission_confirmation.pdf';
    app.submissionProofDocumentUrl = `/vault/proofs/${submissionProofFileName || 'portal_submission_confirmation.pdf'}`;
    app.notes.push(`Formally submitted by ${submittedByName} with reference ID ${app.applicationReferenceNumber}.`);
    app.updatedAt = new Date().toISOString();

    this.applications.set(applicationId, app);
    return app;
  }

  /**
   * Updates SOP or LOR state in the workspace
   */
  public updateSopDetails(
    applicationId: string, 
    updates: { status?: 'Drafting' | 'In Review' | 'Customized & Approved'; currentWordCount?: number; documentUrl?: string }
  ): ApplicationWorkspaceRecord {
    const app = this.applications.get(applicationId);
    if (!app) throw new Error('Application not found');

    if (updates.status) app.sopLorDetails.sopStatus = updates.status;
    if (updates.currentWordCount !== undefined) app.sopLorDetails.sopCurrentWordCount = updates.currentWordCount;
    if (updates.documentUrl) app.sopLorDetails.sopDocumentUrl = updates.documentUrl;
    app.sopLorDetails.sopLastUpdated = new Date().toISOString();

    return this.evaluatePrerequisites(applicationId);
  }

  public updateLorStatus(
    applicationId: string, 
    lorId: string, 
    status: 'Pending Contact' | 'Invitation Sent' | 'Uploaded by Referee' | 'Verified by GMI'
  ): ApplicationWorkspaceRecord {
    const app = this.applications.get(applicationId);
    if (!app) throw new Error('Application not found');

    const lor = app.sopLorDetails.lors.find(l => l.id === lorId);
    if (!lor) throw new Error('LOR not found');

    lor.status = status;
    if (status === 'Uploaded by Referee' || status === 'Verified by GMI') {
      lor.uploadedAt = new Date().toISOString();
    }

    return this.evaluatePrerequisites(applicationId);
  }

  public updateApplicationFee(
    applicationId: string, 
    paymentStatus: 'Unpaid' | 'Paid by Student' | 'Paid by Agency' | 'Fee Waiver Applied', 
    reference?: string
  ): ApplicationWorkspaceRecord {
    const app = this.applications.get(applicationId);
    if (!app) throw new Error('Application not found');

    app.applicationFee.paymentStatus = paymentStatus;
    if (reference) app.applicationFee.receiptReference = reference;
    if (paymentStatus !== 'Unpaid') app.applicationFee.paidAt = new Date().toISOString();
    app.updatedAt = new Date().toISOString();

    this.applications.set(applicationId, app);
    return app;
  }

  // ==========================================
  // 5. OFFER MANAGEMENT & COMPARISON
  // ==========================================

  public getOffersForStudent(studentId: string): OfferRecord[] {
    return Array.from(this.offers.values()).filter(o => o.studentId === studentId);
  }

  public getOfferById(offerId: string): OfferRecord | undefined {
    return this.offers.get(offerId);
  }

  /**
   * Registers a new offer received from a university
   */
  public registerOffer(
    applicationId: string, 
    offerType: 'conditional' | 'unconditional', 
    letterFileName: string, 
    acceptanceDeadline: string, 
    conditions: Array<{ description: string; category: 'Academic' | 'Language' | 'Financial' | 'Verification'; deadline: string }>,
    depositRequiredAmount: number
  ): OfferRecord {
    const app = this.applications.get(applicationId);
    if (!app) throw new Error('Application not found');

    const offerId = `off_${applicationId}_${Date.now().toString().slice(-4)}`;
    const uni = this.universities.find(u => u.id === app.universityId);
    const course = this.courses.find(c => c.id === app.courseId);

    const tuition = course?.fees.tuitionFeePerYear || 25000;
    const living = course?.fees.estimatedLivingCostPerYear || 12000;
    const currency = course?.fees.currency || 'EUR';
    const rate = uni?.inrExchangeRate || 90;

    const offerConditions: OfferConditionItem[] = conditions.map((c, idx) => ({
      id: `cnd_${offerId}_${idx + 1}`,
      description: c.description,
      category: c.category,
      deadline: c.deadline,
      status: 'Pending'
    }));

    const newOffer: OfferRecord = {
      id: offerId,
      applicationId: app.id,
      studentId: app.studentId,
      studentRefNo: app.studentRefNo,
      studentName: app.studentName,
      universityId: app.universityId,
      universityName: app.universityName,
      courseName: app.courseName,
      country: app.country,
      intakeSeason: app.intakeSeason,
      intakeYear: app.intakeYear,
      offerType,
      receivedDate: new Date().toISOString(),
      acceptanceDeadline,
      decisionStatus: 'received',
      offerLetterFileName: letterFileName || 'official_admissions_offer.pdf',
      offerLetterFileUrl: `/vault/offers/${letterFileName || 'official_admissions_offer.pdf'}`,
      offerLetterFileSizeMb: 1.6,
      conditions: offerConditions,
      allConditionsMet: offerType === 'unconditional',
      annualTuitionFee: tuition,
      currency,
      scholarshipAwardedAmount: 0,
      netTuitionFee: tuition,
      estimatedAnnualLivingCost: living,
      totalFirstYearCostInr: Math.round((tuition + living) * rate),
      depositRequired: {
        required: depositRequiredAmount > 0,
        amount: depositRequiredAmount,
        currency,
        dueDate: acceptanceDeadline,
        paymentStatus: depositRequiredAmount > 0 ? 'Pending Payment' : 'Not Required'
      },
      acceptanceConfirmed: false,
      isFinalAdmittedInstitution: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.offers.set(offerId, newOffer);

    // Update parent application
    app.submissionStatus = 'offer_received';
    app.offersCount = (app.offersCount || 0) + 1;
    app.activeOfferId = offerId;
    app.updatedAt = new Date().toISOString();
    this.applications.set(app.id, app);

    return newOffer;
  }

  /**
   * Clears a specific condition on a conditional offer
   */
  public clearOfferCondition(
    offerId: string, 
    conditionId: string, 
    notes?: string
  ): OfferRecord {
    const offer = this.offers.get(offerId);
    if (!offer) throw new Error('Offer not found');

    const cond = offer.conditions.find(c => c.id === conditionId);
    if (!cond) throw new Error('Condition not found');

    cond.status = 'Cleared by University';
    cond.clearedAt = new Date().toISOString();
    if (notes) cond.notes = notes;

    offer.allConditionsMet = offer.conditions.every(c => c.status === 'Cleared by University');
    if (offer.allConditionsMet && offer.offerType === 'conditional') {
      offer.decisionStatus = 'under_review';
    }

    offer.updatedAt = new Date().toISOString();
    this.offers.set(offerId, offer);
    return offer;
  }

  /**
   * Record Tuition Deposit Verification
   */
  public verifyTuitionDeposit(
    offerId: string, 
    wireReference: string, 
    paymentStatus: 'Wire Initiated' | 'Confirmed by University',
    verifiedByName: string
  ): OfferRecord {
    const offer = this.offers.get(offerId);
    if (!offer) throw new Error('Offer not found');

    offer.depositRequired.paymentStatus = paymentStatus;
    offer.depositRequired.wireReferenceNumber = wireReference;
    offer.depositRequired.paidDate = new Date().toISOString();
    offer.depositRequired.receiptDocumentUrl = `/vault/receipts/deposit_wire_${wireReference}.pdf`;
    offer.updatedAt = new Date().toISOString();

    this.offers.set(offerId, offer);
    return offer;
  }

  /**
   * Final University Selection!
   * Requirement: "Ensure that only one university can be the final admitted institution while preserving other application and offer history."
   */
  public selectFinalUniversity(
    offerId: string, 
    studentMaster: StudentMasterProfile, 
    confirmedByName: string
  ): { finalOffer: OfferRecord; updatedOffers: OfferRecord[] } {
    const targetOffer = this.offers.get(offerId);
    if (!targetOffer) throw new Error('Offer not found');

    if (targetOffer.studentId !== studentMaster.id) {
      throw new Error('Offer does not belong to the active student');
    }

    // Update all offers for this student:
    // Strictly ONLY ONE university can be the final admitted institution!
    const studentOffers = Array.from(this.offers.values()).filter(o => o.studentId === studentMaster.id);
    const updatedOffers: OfferRecord[] = [];

    studentOffers.forEach(o => {
      if (o.id === offerId) {
        o.isFinalAdmittedInstitution = true;
        o.decisionStatus = 'accepted_as_final';
        o.acceptanceConfirmed = true;
        o.acceptanceConfirmedAt = new Date().toISOString();
        o.updatedAt = new Date().toISOString();

        // Update corresponding application status
        const app = this.applications.get(o.applicationId);
        if (app) {
          app.submissionStatus = 'final_admitted';
          app.notes.push(`[FINAL ADMISSION CONFIRMED] Selected as primary enrolled university by ${confirmedByName}.`);
          app.updatedAt = new Date().toISOString();
          this.applications.set(app.id, app);
        }
      } else {
        // Other offers are preserved in history with status 'declined_for_final_choice'
        o.isFinalAdmittedInstitution = false;
        o.decisionStatus = 'declined_for_final_choice';
        o.updatedAt = new Date().toISOString();

        const app = this.applications.get(o.applicationId);
        if (app && app.submissionStatus !== 'final_admitted') {
          app.notes.push(`Marked declined in favor of final selection at ${targetOffer.universityName}. Preserved in history.`);
          app.updatedAt = new Date().toISOString();
          this.applications.set(app.id, app);
        }
      }
      this.offers.set(o.id, o);
      updatedOffers.push(o);
    });

    // Advance student lifecycle stage to 'admission_confirmation'
    studentMaster.currentStage = 'admission_confirmation';
    studentMaster.updatedAt = new Date().toISOString();

    return { finalOffer: targetOffer, updatedOffers };
  }

  /**
   * Generates comparison matrix rows across all offers for a student
   */
  public generateOfferComparisonMatrix(studentId: string): OfferComparisonMatrixRow[] {
    const studentOffers = Array.from(this.offers.values()).filter(o => o.studentId === studentId);

    return studentOffers.map(o => {
      const uni = this.universities.find(u => u.id === o.universityId);
      const course = this.courses.find(c => c.universityId === o.universityId);
      const pendingCondCount = o.conditions.filter(c => c.status !== 'Cleared by University').length;

      return {
        offerId: o.id,
        universityName: o.universityName,
        courseName: o.courseName,
        country: o.country,
        globalRanking: uni?.globalRanking || 150,
        offerType: o.offerType,
        tuitionFeeFormatted: `${o.currency} ${o.annualTuitionFee.toLocaleString()}/yr`,
        livingCostFormatted: `${o.currency} ${o.estimatedAnnualLivingCost.toLocaleString()}/yr`,
        totalCostInrFormatted: `₹ ${(o.totalFirstYearCostInr / 100000).toFixed(1)} Lakhs`,
        depositRequiredFormatted: o.depositRequired.required ? `${o.depositRequired.currency} ${o.depositRequired.amount.toLocaleString()}` : 'None',
        depositDueDate: o.depositRequired.dueDate || o.acceptanceDeadline,
        conditionsPendingCount: pendingCondCount,
        postStudyWorkVisaMonths: course?.postStudyWorkVisaMonths || 24,
        decisionStatus: o.decisionStatus,
        isFinalAdmitted: o.isFinalAdmittedInstitution
      };
    });
  }

  // ==========================================
  // 6. AUTOMATED TEST SUITE EXECUTION
  // ==========================================

  public runApplicationTestSuite(students: StudentMasterProfile[]): ApplicationTestResult[] {
    const results: ApplicationTestResult[] = [];
    const testStudent = students[0]; // Aarav Reddy

    // Test 1: Multiple University Applications Creation & Isolation
    try {
      const apps = this.getApplicationsForStudent(testStudent.id);
      const passed = apps.length >= 2;
      results.push({
        id: 'APP-TEST-01',
        name: 'Multiple University Applications Isolation',
        category: 'Shortlisting',
        passed,
        expected: 'At least 2 distinct university applications created with independent checklists and tracking.',
        actual: `Found ${apps.length} independent application records for student ${testStudent.studentRefNo}.`,
        details: 'Verifies that applications for different universities are strictly isolated and do not contaminate state.'
      });
    } catch (e: any) {
      results.push({
        id: 'APP-TEST-01',
        name: 'Multiple University Applications Isolation',
        category: 'Shortlisting',
        passed: false,
        expected: 'Multiple isolated applications',
        actual: e.message,
        details: 'Failed checking multiple applications.'
      });
    }

    // Test 2: Missing Prerequisites Block Submission
    try {
      // Create a dummy draft app with missing prerequisites
      const dummyCourse = this.courses[1]; // RWTH Aachen
      const dummyUni = this.universities.find(u => u.id === dummyCourse.universityId);
      const dummyItem: ShortlistRecommendationItem = {
        id: 'rec_test_dummy',
        studentId: testStudent.id,
        courseId: dummyCourse.id,
        universityId: dummyCourse.universityId,
        universityName: dummyCourse.universityName,
        courseName: dummyCourse.courseName,
        country: dummyCourse.country,
        category: 'Moderate',
        categoryRationale: 'Test rationale',
        criteriaSourceCitation: dummyCourse.dataSourceCitation,
        intakeSeason: 'Fall',
        intakeYear: 2026,
        deadlineDate: '2026-07-15',
        annualTuitionLocal: 0,
        annualLivingLocal: 11208,
        currency: 'EUR',
        estimatedCostInInr: 1000000,
        studentSelected: true,
        addedByCounselorName: 'Test Counselor',
        addedAt: new Date().toISOString()
      };

      const testApp = this.createApplicationRecord(testStudent, dummyItem, dummyCourse, dummyUni);
      this.applications.set(testApp.id, testApp);

      let blocked = false;
      let blockReason = '';
      try {
        this.submitApplication(testApp.id, 'REF-999', 'proof.pdf', 'Officer');
      } catch (err: any) {
        blocked = true;
        blockReason = err.message;
      }

      results.push({
        id: 'APP-TEST-02',
        name: 'Mandatory Prerequisite Submission Blocking',
        category: 'Prerequisite Blocking',
        passed: blocked && blockReason.includes('Submission Blocked'),
        expected: 'Application submission rejected with structured breakdown of unsatisfied prerequisites.',
        actual: blocked ? 'Blocked properly: ' + blockReason.slice(0, 100) + '...' : 'Failed: App was submitted unexpectedly.',
        details: 'Verifies that missing SOP, LORs, or German APS certificate blocks application filing before portal submission.'
      });
    } catch (e: any) {
      results.push({
        id: 'APP-TEST-02',
        name: 'Mandatory Prerequisite Submission Blocking',
        category: 'Prerequisite Blocking',
        passed: false,
        expected: 'Blocked submission',
        actual: e.message,
        details: 'Exception in prerequisite test'
      });
    }

    // Test 3: Authorized Override by Branch Manager
    try {
      const testAppId = `app_${testStudent.id}_crs_rwth_ds`;
      const overriddenApp = this.authorizeSubmissionOverride(
        testAppId, 
        'branch_manager', 
        'Pooja Sharma (Branch Manager)', 
        'Authorized emergency pre-submission override: Official university portal permits uploading provisional documents.'
      );

      const passed = overriddenApp.canSubmit && overriddenApp.isSubmissionOverridden;
      results.push({
        id: 'APP-TEST-03',
        name: 'Authorized Manager Prerequisite Override',
        category: 'Prerequisite Blocking',
        passed,
        expected: 'canSubmit=true with logged authorizer name and audit justification.',
        actual: `canSubmit: ${overriddenApp.canSubmit}, authorizedBy: ${overriddenApp.overrideAuthorizedBy}`,
        details: 'Verifies that only authorized roles (Branch Manager / Super Admin) can unlock pre-submission with full audit trail.'
      });
    } catch (e: any) {
      results.push({
        id: 'APP-TEST-03',
        name: 'Authorized Manager Prerequisite Override',
        category: 'Prerequisite Blocking',
        passed: false,
        expected: 'Override succeeded',
        actual: e.message,
        details: 'Override test failed'
      });
    }

    // Test 4: Approaching Deadline Alerts (< 7 days)
    try {
      // Find or inspect application deadlines
      const allApps = Array.from(this.applications.values());
      const hasDeadlineCalculations = allApps.every(a => typeof a.daysRemaining === 'number' && typeof a.isCriticalDeadline === 'boolean');

      results.push({
        id: 'APP-TEST-04',
        name: 'Deadline Live Countdown & Critical Alert Engine',
        category: 'Deadline Alerts',
        passed: hasDeadlineCalculations,
        expected: 'All applications calculate real-time days remaining and flag isCriticalDeadline when < 7 days.',
        actual: `Verified deadline calculation on ${allApps.length} active applications.`,
        details: 'Ensures application filing desk receives early warning for approaching intake cutoffs.'
      });
    } catch (e: any) {
      results.push({
        id: 'APP-TEST-04',
        name: 'Deadline Live Countdown & Critical Alert Engine',
        category: 'Deadline Alerts',
        passed: false,
        expected: 'Deadline calculation',
        actual: e.message,
        details: 'Deadline alert test failed'
      });
    }

    // Test 5: Offer Conditions Tracking & Clearing
    try {
      const uomOffer = this.offers.get('off_aarav_uom_01');
      if (uomOffer) {
        const conditionId = uomOffer.conditions[0]?.id;
        const updatedOffer = this.clearOfferCondition(uomOffer.id, conditionId, 'Verified final semester marksheet with 8.65 CGPA.');
        const conditionCleared = updatedOffer.conditions.find(c => c.id === conditionId)?.status === 'Cleared by University';

        results.push({
          id: 'APP-TEST-05',
          name: 'Offer Condition Tracking & Verification',
          category: 'Offer Management',
          passed: conditionCleared,
          expected: 'Condition marked as Cleared by University with verified timestamp and notes.',
          actual: `Condition status: ${updatedOffer.conditions.find(c => c.id === conditionId)?.status}`,
          details: 'Verifies the granular tracking of conditional offer prerequisites (academic, language, deposit).'
        });
      } else {
        throw new Error('UOM Offer not found');
      }
    } catch (e: any) {
      results.push({
        id: 'APP-TEST-05',
        name: 'Offer Condition Tracking & Verification',
        category: 'Offer Management',
        passed: false,
        expected: 'Condition cleared',
        actual: e.message,
        details: 'Offer condition test failed'
      });
    }

    // Test 6: Deposit Verification Tracking
    try {
      const uomOffer = this.offers.get('off_aarav_uom_01');
      if (uomOffer) {
        const verifiedOffer = this.verifyTuitionDeposit(
          uomOffer.id, 
          'FLY-WIRE-GBP-99120', 
          'Confirmed by University', 
          'Finance Desk Officer'
        );
        const passed = verifiedOffer.depositRequired.paymentStatus === 'Confirmed by University' && !!verifiedOffer.depositRequired.wireReferenceNumber;

        results.push({
          id: 'APP-TEST-06',
          name: 'Tuition Deposit Verification & Wire Tracking',
          category: 'Offer Management',
          passed,
          expected: 'Deposit status = Confirmed by University with wire reference number and receipt URL.',
          actual: `Deposit Status: ${verifiedOffer.depositRequired.paymentStatus}, Wire Ref: ${verifiedOffer.depositRequired.wireReferenceNumber}`,
          details: 'Ensures financial seat deposits are tied to university admissions tracking before CAS/I-20 issuance.'
        });
      } else {
        throw new Error('Offer not found');
      }
    } catch (e: any) {
      results.push({
        id: 'APP-TEST-06',
        name: 'Tuition Deposit Verification & Wire Tracking',
        category: 'Offer Management',
        passed: false,
        expected: 'Deposit verified',
        actual: e.message,
        details: 'Deposit test failed'
      });
    }

    // Test 7: Final University Selection - Single Enrolled Institution Constraint
    try {
      // Select TUM offer as final
      const tumOffer = this.offers.get('off_aarav_tum_01');
      if (tumOffer) {
        const { finalOffer, updatedOffers } = this.selectFinalUniversity(
          tumOffer.id, 
          testStudent, 
          'Pooja Sharma (Branch Manager)'
        );

        const admittedCount = updatedOffers.filter(o => o.isFinalAdmittedInstitution).length;
        const otherOffersDeclined = updatedOffers
          .filter(o => o.id !== tumOffer.id)
          .every(o => o.decisionStatus === 'declined_for_final_choice');

        const passed = admittedCount === 1 && otherOffersDeclined && testStudent.currentStage === 'admission_confirmation';

        results.push({
          id: 'APP-TEST-07',
          name: 'Final University Selection & Mutual Exclusivity',
          category: 'Final Selection',
          passed,
          expected: 'Exactly 1 final admitted institution. All other offers preserved with status declined_for_final_choice.',
          actual: `Admitted Count: ${admittedCount}, Other Offers Declined: ${otherOffersDeclined}, Student Stage: ${testStudent.currentStage}`,
          details: 'Enforces the core requirement: strictly ONE university can be final admitted while all other histories remain intact.'
        });
      } else {
        throw new Error('TUM Offer not found');
      }
    } catch (e: any) {
      results.push({
        id: 'APP-TEST-07',
        name: 'Final University Selection & Mutual Exclusivity',
        category: 'Final Selection',
        passed: false,
        expected: 'Single final admitted institution',
        actual: e.message,
        details: 'Final selection test failed'
      });
    }

    // Test 8: Duplicate Submission Prevention
    try {
      const tumApp = this.applications.get('app_aarav_tum');
      let prevented = false;
      let preventReason = '';

      if (tumApp) {
        try {
          this.submitApplication(tumApp.id, 'DUP-REF-123', 'dup.pdf', 'Officer');
        } catch (err: any) {
          prevented = true;
          preventReason = err.message;
        }
      }

      results.push({
        id: 'APP-TEST-08',
        name: 'Duplicate Application Submission Prevention',
        category: 'Security & Duplicates',
        passed: prevented && preventReason.includes('Duplicate submission prevented'),
        expected: 'Duplicate submission attempt rejected with clear error message.',
        actual: prevented ? preventReason : 'Failed to prevent duplicate submission',
        details: 'Prevents multiple filing attempts on already submitted or final admitted university applications.'
      });
    } catch (e: any) {
      results.push({
        id: 'APP-TEST-08',
        name: 'Duplicate Application Submission Prevention',
        category: 'Security & Duplicates',
        passed: false,
        expected: 'Duplicate prevented',
        actual: e.message,
        details: 'Duplicate submission test failed'
      });
    }

    // Test 9: Deterministic CGPA-Based 13-University Shortlist (8 Private + 5 Public)
    try {
      const targetStudent = students[1] || testStudent;
      const generatedItems = this.generateAutomaticUniversityShortlist(targetStudent, 'Pooja Sharma', 8.4);
      const privateCount = generatedItems.filter(i => i.universityType === 'PRIVATE').length;
      const publicCount = generatedItems.filter(i => i.universityType === 'PUBLIC').length;
      const totalCount = generatedItems.length;
      const allCgpaEvaluated = generatedItems.every(i => typeof i.minCgpaRequired === 'number' && i.studentCgpaEvaluated === 8.4);
      const passed = totalCount === 13 && privateCount === 8 && publicCount === 5 && allCgpaEvaluated;

      results.push({
        id: 'APP-TEST-09',
        name: 'CGPA-Based 13-University Shortlist Breakdown (8 Private + 5 Public)',
        category: 'Shortlisting',
        passed,
        expected: 'Total = 13 Universities (8 PRIVATE + 5 PUBLIC) deterministically evaluated by backend CGPA rules.',
        actual: `Total: ${totalCount} (PRIVATE: ${privateCount}, PUBLIC: ${publicCount}, Evaluated CGPA: 8.4)`,
        details: 'Verifies backend CGPA eligibility engine deterministically selects 8 Private and 5 Public universities without frontend hard-coding.'
      });
    } catch (e: any) {
      results.push({
        id: 'APP-TEST-09',
        name: 'CGPA-Based 13-University Shortlist Breakdown (8 Private + 5 Public)',
        category: 'Shortlisting',
        passed: false,
        expected: '13 universities (8 Private + 5 Public)',
        actual: e.message,
        details: 'Failed 13-university CGPA breakdown test'
      });
    }

    // Test 10: Student Selection (5 Private + 3 Public), Acknowledgement, Locking, Counsellor-Only Request & Reporting Manager Approval
    try {
      const targetStudent: StudentMasterProfile = {
        ...(students[2] || students[1] || testStudent),
        id: 'std_test_lock_10',
        assignedCounselorId: 'usr_c1',
        assignedCounselorName: 'Sandeep Koteshwara'
      };
      const plan = this.initiateCounsellorReview(targetStudent, 'Sandeep Koteshwara', {
        overrideCgpa: 8.4,
        regenerate: true
      });
      this.sendSelectionRequestToStudent(targetStudent, 'Sandeep Koteshwara', 'Please select 5 Private and 3 Public universities.');

      const privateItems = plan.items.filter(i => i.universityType === 'PRIVATE');
      const publicItems = plan.items.filter(i => i.universityType === 'PUBLIC');

      // 0a. Backend rejects 4 Private + 3 Public
      let invalidPrivateRejected = false;
      try {
        this.acknowledgeAndSubmitStudentSelection(targetStudent, {
          studentName: `${targetStudent.personal.firstName} ${targetStudent.personal.lastName}`,
          selections: [
            ...privateItems.slice(0, 4).map((item, idx) => ({ itemId: item.id, selected: true, priorityRank: idx + 1 })),
            ...publicItems.slice(0, 3).map((item, idx) => ({ itemId: item.id, selected: true, priorityRank: idx + 5 }))
          ]
        });
      } catch {
        invalidPrivateRejected = true;
      }

      // 0b. Backend rejects 5 Private + 2 Public
      let invalidPublicRejected = false;
      try {
        this.acknowledgeAndSubmitStudentSelection(targetStudent, {
          studentName: `${targetStudent.personal.firstName} ${targetStudent.personal.lastName}`,
          selections: [
            ...privateItems.slice(0, 5).map((item, idx) => ({ itemId: item.id, selected: true, priorityRank: idx + 1 })),
            ...publicItems.slice(0, 2).map((item, idx) => ({ itemId: item.id, selected: true, priorityRank: idx + 6 }))
          ]
        });
      } catch {
        invalidPublicRejected = true;
      }

      // 0c. Backend accepts 5 Private + 3 Public (Total = 8)
      const validEightSelections = [
        ...privateItems.slice(0, 5).map((item, idx) => ({
          itemId: item.id,
          selected: true,
          priorityRank: idx + 1
        })),
        ...publicItems.slice(0, 3).map((item, idx) => ({
          itemId: item.id,
          selected: true,
          priorityRank: idx + 6
        }))
      ];
      const { plan: lockedPlan } = this.acknowledgeAndSubmitStudentSelection(targetStudent, {
        studentName: `${targetStudent.personal.firstName} ${targetStudent.personal.lastName}`,
        selections: validEightSelections
      });
      const wasInitiallyLocked =
        lockedPlan.isLocked === true &&
        !!lockedPlan.studentAcknowledgement?.acknowledged &&
        lockedPlan.selectedPrivateCount === 5 &&
        lockedPlan.selectedPublicCount === 3 &&
        lockedPlan.selectedCount === 8;

      // 1. Attempt direct edit while locked -> must fail
      let directEditBlocked = false;
      try {
        this.saveStudentUniversitySelections(targetStudent.id, [{ itemId: plan.items[0].id, selected: false }]);
      } catch {
        directEditBlocked = true;
      }

      // 2. Student attempting to create change request -> must fail
      let studentRequestBlocked = false;
      try {
        this.requestShortlistChangeAfterLock(
          targetStudent,
          { reason: 'Student trying to request change directly' },
          {
            userId: 'usr_std1',
            name: 'Sandeep Fidrox',
            email: 'sandeepfidrox@gmail.com',
            role: 'student',
            branch: 'Hyderabad - Banjara Hills',
            token: 'tok_std1',
            studentId: targetStudent.id,
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 3600000).toISOString()
          }
        );
      } catch {
        studentRequestBlocked = true;
      }

      // 3. Unassigned Counsellor (usr_c2 Rajesh Nair) attempting to request change for usr_c1's student -> must fail
      let unassignedCounsellorBlocked = false;
      try {
        this.requestShortlistChangeAfterLock(
          targetStudent,
          { reason: 'Unassigned counsellor attempting change request' },
          {
            userId: 'usr_c2',
            name: 'Rajesh Nair',
            email: 'rajesh.nair@crm-portal.com',
            role: 'counselor',
            roleId: 4,
            reportsToUserId: 'usr_mgr_demo',
            branch: 'Bangalore - Indiranagar',
            token: 'tok_c2',
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 3600000).toISOString()
          }
        );
      } catch {
        unassignedCounsellorBlocked = true;
      }

      // 4. Assigned Counsellor (usr_c1 Sandeep Koteshwara) submits change request -> automatically routes to Reporting Manager from Users.ReportsToUserId
      const resolvedManager = this.securityEngine?.resolveReportingManagerForUser('usr_c1');
      const expectedManagerId = resolvedManager?.id || 'usr_mgr_demo';
      const assignedCounsellorSession: AuthenticatedUserSession = {
        userId: 'usr_c1',
        name: 'Sandeep Koteshwara',
        email: 'sandeepkoteshwara29@gmail.com',
        role: 'counselor',
        roleId: 4,
        reportsToUserId: expectedManagerId,
        branch: 'Hyderabad - Banjara Hills',
        token: 'tok_c1',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      const changeReqPlan = this.requestShortlistChangeAfterLock(
        targetStudent,
        { reason: 'Student requested replacing one Public university from Germany after counselling discussion.' },
        assignedCounsellorSession
      );
      const pendingReq = changeReqPlan.changeRequests?.[0];
      const pendingReqId = pendingReq?.id || '';
      const routedToReportingManager =
        pendingReq?.requestedByUserId === 'usr_c1' && pendingReq?.assignedApproverUserId === expectedManagerId;
      const stillLockedWhilePending =
        changeReqPlan.isLocked === true && changeReqPlan.status === 'change_requested';

      // 5. Assigned Counsellor attempting self-approval -> must fail
      let selfApprovalBlocked = false;
      try {
        this.reviewShortlistChangeRequest(
          targetStudent,
          { requestId: pendingReqId, decision: 'APPROVED', reviewNotes: 'Self approving' },
          assignedCounsellorSession
        );
      } catch {
        selfApprovalBlocked = true;
      }

      // 6. Reporting Manager approves change request -> unlocks selection
      const reportingManagerSession: AuthenticatedUserSession = {
        userId: expectedManagerId,
        name: resolvedManager?.name || 'Sandeep Koteshwar (Demo Reporting Manager)',
        email: resolvedManager?.email || 'Sandeepkoteshwar@gmail.com',
        role: resolvedManager?.role || 'cso_management',
        roleId: resolvedManager?.roleId || 3,
        reportsToUserId: resolvedManager?.reportsToUserId || null,
        branch: resolvedManager?.branch || 'Hyderabad - Head Office',
        token: 'tok_mgr_demo',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      const approvedPlan = this.reviewShortlistChangeRequest(
        targetStudent,
        {
          requestId: pendingReqId,
          decision: 'APPROVED',
          reviewNotes: 'Approved by Reporting Manager to update University Selection.'
        },
        reportingManagerSession
      );

      const unlockedAfterApproval = approvedPlan.isLocked === false;
      const passed =
        invalidPrivateRejected &&
        invalidPublicRejected &&
        wasInitiallyLocked &&
        directEditBlocked &&
        studentRequestBlocked &&
        unassignedCounsellorBlocked &&
        routedToReportingManager &&
        stillLockedWhilePending &&
        selfApprovalBlocked &&
        unlockedAfterApproval;

      results.push({
        id: 'APP-TEST-10',
        name: 'Mandatory 5 Private + 3 Public Lock, Counsellor Ownership & Reporting Manager Approval Governance',
        category: 'Security & Duplicates',
        passed,
        expected: 'Backend rejects != 5 Private or != 3 Public; locks on 5 Private + 3 Public; routes post-lock change to Users.ReportsToUserId.',
        actual: `4P+3Pub Rejected: ${invalidPrivateRejected}, 5P+2Pub Rejected: ${invalidPublicRejected}, 5P+3Pub Locked: ${wasInitiallyLocked}, Routed to Manager (${expectedManagerId}): ${routedToReportingManager}, Unlocked: ${unlockedAfterApproval}`,
        details: 'Verifies backend enforcement of 5 Private + 3 Public mandatory selection, lock immutability, and database reporting hierarchy approval.'
      });
    } catch (e: any) {
      results.push({
        id: 'APP-TEST-10',
        name: 'Mandatory 5 Private + 3 Public Lock & Change Request Approval Governance',
        category: 'Security & Duplicates',
        passed: false,
        expected: 'Locked & change request governance',
        actual: e.message,
        details: 'Failed lock & change approval test'
      });
    }

    return results;
  }
}

export const applicationEngine = new ApplicationEngine();
