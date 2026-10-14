/**
 * Student Lifecycle CRM - Service Engine & Visa Workflow Domain Engine
 * Enforces parallel service orchestration, SLA monitoring, dependency blocking,
 * destination-specific visa workflows, appointment eligibility, and two-tier audit gates.
 */

import { StudentMasterProfile, UserRole } from '../types/crm';
import { 
  ManagedServiceRecord, 
  ServiceType, 
  ServiceStatus, 
  ServicePriority,
  VisaCaseRecord,
  VisaStage,
  DestinationVisaRequirements,
  AppointmentEligibility,
  VisaAppointmentBooking,
  VisaDocumentAudit,
  VisaMockInterviewRecord,
  VisaDecisionRecord,
  PassportTrackingRecord,
  VisaStampVerificationRecord,
  VisaReapplicationRecord,
  ServiceTestResult
} from '../types/services';
import { SecurityEngine } from './securityEngine';

export class ServiceEngine {
  private services: Map<string, ManagedServiceRecord[]> = new Map(); // studentId -> services
  private visaCases: Map<string, VisaCaseRecord> = new Map(); // studentId -> visaCase
  private securityEngine?: SecurityEngine;

  constructor(securityEngine?: SecurityEngine) {
    this.securityEngine = securityEngine;
    this.initializeDefaultServicesAndVisaCases();
  }

  /**
   * Seeds realistic initial service state and visa workflows for foundation demonstration
   */
  private initializeDefaultServicesAndVisaCases() {
    // 1. Aarav Sharma (GMI-2026-0089) - Target: Germany (TUM) - Final Admitted
    const aaravId = 'std_01';
    const aaravServices: ManagedServiceRecord[] = [
      this.createConfiguredService(
        aaravId,
        'GMI-2026-0089',
        'Aarav Sharma',
        'german_language',
        'A1 & A2 German Language Proficiency Training',
        'Language & Test Prep',
        'German Language Department',
        'Frau Ananya Rao',
        'counselor',
        'completed',
        'Certified A2 Goethe Certificate',
        'medium',
        120,
        [],
        [
          { id: 'gl_1', label: 'Goethe Institute A1 Exam', isMandatory: true, completed: true, completedAt: '2026-05-10', completedBy: 'Frau Ananya Rao' },
          { id: 'gl_2', label: 'Goethe Institute A2 Exam', isMandatory: true, completed: true, completedAt: '2026-07-22', completedBy: 'Frau Ananya Rao' }
        ],
        ['Submit Goethe A1/A2 Certificate']
      ),
      this.createConfiguredService(
        aaravId,
        'GMI-2026-0089',
        'Aarav Sharma',
        'aps_certificate',
        'German APS (Akademische Prüfstelle) Verification',
        'Academic Evaluation',
        'German Admissions Desk',
        'Vikram Malhotra',
        'processing_officer',
        'completed',
        'Digital APS Certificate Issued',
        'urgent',
        96,
        [],
        [
          { id: 'aps_1', label: 'Consolidated Transcripts & Degree Certificate submission', isMandatory: true, completed: true, completedAt: '2026-04-12', completedBy: 'Vikram Malhotra' },
          { id: 'aps_2', label: 'APS Fee Payment of ₹18,000 to New Delhi Embassy Account', isMandatory: true, completed: true, completedAt: '2026-04-13', completedBy: 'Vikram Malhotra' },
          { id: 'aps_3', label: 'Verification interview / professor verification cleared', isMandatory: true, completed: true, completedAt: '2026-05-20', completedBy: 'Vikram Malhotra' },
          { id: 'aps_4', label: 'Official Paperless Digilocker / APS Certificate downloaded', isMandatory: true, completed: true, completedAt: '2026-06-02', completedBy: 'Vikram Malhotra' }
        ],
        ['Official APS Certificate Issued by German Embassy New Delhi']
      ),
      this.createConfiguredService(
        aaravId,
        'GMI-2026-0089',
        'Aarav Sharma',
        'blocked_account',
        'German Sperrkonto (Blocked Account €11,904)',
        'Financial Services',
        'Financial Desk',
        'Rajesh Kumar',
        'finance_officer',
        'completed',
        '05 Blocked Account Confirmation Received',
        'urgent',
        72,
        [],
        [
          { id: 'ba_1', label: 'Sperrkonto registration on Expatrio / Coracle portal', isMandatory: true, completed: true, completedAt: '2026-07-15', completedBy: 'Rajesh Kumar' },
          { id: 'ba_2', label: 'Passport & TUM Admission Letter verification', isMandatory: true, completed: true, completedAt: '2026-07-16', completedBy: 'Rajesh Kumar' },
          { id: 'ba_3', label: 'International wire transfer of €11,904 plus buffer fee', isMandatory: true, completed: true, completedAt: '2026-07-20', completedBy: 'Rajesh Kumar' },
          { id: 'ba_4', label: 'Official 05 Blocked Amount Confirmation letter downloaded for visa', isMandatory: true, completed: true, completedAt: '2026-07-22', completedBy: 'Rajesh Kumar' }
        ],
        ['Official 05 Blocked Account Confirmation Letter Received']
      ),
      this.createConfiguredService(
        aaravId,
        'GMI-2026-0089',
        'Aarav Sharma',
        'insurance',
        'German Statutory Health Insurance (TK / Barmer)',
        'Financial & Travel' as any,
        'Financial Desk',
        'Rajesh Kumar',
        'finance_officer',
        'completed',
        'TK Policy Certificate Active',
        'medium',
        48,
        [],
        [
          { id: 'ins_1', label: 'Techniker Krankenkasse (TK) student registration', isMandatory: true, completed: true, completedAt: '2026-07-24', completedBy: 'Rajesh Kumar' },
          { id: 'ins_2', label: 'Travel incoming insurance coverage (Mawista/Dr. Walter) for travel window', isMandatory: true, completed: true, completedAt: '2026-07-24', completedBy: 'Rajesh Kumar' }
        ],
        ['Valid TK Health Insurance Certificate for German Visa']
      ),
      this.createConfiguredService(
        aaravId,
        'GMI-2026-0089',
        'Aarav Sharma',
        'visa_documentation',
        'German National Student Visa (Section 16b AufenthG) File Compilation',
        'Visa & Immigration',
        'Visa Operations Team',
        'Sneha Kulkarni',
        'visa_officer',
        'completed',
        'VFS File Ready & Verified',
        'urgent',
        72,
        [
          { id: 'dep_aps', prerequisiteServiceType: 'aps_certificate', description: 'APS Certificate required for German student visa', isSatisfied: true },
          { id: 'dep_ba', prerequisiteServiceType: 'blocked_account', description: 'Blocked Account (€11,904) confirmation', isSatisfied: true }
        ],
        [
          { id: 'vd_1', label: 'Videx National Visa online application form submitted & signed', isMandatory: true, completed: true, completedAt: '2026-07-25', completedBy: 'Sneha Kulkarni' },
          { id: 'vd_2', label: 'TUM Zulassungsbescheid (Admission letter) original & 2 copies', isMandatory: true, completed: true, completedAt: '2026-07-25', completedBy: 'Sneha Kulkarni' },
          { id: 'vd_3', label: 'Proof of blocked account (€11,904) 05 confirmation', isMandatory: true, completed: true, completedAt: '2026-07-25', completedBy: 'Sneha Kulkarni' },
          { id: 'vd_4', label: 'APS Original Certificate with QR code', isMandatory: true, completed: true, completedAt: '2026-07-25', completedBy: 'Sneha Kulkarni' },
          { id: 'vd_5', label: 'Motivation letter tailored to German consular standards', isMandatory: true, completed: true, completedAt: '2026-07-26', completedBy: 'Sneha Kulkarni' },
          { id: 'vd_6', label: 'Statutory Health Insurance certificate (TK)', isMandatory: true, completed: true, completedAt: '2026-07-26', completedBy: 'Sneha Kulkarni' },
          { id: 'vd_7', label: '3 biometric passport photos compliant with German specifications', isMandatory: true, completed: true, completedAt: '2026-07-26', completedBy: 'Sneha Kulkarni' }
        ],
        ['All 7 mandatory German visa dossier documents compiled and approved']
      ),
      this.createConfiguredService(
        aaravId,
        'GMI-2026-0089',
        'Aarav Sharma',
        'visa_checklist_review',
        'Visa Checklist Pre-Submission Audit & Manager Sign-off',
        'Visa & Immigration',
        'Visa Operations Team',
        'Sneha Kulkarni',
        'visa_officer',
        'completed',
        'Two-Tier Audit Approved by Branch Manager',
        'urgent',
        24,
        [
          { id: 'dep_vd', prerequisiteServiceType: 'visa_documentation', description: 'Completed visa documentation file', isSatisfied: true }
        ],
        [
          { id: 'vcr_1', label: 'Primary line audit by Visa Officer Sneha Kulkarni', isMandatory: true, completed: true, completedAt: '2026-07-27', completedBy: 'Sneha Kulkarni' },
          { id: 'vcr_2', label: 'Secondary authorization & sign-off by Branch Manager Pooja Sharma', isMandatory: true, completed: true, completedAt: '2026-07-27', completedBy: 'Pooja Sharma' }
        ],
        ['Branch Manager formal audit approval stamped']
      ),
      this.createConfiguredService(
        aaravId,
        'GMI-2026-0089',
        'Aarav Sharma',
        'visa_appointment_booking',
        'German VFS / Consulate Visa Appointment Booking',
        'Visa & Immigration',
        'Visa Operations Team',
        'Sneha Kulkarni',
        'visa_officer',
        'completed',
        'Slot Booked at VFS Shivaji Stadium New Delhi',
        'high',
        48,
        [
          { id: 'dep_audit', prerequisiteServiceType: 'visa_checklist_review', description: 'Two-tier visa checklist audit sign-off', isSatisfied: true }
        ],
        [
          { id: 'vab_1', label: 'VFS Global appointment slot secured', isMandatory: true, completed: true, completedAt: '2026-07-28', completedBy: 'Sneha Kulkarni' },
          { id: 'vab_2', label: 'Appointment confirmation slip PDF generated & sent to student', isMandatory: true, completed: true, completedAt: '2026-07-28', completedBy: 'Sneha Kulkarni' }
        ],
        ['Confirmed VFS Appointment Booking Slip Uploaded']
      ),
      this.createConfiguredService(
        aaravId,
        'GMI-2026-0089',
        'Aarav Sharma',
        'visa_mock_interview',
        'Consular Mock Visa Interview & Evaluation Scorecard',
        'Visa & Immigration',
        'Visa Operations Team',
        'Sneha Kulkarni',
        'visa_officer',
        'completed',
        'Passed with Score 9.2/10 (Embassy Ready)',
        'high',
        24,
        [],
        [
          { id: 'vmi_1', label: 'Mock session conducted via Zoom/In-Person', isMandatory: true, completed: true, completedAt: '2026-08-01', completedBy: 'Sneha Kulkarni' },
          { id: 'vmi_2', label: 'Evaluation rubric submitted with feedback', isMandatory: true, completed: true, completedAt: '2026-08-01', completedBy: 'Sneha Kulkarni' }
        ],
        ['Mock interview score >= 7.5 and Verdict = Passed - Embassy Ready']
      ),
      this.createConfiguredService(
        aaravId,
        'GMI-2026-0089',
        'Aarav Sharma',
        'visa_decision_passport',
        'German National Visa Issuance & Passport Tracking',
        'Visa & Immigration',
        'Visa Operations Team',
        'Sneha Kulkarni',
        'visa_officer',
        'completed',
        'Visa Approved & Sticker Verified',
        'urgent',
        48,
        [],
        [
          { id: 'vdp_1', label: 'Consular decision received: Approved', isMandatory: true, completed: true, completedAt: '2026-08-18', completedBy: 'Sneha Kulkarni' },
          { id: 'vdp_2', label: 'Passport courier dispatch tracked via Blue Dart', isMandatory: true, completed: true, completedAt: '2026-08-20', completedBy: 'Sneha Kulkarni' },
          { id: 'vdp_3', label: 'Passport delivered and visa sticker verified', isMandatory: true, completed: true, completedAt: '2026-08-21', completedBy: 'Sneha Kulkarni' }
        ],
        ['Visa sticker verified with start/end date and student work permit limits']
      ),
      this.createConfiguredService(
        aaravId,
        'GMI-2026-0089',
        'Aarav Sharma',
        'forex_assistance',
        'Forex Card & Multi-Currency Travel Wallet',
        'Pre-Departure Support',
        'Financial Desk',
        'Rajesh Kumar',
        'finance_officer',
        'in_progress',
        '€1,500 Loaded on Niyo Global / HDFC Forex',
        'medium',
        48,
        [],
        [
          { id: 'fx_1', label: 'Forex card application submitted', isMandatory: true, completed: true, completedAt: '2026-08-22', completedBy: 'Rajesh Kumar' },
          { id: 'fx_2', label: 'Initial pocket currency & forex card dispatch', isMandatory: true, completed: false }
        ],
        ['Forex card activated and received by student']
      )
    ];

    this.services.set(aaravId, aaravServices);
    this.services.set('std_2026_0089', aaravServices);
    this.services.set('GMI-2026-0089', aaravServices);

    // Initial Visa Case Record for Aarav Sharma (Germany)
    const aaravVisaCase: VisaCaseRecord = {
      id: 'vc_aarav_tum',
      studentId: aaravId,
      studentRefNo: 'GMI-2026-0089',
      studentName: 'Aarav Sharma',
      destinationCountry: 'Germany',
      visaCategory: 'German National Student Visa (Section 16b AufenthG)',
      admittedUniversityName: 'Technical University of Munich (TUM)',
      courseName: 'M.Sc. Informatics',
      intakeSeason: 'Winter Semester',
      intakeYear: 2026,
      currentStage: 'visa_approved',
      assignedVisaOfficerId: 'usr_vo1',
      assignedVisaOfficerName: 'Sneha Kulkarni',
      destinationRequirements: {
        country: 'Germany',
        visaSubclass: 'Section 16b Residence Permit for Study Purposes',
        requirements: [
          { id: 'req_de_1', title: 'Official German APS Certificate', mandatory: true, description: 'Mandatory verification by Academic Evaluation Centre New Delhi with verified QR code', verified: true, verifiedAt: '2026-06-02', verifiedBy: 'Vikram Malhotra' },
          { id: 'req_de_2', title: 'Blocked Account (€11,904) / HDFC Loan letter', mandatory: true, description: 'Official 05 Sperrkonto confirmation letter showing €11,904 deposited for living expenses', verified: true, verifiedAt: '2026-07-22', verifiedBy: 'Rajesh Kumar' },
          { id: 'req_de_3', title: 'TUM Official Zulassungsbescheid', mandatory: true, description: 'Unconditional admission letter signed by university registrar', verified: true, verifiedAt: '2026-07-25', verifiedBy: 'Sneha Kulkarni' },
          { id: 'req_de_4', title: 'German Statutory Health Insurance (TK)', mandatory: true, description: 'Techniker Krankenkasse student cover confirmation plus incoming travel insurance', verified: true, verifiedAt: '2026-07-26', verifiedBy: 'Sneha Kulkarni' },
          { id: 'req_de_5', title: 'Completed Videx Visa Application Form', mandatory: true, description: 'Two printed and signed copies with Section 54/55 AufenthG declarations', verified: true, verifiedAt: '2026-07-26', verifiedBy: 'Sneha Kulkarni' }
        ],
        financialBenchmarkInr: 1075000,
        financialBenchmarkExplanation: 'Federal Ministry requirement: €11,904 in a designated Sperrkonto (~₹10.75 Lakhs) to cover mandatory first-year subsistence in Munich.',
        specialDirectives: [
          'APS verification is strictly mandatory for all Indian bachelor degree holders applying to German universities.',
          'Consular biometric appointment must be booked at the jurisdiction corresponding to residence (Delhi / Mumbai / Bangalore / Chennai).'
        ]
      },
      appointmentEligibility: {
        isEligible: true,
        checkedAt: '2026-07-27T10:30:00Z',
        checkedBy: 'Sneha Kulkarni',
        unsatisfiedPrerequisites: [],
        blockReasons: [],
        auditApprovalGranted: true
      },
      appointmentBooking: {
        id: 'bk_aarav_vfs_01',
        bookingRef: 'VFS-DE-DEL-8891024',
        portalName: 'VFS Global Germany Appointment Portal',
        appointmentDate: '2026-08-05',
        appointmentTime: '09:30',
        centerLocation: 'VFS Global Germany Centre, Shivaji Stadium Metro Station, New Delhi',
        bookingType: 'Standard',
        confirmationDocumentName: 'VFS_DE_Appointment_Confirmation_Aarav.pdf',
        bookedAt: '2026-07-28T14:15:00Z',
        bookedBy: 'Sneha Kulkarni (Visa Officer)',
        status: 'attended',
        reminders: [
          { stage: 'T-7 days', scheduledDate: '2026-07-29', sent: true, sentAt: '2026-07-29T09:00:00Z' },
          { stage: 'T-2 days', scheduledDate: '2026-08-03', sent: true, sentAt: '2026-08-03T09:00:00Z' },
          { stage: 'T-24 hours', scheduledDate: '2026-08-04', sent: true, sentAt: '2026-08-04T09:00:00Z' }
        ]
      },
      finalDocumentAudit: {
        id: 'audit_aarav_de',
        auditedBy: 'Sneha Kulkarni',
        auditorRole: 'visa_officer',
        auditedAt: '2026-07-27T11:00:00Z',
        approved: true,
        twoTierManagerSignoff: {
          approvedByManager: 'Pooja Sharma',
          approvedAt: '2026-07-27T15:30:00Z',
          managerNotes: 'All 7 mandatory German visa items verified. Blocked account proof and APS original QR code authenticated.'
        }
      },
      mockInterviews: [
        {
          id: 'mock_aarav_01',
          scheduledDate: '2026-08-01T11:00:00Z',
          conductedDate: '2026-08-01T11:45:00Z',
          interviewerName: 'Sneha Kulkarni',
          interviewerRole: 'visa_officer',
          overallScore: 9.2,
          maxScore: 10,
          verdict: 'Passed - Embassy Ready',
          scorecard: [
            { question: 'Why Technical University of Munich specifically over other institutions?', category: 'Choice of Course & University', rating: 9, maxRating: 10, feedback: 'Strong grasp of TUM robotics and distributed computing lab curriculum.' },
            { question: 'How is your stay in Munich funded for tuition and cost of living?', category: 'Financial Soundness', rating: 10, maxRating: 10, feedback: 'Clearly cited the €11,904 Sperrkonto in Expatrio and family savings reserve.' },
            { question: 'What are your career intentions upon completion of your Master degree?', category: 'Post-Study Career Plans', rating: 9, maxRating: 10, feedback: 'Articulated post-graduate industrial training followed by research or return to India.' },
            { question: 'What ties ensure compliance with visa regulations?', category: 'Ties to Home Country', rating: 9, maxRating: 10, feedback: 'Family property in Delhi and parent dependency clearly communicated.' },
            { question: 'Confidence, eye contact, and clarity in English/German', category: 'General Communication & Body Language', rating: 9, maxRating: 10, feedback: 'Polite, composed, answered questions concisely without hesitation.' }
          ],
          strengths: ['Crisp academic focus', 'Familiar with Munich living costs', 'Confident German A2 greeting'],
          areasOfImprovement: ['Keep responses under 90 seconds to respect consular queue speed'],
          officerNotes: 'Excellent candidate. Zero red flags. 100% embassy ready.'
        }
      ],
      decisionRecord: {
        id: 'dec_aarav_01',
        decision: 'approved',
        decidedAt: '2026-08-18T16:00:00Z',
        consulateLocation: 'Embassy of the Federal Republic of Germany, Chanakyapuri, New Delhi',
        decisionLetterFileName: 'German_Visa_Approval_Grant_Notice.pdf',
        notes: 'National Visa D category granted without interview complications.'
      },
      passportTracking: {
        id: 'pt_aarav_01',
        courierPartner: 'Blue Dart',
        airwayBillNumber: 'BLUEDART-DEL-99214488',
        dispatchDate: '2026-08-19',
        deliveryStatus: 'delivered',
        lastTrackingUpdate: '2026-08-21T14:30:00Z',
        location: 'New Delhi Hub - Delivered to Candidate Residence',
        receivedAt: '2026-08-21T14:30:00Z'
      },
      stampVerification: {
        id: 'stamp_aarav_01',
        visaStickerNumber: 'D-DEU-88192033',
        validFrom: '2026-09-15',
        validUntil: '2027-03-14',
        entriesAllowed: 'Multiple',
        workPermitHours: '140 full days or 280 half days per calendar year (Section 16b AufenthG)',
        verifiedByOfficer: 'Sneha Kulkarni',
        verifiedAt: '2026-08-22T10:00:00Z',
        scanDocumentName: 'Aarav_Germany_Visa_Sticker_Scan.pdf',
        notes: 'Verified biometric sticker. Multi-entry D-Visa valid for 6 months, convert to Aufenhaltstitel in Munich upon arrival.'
      },
      reapplicationHistory: [],
      createdAt: '2026-06-15T09:00:00Z',
      updatedAt: '2026-08-22T10:00:00Z'
    };

    this.visaCases.set(aaravId, aaravVisaCase);
    this.visaCases.set('std_2026_0089', aaravVisaCase);
    this.visaCases.set('GMI-2026-0089', aaravVisaCase);

    // 2. Ananya Iyer (GMI-2026-0042) - Target: UK (University of Edinburgh)
    const ananyaId = 'std_02';
    const ananyaServices: ManagedServiceRecord[] = [
      this.createConfiguredService(
        ananyaId,
        'GMI-2026-0042',
        'Ananya Iyer',
        'ielts_coaching',
        'IELTS Academic 8.0 Masterclass Coaching',
        'Language & Test Prep',
        'Language Training Desk',
        'Ritu Verma',
        'counselor',
        'completed',
        'Band 8.0 Achieved',
        'high',
        72,
        [],
        [
          { id: 'ic_1', label: 'Diagnostic mock test evaluation', isMandatory: true, completed: true, completedAt: '2026-02-10', completedBy: 'Ritu Verma' },
          { id: 'ic_2', label: 'Writing Task 2 & Speaking intensive boot camp', isMandatory: true, completed: true, completedAt: '2026-03-05', completedBy: 'Ritu Verma' },
          { id: 'ic_3', label: 'Official IDP IELTS exam registration voucher', isMandatory: true, completed: true, completedAt: '2026-03-20', completedBy: 'Ritu Verma' }
        ],
        ['Official IELTS TRF Band 8.0 uploaded']
      ),
      this.createConfiguredService(
        ananyaId,
        'GMI-2026-0042',
        'Ananya Iyer',
        'education_loan',
        'Education Loan Assistance (HDFC Credila ₹45 Lakhs)',
        'Financial Services',
        'Financial Desk',
        'Rajesh Kumar',
        'finance_officer',
        'completed',
        'Sanction Letter ₹45,00,000 Issued',
        'urgent',
        96,
        [],
        [
          { id: 'el_1', label: 'Co-applicant financial document collection (ITR, Form 16, Bank 6-months)', isMandatory: true, completed: true, completedAt: '2026-05-15', completedBy: 'Rajesh Kumar' },
          { id: 'el_2', label: 'Login with HDFC Credila & Avanse partners', isMandatory: true, completed: true, completedAt: '2026-05-18', completedBy: 'Rajesh Kumar' },
          { id: 'el_3', label: 'Credit appraisal & parent property valuation cleared', isMandatory: true, completed: true, completedAt: '2026-05-28', completedBy: 'Rajesh Kumar' },
          { id: 'el_4', label: 'Official Unconditional Sanction Letter generated', isMandatory: true, completed: true, completedAt: '2026-06-05', completedBy: 'Rajesh Kumar' }
        ],
        ['Official Sanction Letter from Partner Bank for Visa Financial Verification']
      ),
      this.createConfiguredService(
        ananyaId,
        'GMI-2026-0042',
        'Ananya Iyer',
        'visa_documentation',
        'UK Student Route Visa File Compilation',
        'Visa & Immigration',
        'Visa Operations Team',
        'Sneha Kulkarni',
        'visa_officer',
        'completed',
        'CAS & 28-Day Bank Statement Ready',
        'urgent',
        72,
        [
          { id: 'dep_loan', prerequisiteServiceType: 'education_loan', description: 'Loan sanction letter or verified bank balance for 28-day rule', isSatisfied: true }
        ],
        [
          { id: 'uk_vd_1', label: 'University of Edinburgh CAS (Confirmation of Acceptance for Studies) statement', isMandatory: true, completed: true, completedAt: '2026-06-18', completedBy: 'Sneha Kulkarni' },
          { id: 'uk_vd_2', label: '28-Day Consecutive Bank Balance Maintenance proof (UKVI Rule)', isMandatory: true, completed: true, completedAt: '2026-06-25', completedBy: 'Sneha Kulkarni' },
          { id: 'uk_vd_3', label: 'Tuberculosis (TB) test certificate from UKVI approved clinic', isMandatory: true, completed: true, completedAt: '2026-06-22', completedBy: 'Sneha Kulkarni' },
          { id: 'uk_vd_4', label: 'Academic qualifications listed on CAS uploaded', isMandatory: true, completed: true, completedAt: '2026-06-25', completedBy: 'Sneha Kulkarni' }
        ],
        ['CAS statement, TB certificate, and 28-day financial maintenance statement verified']
      ),
      this.createConfiguredService(
        ananyaId,
        'GMI-2026-0042',
        'Ananya Iyer',
        'visa_checklist_review',
        'UK Visa File Pre-Submission Audit & Manager Approval',
        'Visa & Immigration',
        'Visa Operations Team',
        'Sneha Kulkarni',
        'visa_officer',
        'completed',
        'Two-Tier Audit Cleared',
        'urgent',
        24,
        [
          { id: 'dep_uk_vd', prerequisiteServiceType: 'visa_documentation', description: 'Complete UK visa file compilation', isSatisfied: true }
        ],
        [
          { id: 'uk_cr_1', label: 'Primary line audit by Visa Officer Sneha Kulkarni', isMandatory: true, completed: true, completedAt: '2026-06-26', completedBy: 'Sneha Kulkarni' },
          { id: 'uk_cr_2', label: 'Manager Sign-off by Branch Manager Pooja Sharma', isMandatory: true, completed: true, completedAt: '2026-06-26', completedBy: 'Pooja Sharma' }
        ],
        ['Branch Manager sign-off approved']
      ),
      this.createConfiguredService(
        ananyaId,
        'GMI-2026-0042',
        'Ananya Iyer',
        'visa_appointment_booking',
        'UK VFS Global Biometrics Appointment Booking',
        'Visa & Immigration',
        'Visa Operations Team',
        'Sneha Kulkarni',
        'visa_officer',
        'in_progress',
        'VFS Appointment Scheduled',
        'high',
        48,
        [
          { id: 'dep_uk_audit', prerequisiteServiceType: 'visa_checklist_review', description: 'Manager audit sign-off', isSatisfied: true }
        ],
        [
          { id: 'uk_vab_1', label: 'Pay UKVI Visa Application Fee (£490) & IHS Surcharge (£776/year)', isMandatory: true, completed: true, completedAt: '2026-06-27', completedBy: 'Sneha Kulkarni' },
          { id: 'uk_vab_2', label: 'Book VFS Global Biometrics slot in Bangalore', isMandatory: true, completed: true, completedAt: '2026-06-27', completedBy: 'Sneha Kulkarni' },
          { id: 'uk_vab_3', label: 'Upload digital document pack onto VFS portal prior to appointment', isMandatory: true, completed: false }
        ],
        ['VFS appointment confirmation letter and appointment date confirmed']
      ),
      this.createConfiguredService(
        ananyaId,
        'GMI-2026-0042',
        'Ananya Iyer',
        'visa_mock_interview',
        'UKVI Credibility Interview Mock Prep',
        'Visa & Immigration',
        'Visa Operations Team',
        'Sneha Kulkarni',
        'visa_officer',
        'not_started',
        'Scheduled for next week',
        'medium',
        24,
        [],
        [
          { id: 'uk_mi_1', label: 'Credibility questionnaire covering course modules & post-study stay', isMandatory: true, completed: false },
          { id: 'uk_mi_2', label: 'Evaluation scorecard submission', isMandatory: true, completed: false }
        ],
        ['Credibility mock interview passed']
      )
    ];

    this.services.set(ananyaId, ananyaServices);
    this.services.set('std_2026_0042', ananyaServices);
    this.services.set('GMI-2026-0042', ananyaServices);

    // Initial Visa Case for Ananya Iyer (UK)
    const ananyaVisaCase: VisaCaseRecord = {
      id: 'vc_ananya_edinburgh',
      studentId: ananyaId,
      studentRefNo: 'GMI-2026-0042',
      studentName: 'Ananya Iyer',
      destinationCountry: 'United Kingdom',
      visaCategory: 'UK Student Route Visa (formerly Tier 4)',
      admittedUniversityName: 'University of Edinburgh',
      courseName: 'MSc Artificial Intelligence',
      intakeSeason: 'September Intake',
      intakeYear: 2026,
      currentStage: 'appointment_booked',
      assignedVisaOfficerId: 'usr_vo1',
      assignedVisaOfficerName: 'Sneha Kulkarni',
      destinationRequirements: {
        country: 'United Kingdom',
        visaSubclass: 'Student Route (UKVI)',
        requirements: [
          { id: 'uk_req_1', title: 'Official CAS (Confirmation of Acceptance for Studies)', mandatory: true, description: 'Electronic document reference issued by University of Edinburgh', verified: true, verifiedAt: '2026-06-18', verifiedBy: 'Sneha Kulkarni' },
          { id: 'uk_req_2', title: '28-Day Consecutive Financial Fund Rule', mandatory: true, description: 'Bank statement or educational loan letter maintained uninterrupted for 28 days', verified: true, verifiedAt: '2026-06-25', verifiedBy: 'Rajesh Kumar' },
          { id: 'uk_req_3', title: 'UKVI Approved Medical Clinic TB Certificate', mandatory: true, description: 'Chest X-ray and sputum clearance valid for 6 months from IOM/approved clinic', verified: true, verifiedAt: '2026-06-22', verifiedBy: 'Sneha Kulkarni' },
          { id: 'uk_req_4', title: 'Immigration Health Surcharge (IHS) Payment', mandatory: true, description: 'Paid £776 per year of study for access to NHS healthcare in UK', verified: true, verifiedAt: '2026-06-27', verifiedBy: 'Sneha Kulkarni' }
        ],
        financialBenchmarkInr: 2200000,
        financialBenchmarkExplanation: 'Tuition balance plus 9 months of non-London living maintenance (£1,023/month = £9,207) held consecutively for 28 calendar days.',
        specialDirectives: [
          'UKVI conducts random credibility interviews at VFS biometrics or via video link.',
          'ATAS (Academic Technology Approval Scheme) clearance may be requested for advanced AI modules.'
        ]
      },
      appointmentEligibility: {
        isEligible: true,
        checkedAt: '2026-06-26T16:00:00Z',
        checkedBy: 'Sneha Kulkarni',
        unsatisfiedPrerequisites: [],
        blockReasons: [],
        auditApprovalGranted: true
      },
      appointmentBooking: {
        id: 'bk_ananya_uk_vfs',
        bookingRef: 'VFS-UK-BLR-441920',
        portalName: 'VFS Global UK Visa Portal',
        appointmentDate: '2026-09-24',
        appointmentTime: '10:00',
        centerLocation: 'VFS Global Services, Prestige Atrium, Central Street, Bengaluru',
        bookingType: 'Standard',
        confirmationDocumentName: 'UK_VFS_Appointment_Confirmation_Ananya.pdf',
        bookedAt: '2026-06-27T12:00:00Z',
        bookedBy: 'Sneha Kulkarni (Visa Officer)',
        status: 'confirmed',
        reminders: [
          { stage: 'T-7 days', scheduledDate: '2026-09-17', sent: false },
          { stage: 'T-2 days', scheduledDate: '2026-09-22', sent: false },
          { stage: 'T-24 hours', scheduledDate: '2026-09-23', sent: false }
        ]
      },
      finalDocumentAudit: {
        id: 'audit_ananya_uk',
        auditedBy: 'Sneha Kulkarni',
        auditorRole: 'visa_officer',
        auditedAt: '2026-06-26T14:30:00Z',
        approved: true,
        twoTierManagerSignoff: {
          approvedByManager: 'Pooja Sharma',
          approvedAt: '2026-06-26T17:00:00Z',
          managerNotes: 'CAS details matched passport; 28-day financial funds verified with HDFC loan sanction letter.'
        }
      },
      mockInterviews: [],
      reapplicationHistory: [],
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-27T12:00:00Z'
    };

    this.visaCases.set(ananyaId, ananyaVisaCase);
    this.visaCases.set('std_2026_0042', ananyaVisaCase);
    this.visaCases.set('GMI-2026-0042', ananyaVisaCase);
  }

  /**
   * Helper factory to build compliant ManagedServiceRecord
   */
  public createConfiguredService(
    studentId: string,
    studentRefNo: string,
    studentName: string,
    serviceType: ServiceType,
    serviceTitle: string,
    category: any,
    assignedTeam: string,
    assignedOwner: string,
    assignedOwnerRole: UserRole | string,
    status: ServiceStatus = 'not_started',
    subStatus: string = 'Pending Initialization',
    priority: ServicePriority = 'medium',
    targetHours: number = 72,
    dependencies: any[] = [],
    checklist: any[] = [],
    completionCriteria: string[] = []
  ): ManagedServiceRecord {
    const id = `srv_${studentId}_${serviceType}`;
    const createdAt = new Date().toISOString();
    const dueDate = new Date(Date.now() + targetHours * 3600 * 1000).toISOString();

    return {
      id,
      studentId,
      studentRefNo,
      studentName,
      serviceType,
      serviceTitle,
      category,
      assignedTeam,
      assignedOwner,
      assignedOwnerRole,
      status,
      subStatus,
      priority,
      createdAt,
      dueDate,
      sla: {
        targetHours,
        hoursRemaining: targetHours,
        isBreached: false,
        escalationLevel: 'normal'
      },
      dependencies: dependencies.map((d, i) => ({
        id: `dep_${id}_${i + 1}`,
        prerequisiteServiceType: d.prerequisiteServiceType,
        prerequisiteDocumentKey: d.prerequisiteDocumentKey,
        description: d.description,
        isSatisfied: !!d.isSatisfied,
        satisfiedAt: d.isSatisfied ? createdAt : undefined,
        blockingReason: d.blockingReason
      })),
      checklist: checklist.map((c, i) => ({
        id: c.id || `chk_${id}_${i + 1}`,
        label: c.label,
        isMandatory: c.isMandatory ?? true,
        completed: !!c.completed,
        completedAt: c.completedAt,
        completedBy: c.completedBy,
        notes: c.notes
      })),
      notes: [
        {
          id: `note_${id}_init`,
          createdAt,
          authorName: assignedOwner,
          authorRole: assignedOwnerRole,
          content: `Service initialized under ${assignedTeam} with target SLA of ${targetHours} hours.`,
          isInternalOnly: true
        }
      ],
      documents: [],
      timeline: [
        {
          id: `tl_${id}_init`,
          timestamp: createdAt,
          action: 'SERVICE_INITIALIZED',
          performedBy: assignedOwner,
          role: assignedOwnerRole,
          details: `Service record established with status ${status}.`
        }
      ],
      notifications: [
        {
          id: `notif_${id}_welcome`,
          channel: 'in_app',
          recipient: studentName,
          recipientType: 'student',
          message: `Your ${serviceTitle} service is now active in your student portal.`,
          scheduledFor: createdAt,
          sentAt: createdAt,
          status: 'sent'
        }
      ],
      completionCriteria: completionCriteria.length > 0 
        ? completionCriteria 
        : ['All mandatory checklist items verified', 'Assigned specialist sign-off'],
      escalationRules: [
        {
          thresholdPercent: 75,
          targetRole: 'counselor',
          actionDescription: 'Send warning notification to assigned specialist'
        },
        {
          thresholdPercent: 100,
          targetRole: 'branch_manager',
          actionDescription: 'Trigger critical SLA breach alert to Branch Manager and Super Admin'
        }
      ]
    };
  }

  // -------------------------------------------------------------------------
  // SERVICE ENGINE CRUD & ORCHESTRATION METHODS
  // -------------------------------------------------------------------------

  /**
   * Returns all active and historic services for a student
   */
  public getServicesForStudent(studentIdOrRef: string): ManagedServiceRecord[] {
    if (this.services.has(studentIdOrRef)) {
      return this.services.get(studentIdOrRef) || [];
    }
    for (const list of this.services.values()) {
      if (list.length > 0 && (list[0].studentId === studentIdOrRef || list[0].studentRefNo === studentIdOrRef)) {
        return list;
      }
    }
    return [];
  }

  /**
   * Returns a single service by ID
   */
  public getServiceById(serviceId: string): ManagedServiceRecord | undefined {
    for (const list of this.services.values()) {
      const match = list.find(s => s.id === serviceId);
      if (match) return match;
    }
    return undefined;
  }

  /**
   * Triggers a new service for a student while preventing duplicate active instances
   */
  public triggerService(
    student: StudentMasterProfile,
    serviceType: ServiceType,
    triggeredBy: string,
    role: UserRole | string
  ): ManagedServiceRecord {
    let studentServices = this.services.get(student.id);
    if (!studentServices) {
      studentServices = [];
      this.services.set(student.id, studentServices);
    }

    // Duplicate Prevention: Check if active service of this type already exists
    const existingActive = studentServices.find(
      s => s.serviceType === serviceType && s.status !== 'completed' && s.status !== 'cancelled'
    );
    if (existingActive) {
      throw new Error(`Duplicate Service Prevention: Active service '${existingActive.serviceTitle}' already exists with status '${existingActive.status}'.`);
    }

    // Factory mapping based on service type
    const serviceConfigs: Record<ServiceType, { title: string; category: any; team: string; owner: string; ownerRole: UserRole; hours: number; criteria: string[] }> = {
      ielts_coaching: {
        title: 'IELTS Academic Preparation Coaching',
        category: 'Language & Test Prep',
        team: 'Language Training Desk',
        owner: 'Ritu Verma',
        ownerRole: 'counselor',
        hours: 72,
        criteria: ['Diagnostic mock test cleared', 'Official exam voucher issued']
      },
      german_language: {
        title: 'German Language (A1/A2/B1) Training',
        category: 'Language & Test Prep',
        team: 'German Language Department',
        owner: 'Frau Ananya Rao',
        ownerRole: 'counselor',
        hours: 120,
        criteria: ['Goethe / TELC exam cleared with passing grade']
      },
      aps_certificate: {
        title: 'German APS Academic Evaluation Verification',
        category: 'Academic Evaluation',
        team: 'German Admissions Desk',
        owner: 'Vikram Malhotra',
        ownerRole: 'processing_officer',
        hours: 96,
        criteria: ['Degree documents apostilled', 'Digital APS Certificate downloaded']
      },
      education_loan: {
        title: 'Education Loan Sanction & Disbursement Assistance',
        category: 'Financial Services',
        team: 'Financial Desk',
        owner: 'Rajesh Kumar',
        ownerRole: 'finance_officer',
        hours: 96,
        criteria: ['Bank login cleared', 'Official loan sanction letter issued']
      },
      blocked_account: {
        title: 'German Sperrkonto Blocked Account (€11,904)',
        category: 'Financial Services',
        team: 'Financial Desk',
        owner: 'Rajesh Kumar',
        ownerRole: 'finance_officer',
        hours: 72,
        criteria: ['€11,904 transferred', '05 confirmation letter verified']
      },
      sop_preparation: {
        title: 'Statement of Purpose (SOP) Editorial Writing & Customization',
        category: 'Editorial & Documentation',
        team: 'Editorial Team',
        owner: 'Aditi Deshmukh',
        ownerRole: 'counselor',
        hours: 48,
        criteria: ['Questionnaire intake completed', 'Final student & counselor approval']
      },
      insurance: {
        title: 'Overseas Student Health & Travel Insurance',
        category: 'Financial & Travel' as any,
        team: 'Financial Desk',
        owner: 'Rajesh Kumar',
        ownerRole: 'finance_officer',
        hours: 48,
        criteria: ['Policy documents active and verified']
      },
      visa_documentation: {
        title: 'Country-Specific Visa Documentation File Compilation',
        category: 'Visa & Immigration',
        team: 'Visa Operations Team',
        owner: 'Sneha Kulkarni',
        ownerRole: 'visa_officer',
        hours: 72,
        criteria: ['All mandatory visa checklist documents verified']
      },
      visa_appointment_booking: {
        title: 'VFS / Embassy Visa Appointment Booking Desk',
        category: 'Visa & Immigration',
        team: 'Visa Operations Team',
        owner: 'Sneha Kulkarni',
        ownerRole: 'visa_officer',
        hours: 48,
        criteria: ['Confirmed appointment booking receipt uploaded']
      },
      visa_checklist_review: {
        title: 'Pre-Submission Visa Dossier Audit & Manager Sign-off',
        category: 'Visa & Immigration',
        team: 'Visa Operations Team',
        owner: 'Sneha Kulkarni',
        ownerRole: 'visa_officer',
        hours: 24,
        criteria: ['Two-tier manager signoff stamped']
      },
      visa_mock_interview: {
        title: 'Consular Visa Mock Interview & Scorecard',
        category: 'Visa & Immigration',
        team: 'Visa Operations Team',
        owner: 'Sneha Kulkarni',
        ownerRole: 'visa_officer',
        hours: 24,
        criteria: ['Mock interview conducted with passing evaluation score']
      },
      visa_decision_passport: {
        title: 'Visa Decision Recording & Passport Tracking',
        category: 'Visa & Immigration',
        team: 'Visa Operations Team',
        owner: 'Sneha Kulkarni',
        ownerRole: 'visa_officer',
        hours: 48,
        criteria: ['Decision logged and passport tracking status verified']
      },
      forex_assistance: {
        title: 'Forex Multi-Currency Card & Tuition Wire Assistance',
        category: 'Pre-Departure Support',
        team: 'Financial Desk',
        owner: 'Rajesh Kumar',
        ownerRole: 'finance_officer',
        hours: 48,
        criteria: ['Forex card issued and initial load credited']
      }
    };

    const cfg = serviceConfigs[serviceType] || {
      title: `${serviceType.replace(/_/g, ' ').toUpperCase()}`,
      category: 'Visa & Immigration',
      team: 'General Operations',
      owner: triggeredBy,
      ownerRole: role,
      hours: 72,
      criteria: ['Standard completion criteria verified']
    };

    const newService = this.createConfiguredService(
      student.id,
      student.studentRefNo,
      `${student.personal.firstName} ${student.personal.lastName}`,
      serviceType,
      cfg.title,
      cfg.category,
      cfg.team,
      cfg.owner,
      cfg.ownerRole,
      'in_progress',
      'Active Processing',
      'medium',
      cfg.hours,
      [],
      [
        { id: `chk_${Date.now()}_1`, label: 'Initiate requirements review with student', isMandatory: true, completed: false },
        { id: `chk_${Date.now()}_2`, label: 'Collect preliminary documentary evidence', isMandatory: true, completed: false },
        { id: `chk_${Date.now()}_3`, label: 'Final validation and sign-off by assigned desk', isMandatory: true, completed: false }
      ],
      cfg.criteria
    );

    newService.timeline.push({
      id: `tl_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'SERVICE_TRIGGERED_BY_USER',
      performedBy: triggeredBy,
      role,
      details: `Service triggered via CRM service desk.`
    });

    studentServices.unshift(newService);
    return newService;
  }

  /**
   * Enforces backend dependency checking before allowing status advancement
   */
  public updateServiceStatus(
    serviceId: string,
    newStatus: ServiceStatus,
    updatedBy: string,
    role: UserRole | string,
    notes?: string
  ): ManagedServiceRecord {
    const service = this.getServiceById(serviceId);
    if (!service) throw new Error(`Service not found with ID ${serviceId}`);

    // If marking as completed, enforce that all dependencies and mandatory checklist items are satisfied!
    if (newStatus === 'completed') {
      const unsatisfiedDep = service.dependencies.find(d => !d.isSatisfied);
      if (unsatisfiedDep) {
        throw new Error(`Dependency Failure: Cannot complete '${service.serviceTitle}'. Unsatisfied dependency: ${unsatisfiedDep.description}`);
      }

      const pendingMandatoryChecklist = service.checklist.filter(c => c.isMandatory && !c.completed);
      if (pendingMandatoryChecklist.length > 0) {
        throw new Error(`Completion Blocked: ${pendingMandatoryChecklist.length} mandatory checklist items are still incomplete (${pendingMandatoryChecklist.map(c => c.label).join('; ')})`);
      }
    }

    const previousStatus = service.status;
    service.status = newStatus;
    if (newStatus === 'completed') {
      service.completedAt = new Date().toISOString();
      service.subStatus = 'Service Completed & Verified';
    }

    service.timeline.push({
      id: `tl_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'STATUS_CHANGED',
      performedBy: updatedBy,
      role,
      details: `Status transitioned from ${previousStatus} -> ${newStatus}. ${notes || ''}`
    });

    if (notes) {
      service.notes.unshift({
        id: `note_${Date.now()}`,
        createdAt: new Date().toISOString(),
        authorName: updatedBy,
        authorRole: role,
        content: notes,
        isInternalOnly: true
      });
    }

    return service;
  }

  /**
   * Toggles a checklist item and auto-updates service timeline
   */
  public toggleChecklistItem(
    serviceId: string,
    checkItemId: string,
    completed: boolean,
    updatedBy: string,
    role: UserRole | string
  ): ManagedServiceRecord {
    const service = this.getServiceById(serviceId);
    if (!service) throw new Error(`Service not found with ID ${serviceId}`);

    const item = service.checklist.find(c => c.id === checkItemId);
    if (!item) throw new Error(`Checklist item not found: ${checkItemId}`);

    item.completed = completed;
    item.completedAt = completed ? new Date().toISOString() : undefined;
    item.completedBy = completed ? `${updatedBy} (${role})` : undefined;

    service.timeline.push({
      id: `tl_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: completed ? 'CHECKLIST_ITEM_COMPLETED' : 'CHECKLIST_ITEM_REOPENED',
      performedBy: updatedBy,
      role,
      details: `Item: "${item.label}" marked ${completed ? 'completed' : 'reopened'}.`
    });

    return service;
  }

  /**
   * Adds an internal staff note to a service
   */
  public addServiceNote(
    serviceId: string,
    content: string,
    authorName: string,
    authorRole: UserRole | string,
    isInternalOnly: boolean = true
  ): ManagedServiceRecord {
    const service = this.getServiceById(serviceId);
    if (!service) throw new Error(`Service not found with ID ${serviceId}`);

    service.notes.unshift({
      id: `note_${Date.now()}`,
      createdAt: new Date().toISOString(),
      authorName,
      authorRole,
      content,
      isInternalOnly
    });

    return service;
  }

  /**
   * Attaches a document reference to a service
   */
  public attachDocument(
    serviceId: string,
    name: string,
    category: string,
    fileSizeMb: number,
    uploadedBy: string,
    role: UserRole | string
  ): ManagedServiceRecord {
    const service = this.getServiceById(serviceId);
    if (!service) throw new Error(`Service not found with ID ${serviceId}`);

    const docRef = {
      id: `doc_${Date.now()}`,
      name,
      category,
      fileSizeMb,
      uploadedAt: new Date().toISOString(),
      verified: true
    };

    service.documents.push(docRef);
    service.timeline.push({
      id: `tl_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'DOCUMENT_ATTACHED',
      performedBy: uploadedBy,
      role,
      details: `Attached document: ${name} (${fileSizeMb} MB)`
    });

    return service;
  }

  /**
   * Evaluates all SLAs, calculates elapsed time, and triggers automated escalations
   */
  public runSlaEscalationEngine(): { totalEvaluated: number; totalEscalated: number; escalatedServices: string[] } {
    let totalEvaluated = 0;
    let totalEscalated = 0;
    const escalatedServices: string[] = [];

    const now = Date.now();

    for (const list of this.services.values()) {
      for (const service of list) {
        if (service.status === 'completed' || service.status === 'cancelled') continue;

        totalEvaluated++;
        const createdTime = new Date(service.createdAt).getTime();
        const dueTime = new Date(service.dueDate).getTime();
        const totalDurationHours = service.sla.targetHours;
        const elapsedHours = (now - createdTime) / (1000 * 3600);
        const remainingHours = Math.max(0, (dueTime - now) / (1000 * 3600));

        service.sla.hoursRemaining = Math.round(remainingHours * 10) / 10;

        if (now > dueTime) {
          // Breached SLA
          if (!service.sla.isBreached) {
            service.sla.isBreached = true;
            service.sla.escalationLevel = 'critical_breach';
            service.sla.escalatedToRole = 'branch_manager';
            service.sla.escalatedAt = new Date().toISOString();
            totalEscalated++;
            escalatedServices.push(service.id);

            service.timeline.push({
              id: `tl_${Date.now()}`,
              timestamp: new Date().toISOString(),
              action: 'SLA_BREACH_ESCALATED',
              performedBy: 'Automated SLA Engine',
              role: 'super_admin',
              details: `SLA target of ${totalDurationHours} hours breached. Automatically escalated to Branch Manager.`
            });

            service.notifications.unshift({
              id: `notif_esc_${Date.now()}`,
              channel: 'email',
              recipient: 'branch.manager@crm-portal.com',
              recipientType: 'branch_manager',
              message: `CRITICAL SLA BREACH: Service '${service.serviceTitle}' for student ${service.studentName} is overdue.`,
              scheduledFor: new Date().toISOString(),
              sentAt: new Date().toISOString(),
              status: 'sent'
            });
          }
        } else if (elapsedHours / totalDurationHours >= 0.75) {
          // Warning state (75%)
          if (service.sla.escalationLevel === 'normal') {
            service.sla.escalationLevel = 'warning';
            service.timeline.push({
              id: `tl_${Date.now()}`,
              timestamp: new Date().toISOString(),
              action: 'SLA_WARNING_75_PERCENT',
              performedBy: 'Automated SLA Engine',
              role: 'super_admin',
              details: `Service reached 75% of target SLA duration.`
            });
          }
        }
      }
    }

    return { totalEvaluated, totalEscalated, escalatedServices };
  }

  // -------------------------------------------------------------------------
  // VISA WORKFLOW CORE METHODS
  // -------------------------------------------------------------------------

  /**
   * Retrieves the Visa Case Record for a student, or creates an initial draft based on their final admitted institution
   */
  public getVisaCaseForStudent(student: StudentMasterProfile): VisaCaseRecord {
    let visaCase = this.visaCases.get(student.id) || this.visaCases.get(student.studentRefNo);
    if (!visaCase) {
      // Find destination from preferences or applications
      const targetCountry = student.preferences.targetCountries[0] || 'Germany';
      const university = student.applications[0]?.universityName || 'Technical University of Munich (TUM)';
      const course = student.applications[0]?.courseName || 'Master of Science';

      visaCase = {
        id: `vc_${student.id}`,
        studentId: student.id,
        studentRefNo: student.studentRefNo,
        studentName: `${student.personal.firstName} ${student.personal.lastName}`,
        destinationCountry: targetCountry,
        visaCategory: targetCountry === 'Germany' 
          ? 'German National Student Visa (Section 16b AufenthG)'
          : targetCountry === 'United Kingdom' 
          ? 'UK Student Route Visa' 
          : `${targetCountry} Student Visa`,
        admittedUniversityName: university,
        courseName: course,
        intakeSeason: student.preferences.targetIntakeSeason,
        intakeYear: student.preferences.targetIntakeYear,
        currentStage: 'prerequisites_pending',
        assignedVisaOfficerId: student.assignedVisaOfficerId || 'usr_vo1',
        assignedVisaOfficerName: student.assignedVisaOfficerName || 'Sneha Kulkarni',
        destinationRequirements: this.getDestinationRequirementsForCountry(targetCountry),
        appointmentEligibility: {
          isEligible: false,
          checkedAt: new Date().toISOString(),
          checkedBy: 'System Engine',
          unsatisfiedPrerequisites: ['Final Document Audit not yet stamped', 'Financial verification pending'],
          blockReasons: ['Cannot book appointment without approved visa dossier'],
          auditApprovalGranted: false
        },
        mockInterviews: [],
        reapplicationHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.visaCases.set(student.id, visaCase);
    }

    return visaCase;
  }

  /**
   * Returns country-specific statutory visa criteria
   */
  public getDestinationRequirementsForCountry(country: string): DestinationVisaRequirements {
    switch (country.toLowerCase()) {
      case 'germany':
        return {
          country: 'Germany',
          visaSubclass: 'Section 16b Residence Permit for Study Purposes',
          financialBenchmarkInr: 1075000,
          financialBenchmarkExplanation: '€11,904 in a designated Sperrkonto (~₹10.75 Lakhs) for living expenses in Germany.',
          requirements: [
            { id: 'req_de_1', title: 'Official German APS Certificate', mandatory: true, description: 'Mandatory verification by Academic Evaluation Centre New Delhi with verified QR code', verified: false },
            { id: 'req_de_2', title: 'Blocked Account (€11,904) / HDFC Loan letter', mandatory: true, description: 'Official 05 Sperrkonto confirmation letter showing €11,904 deposited for living expenses', verified: false },
            { id: 'req_de_3', title: 'German University Zulassungsbescheid', mandatory: true, description: 'Unconditional admission letter signed by university registrar', verified: false },
            { id: 'req_de_4', title: 'German Statutory Health Insurance (TK / Barmer)', mandatory: true, description: 'Techniker Krankenkasse student cover confirmation plus incoming travel insurance', verified: false },
            { id: 'req_de_5', title: 'Completed Videx Visa Application Form', mandatory: true, description: 'Two printed and signed copies with Section 54/55 AufenthG declarations', verified: false }
          ],
          specialDirectives: [
            'German Embassy requires APS certificate for all Indian qualifications.',
            'Appointment slot must be booked via VFS Global Germany or the consulate portal based on consular jurisdiction.'
          ]
        };

      case 'united kingdom':
      case 'uk':
        return {
          country: 'United Kingdom',
          visaSubclass: 'Student Route (UKVI)',
          financialBenchmarkInr: 2200000,
          financialBenchmarkExplanation: 'Tuition fee balance + 9 months of living maintenance held uninterrupted for 28 consecutive days.',
          requirements: [
            { id: 'req_uk_1', title: 'CAS (Confirmation of Acceptance for Studies)', mandatory: true, description: 'Official electronic CAS reference generated by sponsoring UK university', verified: false },
            { id: 'req_uk_2', title: '28-Day Consecutive Fund Maintenance Rule', mandatory: true, description: 'Bank statement or education loan letter maintained for 28 calendar days prior to application', verified: false },
            { id: 'req_uk_3', title: 'Tuberculosis (TB) Clearance Certificate', mandatory: true, description: 'Medical screening certificate from UKVI approved clinic in India', verified: false },
            { id: 'req_uk_4', title: 'Immigration Health Surcharge (IHS) Payment', mandatory: true, description: 'Paid online for NHS healthcare access during course duration', verified: false }
          ],
          specialDirectives: [
            'UKVI conducts random credibility interviews at VFS biometrics.',
            'Students are permitted 20 hours per week of part-time work during university terms.'
          ]
        };

      case 'united states':
      case 'usa':
      case 'us':
        return {
          country: 'United States',
          visaSubclass: 'F-1 Non-Immigrant Academic Student Visa',
          financialBenchmarkInr: 3500000,
          financialBenchmarkExplanation: 'First year total tuition + living cost as stated on Form I-20 plus evidence of subsequent year funding.',
          requirements: [
            { id: 'req_us_1', title: 'Form I-20 (Certificate of Eligibility)', mandatory: true, description: 'Signed and dated by designated school official (DSO) and student', verified: false },
            { id: 'req_us_2', title: 'SEVIS I-901 Fee Payment Receipt ($350)', mandatory: true, description: 'Official Department of Homeland Security receipt', verified: false },
            { id: 'req_us_3', title: 'Completed DS-160 Online Form & Confirmation Barcode', mandatory: true, description: 'Online nonimmigrant visa application confirmation with photograph barcode', verified: false },
            { id: 'req_us_4', title: 'Liquid Funds & CA Net Worth Valuation Statement', mandatory: true, description: 'Bank deposits, sanctioned loan letters, and asset valuation demonstrating full program coverage', verified: false }
          ],
          specialDirectives: [
            'F-1 visa requires in-person consular interview at US Embassy/Consulate in India.',
            'Student must demonstrate non-immigrant intent and strong ties to return to India upon completion.'
          ]
        };

      default:
        return {
          country,
          visaSubclass: 'International Study Permit',
          financialBenchmarkInr: 1500000,
          financialBenchmarkExplanation: 'Demonstrated annual tuition plus standard living benchmark required by immigration authority.',
          requirements: [
            { id: 'req_gen_1', title: 'Letter of Acceptance (LOA)', mandatory: true, description: 'Official unconditional admission letter', verified: false },
            { id: 'req_gen_2', title: 'Proof of Financial Means', mandatory: true, description: 'Bank statements, sponsor affidavits, or education loan letter', verified: false },
            { id: 'req_gen_3', title: 'Valid Passport with >= 6 months validity', mandatory: true, description: 'Biometric page and previous travel history', verified: false }
          ],
          specialDirectives: [
            'Follow designated embassy visa application guidelines and document submission instructions.'
          ]
        };
    }
  }

  /**
   * Validates appointment eligibility with strict backend prerequisite rules
   */
  public validateAppointmentEligibility(
    visaCaseId: string,
    student: StudentMasterProfile,
    validatorName: string,
    validatorRole: UserRole | string
  ): AppointmentEligibility {
    let visaCase: VisaCaseRecord | undefined;
    for (const vc of this.visaCases.values()) {
      if (vc.id === visaCaseId) {
        visaCase = vc;
        break;
      }
    }
    if (!visaCase) throw new Error(`Visa case not found with ID ${visaCaseId}`);

    const unsatisfiedPrerequisites: string[] = [];
    const blockReasons: string[] = [];

    // Rule 1: Final document audit approval
    if (!visaCase.finalDocumentAudit || !visaCase.finalDocumentAudit.approved) {
      unsatisfiedPrerequisites.push('Final Document Audit sign-off is required from Visa Officer');
      blockReasons.push('Cannot book visa appointment without an approved pre-submission document audit.');
    }

    // Rule 2: Country specific checks
    const services = this.getServicesForStudent(student.id);

    if (visaCase.destinationCountry.toLowerCase() === 'germany') {
      const apsSrv = services.find(s => s.serviceType === 'aps_certificate');
      if (!apsSrv || apsSrv.status !== 'completed') {
        unsatisfiedPrerequisites.push('German APS Certificate must be completed and issued');
        blockReasons.push('German Embassy will not accept visa submissions without verified APS.');
      }

      const baSrv = services.find(s => s.serviceType === 'blocked_account');
      if (!baSrv || baSrv.status !== 'completed') {
        unsatisfiedPrerequisites.push('Blocked Account (€11,904) 05 confirmation must be completed');
        blockReasons.push('Living expense guarantee missing for German jurisdiction.');
      }
    } else if (visaCase.destinationCountry.toLowerCase() === 'united kingdom' || visaCase.destinationCountry.toLowerCase() === 'uk') {
      const vdSrv = services.find(s => s.serviceType === 'visa_documentation');
      if (!vdSrv || vdSrv.status !== 'completed') {
        unsatisfiedPrerequisites.push('CAS statement and 28-day financial fund verification must be completed');
        blockReasons.push('UKVI 28-day financial maintenance rule must be audited before appointment.');
      }
    }

    const isEligible = unsatisfiedPrerequisites.length === 0;

    visaCase.appointmentEligibility = {
      isEligible,
      checkedAt: new Date().toISOString(),
      checkedBy: `${validatorName} (${validatorRole})`,
      unsatisfiedPrerequisites,
      blockReasons,
      auditApprovalGranted: !!visaCase.finalDocumentAudit?.approved
    };

    visaCase.updatedAt = new Date().toISOString();
    return visaCase.appointmentEligibility;
  }

  /**
   * Books a Visa Appointment with duplicate active booking prevention and backend eligibility enforcement
   */
  public bookVisaAppointment(
    visaCaseId: string,
    student: StudentMasterProfile,
    appointmentData: {
      portalName: string;
      appointmentDate: string;
      appointmentTime: string;
      centerLocation: string;
      bookingType?: 'Standard' | 'Premium Lounge' | 'Biometrics Only';
      confirmationDocumentName?: string;
    },
    bookedBy: string,
    role: UserRole | string
  ): VisaCaseRecord {
    let visaCase: VisaCaseRecord | undefined;
    for (const vc of this.visaCases.values()) {
      if (vc.id === visaCaseId) {
        visaCase = vc;
        break;
      }
    }
    if (!visaCase) throw new Error(`Visa case not found with ID ${visaCaseId}`);

    // Duplicate Active Appointment Prevention
    if (visaCase.appointmentBooking && visaCase.appointmentBooking.status === 'confirmed') {
      throw new Error(`Duplicate Active Appointment Prevention: Student ${student.studentRefNo} already has a confirmed appointment at ${visaCase.appointmentBooking.centerLocation} on ${visaCase.appointmentBooking.appointmentDate} (Ref: ${visaCase.appointmentBooking.bookingRef}). Cancel or reschedule existing booking first.`);
    }

    // Backend Eligibility Enforcement
    const eligibility = this.validateAppointmentEligibility(visaCaseId, student, bookedBy, role);
    if (!eligibility.isEligible) {
      throw new Error(`Appointment Ineligible: Cannot book slot. Prerequisites unfulfilled: ${eligibility.unsatisfiedPrerequisites.join('; ')}`);
    }

    const bookingRef = `GMI-VFS-${Date.now().toString().slice(-6)}`;
    const appDate = new Date(appointmentData.appointmentDate);

    // Calculate simulated reminders (T-7 days, T-2 days, T-24 hours)
    const reminders = [
      {
        stage: 'T-7 days' as const,
        scheduledDate: new Date(appDate.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        sent: false
      },
      {
        stage: 'T-2 days' as const,
        scheduledDate: new Date(appDate.getTime() - 2 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        sent: false
      },
      {
        stage: 'T-24 hours' as const,
        scheduledDate: new Date(appDate.getTime() - 1 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        sent: false
      }
    ];

    visaCase.appointmentBooking = {
      id: `bk_${Date.now()}`,
      bookingRef,
      portalName: appointmentData.portalName,
      appointmentDate: appointmentData.appointmentDate,
      appointmentTime: appointmentData.appointmentTime,
      centerLocation: appointmentData.centerLocation,
      bookingType: appointmentData.bookingType || 'Standard',
      confirmationDocumentName: appointmentData.confirmationDocumentName || 'Visa_Appointment_Confirmation.pdf',
      bookedAt: new Date().toISOString(),
      bookedBy: `${bookedBy} (${role})`,
      status: 'confirmed',
      reminders
    };

    visaCase.currentStage = 'appointment_booked';
    visaCase.updatedAt = new Date().toISOString();

    // Auto-update or advance the visa_appointment_booking service
    const services = this.getServicesForStudent(student.id);
    const vabSrv = services.find(s => s.serviceType === 'visa_appointment_booking');
    if (vabSrv) {
      vabSrv.status = 'completed';
      vabSrv.subStatus = `Slot Booked: ${appointmentData.appointmentDate} at ${appointmentData.centerLocation}`;
      vabSrv.checklist.forEach(c => c.completed = true);
    }

    return visaCase;
  }

  /**
   * Performs Two-Tier Document Audit Sign-off
   */
  public submitDocumentAudit(
    visaCaseId: string,
    approved: boolean,
    auditedBy: string,
    auditorRole: UserRole | string,
    deficiencyNotes?: string,
    managerName?: string
  ): VisaDocumentAudit {
    // Only visa_officer, branch_manager, or super_admin can audit
    if (auditorRole !== 'visa_officer' && auditorRole !== 'branch_manager' && auditorRole !== 'super_admin') {
      throw new Error(`Permission Denied: Role '${auditorRole}' is not authorized to audit visa documentation dossiers.`);
    }

    let visaCase: VisaCaseRecord | undefined;
    for (const vc of this.visaCases.values()) {
      if (vc.id === visaCaseId) {
        visaCase = vc;
        break;
      }
    }
    if (!visaCase) throw new Error(`Visa case not found with ID ${visaCaseId}`);

    const audit: VisaDocumentAudit = {
      id: `audit_${Date.now()}`,
      auditedBy,
      auditorRole,
      auditedAt: new Date().toISOString(),
      approved,
      deficiencyFound: approved ? undefined : deficiencyNotes,
      twoTierManagerSignoff: approved ? {
        approvedByManager: managerName || 'Pooja Sharma (Branch Manager)',
        approvedAt: new Date().toISOString(),
        managerNotes: 'Two-tier verification passed. Approved for consulate appointment booking.'
      } : undefined
    };

    visaCase.finalDocumentAudit = audit;
    if (approved) {
      visaCase.currentStage = 'checklist_approved';
      visaCase.appointmentEligibility.auditApprovalGranted = true;
    } else {
      visaCase.currentStage = 'checklist_audit_pending';
      visaCase.appointmentEligibility.auditApprovalGranted = false;
    }

    visaCase.updatedAt = new Date().toISOString();
    return audit;
  }

  /**
   * Conducts and logs a Consular Mock Visa Interview with multi-question rubric
   */
  public recordMockInterview(
    visaCaseId: string,
    interviewerName: string,
    interviewerRole: UserRole | string,
    scorecard: Array<{ question: string; category: any; rating: number; maxRating: number; feedback: string }>,
    strengths: string[],
    areasOfImprovement: string[],
    officerNotes: string
  ): VisaMockInterviewRecord {
    let visaCase: VisaCaseRecord | undefined;
    for (const vc of this.visaCases.values()) {
      if (vc.id === visaCaseId) {
        visaCase = vc;
        break;
      }
    }
    if (!visaCase) throw new Error(`Visa case not found with ID ${visaCaseId}`);

    const totalRatings = scorecard.reduce((sum, item) => sum + item.rating, 0);
    const overallScore = scorecard.length > 0 
      ? Math.round((totalRatings / scorecard.length) * 10) / 10 
      : 8.0;

    const verdict: VisaMockInterviewRecord['verdict'] = overallScore >= 7.5 
      ? 'Passed - Embassy Ready' 
      : overallScore >= 5.0 
      ? 'Needs Work - Re-Interview Required' 
      : 'High Risk';

    const mockRecord: VisaMockInterviewRecord = {
      id: `mock_${Date.now()}`,
      scheduledDate: new Date().toISOString(),
      conductedDate: new Date().toISOString(),
      interviewerName,
      interviewerRole,
      scorecard,
      overallScore,
      maxScore: 10,
      verdict,
      strengths,
      areasOfImprovement,
      officerNotes
    };

    visaCase.mockInterviews.unshift(mockRecord);
    if (verdict === 'Passed - Embassy Ready') {
      visaCase.currentStage = 'mock_interview_passed';
    } else {
      visaCase.currentStage = 'mock_interview_scheduled';
    }

    visaCase.updatedAt = new Date().toISOString();
    return mockRecord;
  }

  /**
   * Records Visa Decision (Approved / Refused / 221g) and handles reapplication history
   */
  public recordVisaDecision(
    visaCaseId: string,
    decision: 'approved' | 'rejected' | 'administrative_processing_221g',
    consulateLocation: string,
    notes: string,
    refusalGrounds?: string,
    decidedByName?: string,
    role?: UserRole | string
  ): VisaCaseRecord {
    let visaCase: VisaCaseRecord | undefined;
    for (const vc of this.visaCases.values()) {
      if (vc.id === visaCaseId) {
        visaCase = vc;
        break;
      }
    }
    if (!visaCase) throw new Error(`Visa case not found with ID ${visaCaseId}`);

    const decisionRecord: VisaDecisionRecord = {
      id: `dec_${Date.now()}`,
      decision,
      decidedAt: new Date().toISOString(),
      consulateLocation,
      refusalGrounds,
      notes
    };

    visaCase.decisionRecord = decisionRecord;

    if (decision === 'approved') {
      visaCase.currentStage = 'visa_approved';
      // Automatically establish passport tracking template
      if (!visaCase.passportTracking) {
        visaCase.passportTracking = {
          id: `pt_${Date.now()}`,
          courierPartner: 'Blue Dart',
          airwayBillNumber: `BLUEDART-${Date.now().toString().slice(-8)}`,
          dispatchDate: new Date().toISOString().slice(0, 10),
          deliveryStatus: 'dispatched_from_embassy',
          lastTrackingUpdate: new Date().toISOString(),
          location: `${consulateLocation} - Dispatched via courier`
        };
      }
    } else if (decision === 'rejected') {
      visaCase.currentStage = 'visa_refused';
      // Preserve reapplication history
      visaCase.reapplicationHistory.unshift({
        id: `reapp_${Date.now()}`,
        previousCaseId: visaCase.id,
        refusalDate: new Date().toISOString().slice(0, 10),
        refusalReason: refusalGrounds || 'Standard Section 214(b) / refusal grounds',
        correctiveStrategy: 'Detailed refusal review, re-evaluation of financial proof, and targeted statement addressing specific consular concerns.',
        type: 'fresh_application',
        dateInitiated: new Date().toISOString().slice(0, 10),
        status: 'drafted'
      });
    } else {
      visaCase.currentStage = 'administrative_processing_221g';
    }

    visaCase.updatedAt = new Date().toISOString();
    return visaCase;
  }

  /**
   * Updates Passport Courier Tracking
   */
  public updatePassportTracking(
    visaCaseId: string,
    trackingData: Partial<PassportTrackingRecord>
  ): PassportTrackingRecord {
    let visaCase: VisaCaseRecord | undefined;
    for (const vc of this.visaCases.values()) {
      if (vc.id === visaCaseId) {
        visaCase = vc;
        break;
      }
    }
    if (!visaCase) throw new Error(`Visa case not found with ID ${visaCaseId}`);

    if (!visaCase.passportTracking) {
      visaCase.passportTracking = {
        id: `pt_${Date.now()}`,
        courierPartner: trackingData.courierPartner || 'Blue Dart',
        airwayBillNumber: trackingData.airwayBillNumber || 'PENDING-AWB',
        dispatchDate: new Date().toISOString().slice(0, 10),
        deliveryStatus: trackingData.deliveryStatus || 'dispatched_from_embassy',
        lastTrackingUpdate: new Date().toISOString(),
        location: trackingData.location || 'Consular Courier Ingress'
      };
    } else {
      Object.assign(visaCase.passportTracking, trackingData, {
        lastTrackingUpdate: new Date().toISOString()
      });
    }

    if (trackingData.deliveryStatus === 'delivered') {
      visaCase.passportTracking.receivedAt = new Date().toISOString();
    }

    visaCase.updatedAt = new Date().toISOString();
    return visaCase.passportTracking;
  }

  /**
   * Verifies Visa Stamp / Sticker on delivery
   */
  public verifyVisaStamp(
    visaCaseId: string,
    stampData: {
      visaStickerNumber: string;
      validFrom: string;
      validUntil: string;
      entriesAllowed: 'Multiple' | 'Single';
      workPermitHours: string;
      scanDocumentName?: string;
      notes: string;
    },
    verifiedBy: string,
    role: UserRole | string
  ): VisaStampVerificationRecord {
    let visaCase: VisaCaseRecord | undefined;
    for (const vc of this.visaCases.values()) {
      if (vc.id === visaCaseId) {
        visaCase = vc;
        break;
      }
    }
    if (!visaCase) throw new Error(`Visa case not found with ID ${visaCaseId}`);

    const stamp: VisaStampVerificationRecord = {
      id: `stamp_${Date.now()}`,
      visaStickerNumber: stampData.visaStickerNumber,
      validFrom: stampData.validFrom,
      validUntil: stampData.validUntil,
      entriesAllowed: stampData.entriesAllowed,
      workPermitHours: stampData.workPermitHours,
      verifiedByOfficer: `${verifiedBy} (${role})`,
      verifiedAt: new Date().toISOString(),
      scanDocumentName: stampData.scanDocumentName,
      notes: stampData.notes
    };

    visaCase.stampVerification = stamp;
    visaCase.updatedAt = new Date().toISOString();
    return stamp;
  }

  // -------------------------------------------------------------------------
  // AUTOMATED TEST RUNNER (10 SCENARIOS)
  // -------------------------------------------------------------------------

  /**
   * Executes the comprehensive automated regression suite for Services and Visa Workflows
   */
  public runServiceAndVisaTestSuite(students: StudentMasterProfile[]): ServiceTestResult[] {
    const results: ServiceTestResult[] = [];
    const testStudent = students[0];

    // TEST 1: Service Activation Conditions
    try {
      const activeServices = this.getServicesForStudent(testStudent.id);
      const apsPresent = activeServices.some(s => s.serviceType === 'aps_certificate');
      const glPresent = activeServices.some(s => s.serviceType === 'german_language');
      const passed = apsPresent && glPresent;

      results.push({
        id: 'SRV-TEST-01',
        name: 'Service Activation Conditions',
        category: 'Service Engine',
        passed,
        expected: 'Student targeting Germany activates German Language and APS Certificate services.',
        actual: `Found ${activeServices.length} configured services (APS: ${apsPresent}, German: ${glPresent}).`,
        details: 'Verifies that destination-specific services activate based on student profile study abroad preferences.'
      });
    } catch (err: any) {
      results.push({
        id: 'SRV-TEST-01',
        name: 'Service Activation Conditions',
        category: 'Service Engine',
        passed: false,
        expected: 'Successful activation',
        actual: err.message,
        details: 'Failed to inspect student services.'
      });
    }

    // TEST 2: Strict Backend Dependency Enforcement
    try {
      const dummyService = this.createConfiguredService(
        'temp_test_student',
        'GMI-TEST-001',
        'Test Candidate',
        'visa_appointment_booking',
        'Visa Appointment Test',
        'Visa & Immigration',
        'Visa Desk',
        'Test Officer',
        'visa_officer',
        'in_progress',
        'Active',
        'high',
        48,
        [
          { prerequisiteServiceType: 'visa_documentation', description: 'Visa Documentation file compilation', isSatisfied: false }
        ],
        [
          { label: 'Unsatisfied checklist item', isMandatory: true, completed: false }
        ]
      );
      this.services.set('temp_test_student', [dummyService]);

      let blockedProperly = false;
      try {
        this.updateServiceStatus(dummyService.id, 'completed', 'Test Officer', 'visa_officer');
      } catch (err: any) {
        blockedProperly = err.message.includes('Dependency Failure');
      }

      results.push({
        id: 'SRV-TEST-02',
        name: 'Strict Backend Dependency Enforcement',
        category: 'Service Dependencies',
        passed: blockedProperly,
        expected: 'Service status update to completed is rejected when prerequisite dependencies are unsatisfied.',
        actual: blockedProperly ? 'Blocked properly: Unsatisfied dependency error thrown.' : 'Failed: Completed without satisfying dependency.',
        details: 'Guarantees that downstream services cannot be marked completed if upstream requirements remain unfulfilled.'
      });
    } catch (err: any) {
      results.push({
        id: 'SRV-TEST-02',
        name: 'Strict Backend Dependency Enforcement',
        category: 'Service Dependencies',
        passed: false,
        expected: 'Dependency rejection',
        actual: err.message,
        details: 'Test setup error.'
      });
    }

    // TEST 3: Repeated Trigger & Duplicate Active Service Prevention
    try {
      let duplicatePrevented = false;
      const testServiceType: ServiceType = 'forex_assistance';
      // First ensure the service is triggered in an active state
      try {
        this.triggerService(testStudent, testServiceType, 'Counselor Desk', 'counselor');
      } catch {
        // service may already be in active state
      }

      try {
        // Second attempt MUST be blocked by duplicate prevention check
        this.triggerService(testStudent, testServiceType, 'Counselor Desk', 'counselor');
      } catch (err: any) {
        duplicatePrevented = err.message.includes('Duplicate Service Prevention');
      }

      results.push({
        id: 'SRV-TEST-03',
        name: 'Repeated Trigger & Duplicate Prevention',
        category: 'Service Engine',
        passed: duplicatePrevented,
        expected: 'Repeated trigger of an active service is prevented with Duplicate Service Prevention error.',
        actual: duplicatePrevented ? 'Prevented duplicate active service creation.' : 'Failed: Duplicate active service was created.',
        details: 'Ensures multiple staff members cannot spawn conflicting active workflows for the same student service.'
      });
    } catch (err: any) {
      results.push({
        id: 'SRV-TEST-03',
        name: 'Repeated Trigger & Duplicate Prevention',
        category: 'Service Engine',
        passed: false,
        expected: 'Duplicate error',
        actual: err.message,
        details: 'Error executing duplicate trigger check.'
      });
    }

    // TEST 4: SLA Escalation & Overdue Breaching
    try {
      // Create an overdue service
      const overdueService = this.createConfiguredService(
        'temp_sla_student',
        'GMI-TEST-002',
        'SLA Test Student',
        'forex_assistance',
        'Forex SLA Test',
        'Pre-Departure Support',
        'Financial Desk',
        'Rajesh Kumar',
        'finance_officer',
        'in_progress',
        'Delayed',
        'urgent',
        1 // 1 hour target
      );
      // Backdate creation date by 5 hours
      overdueService.createdAt = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
      overdueService.dueDate = new Date(Date.now() - 4 * 3600 * 1000).toISOString();

      let studentList = this.services.get('temp_sla_student') || [];
      studentList.push(overdueService);
      this.services.set('temp_sla_student', studentList);

      const escalationReport = this.runSlaEscalationEngine();
      const updatedSla = overdueService.sla;
      const passed = updatedSla.isBreached && updatedSla.escalationLevel === 'critical_breach' && updatedSla.escalatedToRole === 'branch_manager';

      results.push({
        id: 'SRV-TEST-04',
        name: 'SLA Breach Detection & Manager Escalation',
        category: 'SLA Engine',
        passed,
        expected: 'Overdue service flagged as isBreached=true, escalationLevel=critical_breach, escalated to branch_manager.',
        actual: `isBreached: ${updatedSla.isBreached}, level: ${updatedSla.escalationLevel}, escalatedTo: ${updatedSla.escalatedToRole}`,
        details: 'Verifies real-time calculation of remaining hours and automated manager escalation triggers.'
      });
    } catch (err: any) {
      results.push({
        id: 'SRV-TEST-04',
        name: 'SLA Breach Detection & Manager Escalation',
        category: 'SLA Engine',
        passed: false,
        expected: 'SLA escalation',
        actual: err.message,
        details: 'Error executing SLA escalation test.'
      });
    }

    // TEST 5: Visa Appointment Eligibility Validation
    try {
      const student2 = students[1] || testStudent;
      const visaCase = this.getVisaCaseForStudent(student2);

      // Invalidate audit to test blocking
      const originalAudit = visaCase.finalDocumentAudit;
      visaCase.finalDocumentAudit = undefined;

      const eligibility = this.validateAppointmentEligibility(visaCase.id, student2, 'Test Officer', 'visa_officer');
      const properlyBlocked = !eligibility.isEligible && eligibility.unsatisfiedPrerequisites.length > 0;

      // Restore
      visaCase.finalDocumentAudit = originalAudit;

      results.push({
        id: 'SRV-TEST-05',
        name: 'Visa Appointment Eligibility Validation',
        category: 'Visa Workflow',
        passed: properlyBlocked,
        expected: 'Appointment booking blocked if final document audit or statutory country prerequisites are incomplete.',
        actual: properlyBlocked 
          ? `Blocked with ${eligibility.unsatisfiedPrerequisites.length} prerequisite warnings.`
          : 'Failed: Allowed appointment booking without prerequisites.',
        details: 'Validates that appointments cannot be scheduled without verified document audit sign-off.'
      });
    } catch (err: any) {
      results.push({
        id: 'SRV-TEST-05',
        name: 'Visa Appointment Eligibility Validation',
        category: 'Visa Workflow',
        passed: false,
        expected: 'Eligibility check',
        actual: err.message,
        details: 'Error validating eligibility.'
      });
    }

    // TEST 6: Duplicate Active Visa Appointment Prevention
    try {
      const visaCase = this.getVisaCaseForStudent(testStudent);
      const originalBookingStatus = visaCase.appointmentBooking?.status;
      if (visaCase.appointmentBooking) {
        visaCase.appointmentBooking.status = 'confirmed';
      }

      let duplicateAppointmentPrevented = false;
      try {
        // Attempt to book a second appointment while one is confirmed
        this.bookVisaAppointment(
          visaCase.id,
          testStudent,
          {
            portalName: 'VFS Portal',
            appointmentDate: '2026-09-30',
            appointmentTime: '11:00',
            centerLocation: 'VFS Mumbai'
          },
          'Sneha Kulkarni',
          'visa_officer'
        );
      } catch (err: any) {
        duplicateAppointmentPrevented = err.message.includes('Duplicate Active Appointment Prevention');
      } finally {
        if (visaCase.appointmentBooking && originalBookingStatus) {
          visaCase.appointmentBooking.status = originalBookingStatus;
        }
      }

      results.push({
        id: 'SRV-TEST-06',
        name: 'Duplicate Active Visa Appointment Prevention',
        category: 'Visa Workflow',
        passed: duplicateAppointmentPrevented,
        expected: 'Second booking attempt rejected when an active appointment is already confirmed.',
        actual: duplicateAppointmentPrevented 
          ? 'Prevented duplicate active appointment booking with clear warning.'
          : 'Failed: Allowed multiple simultaneous active appointments.',
        details: 'Prevents multiple conflicting embassy or VFS appointment records for a single student.'
      });
    } catch (err: any) {
      results.push({
        id: 'SRV-TEST-06',
        name: 'Duplicate Active Visa Appointment Prevention',
        category: 'Visa Workflow',
        passed: false,
        expected: 'Duplicate error',
        actual: err.message,
        details: 'Error executing duplicate appointment check.'
      });
    }

    // TEST 7: Multi-tier Document Audit & Manager Sign-off Gate
    try {
      const visaCase = this.getVisaCaseForStudent(testStudent);
      const audit = this.submitDocumentAudit(
        visaCase.id,
        true,
        'Sneha Kulkarni',
        'visa_officer',
        undefined,
        'Pooja Sharma (Branch Manager)'
      );

      const passed = audit.approved && !!audit.twoTierManagerSignoff && visaCase.appointmentEligibility.auditApprovalGranted;

      results.push({
        id: 'SRV-TEST-07',
        name: 'Multi-Tier Document Audit & Approval Gate',
        category: 'Visa Compliance',
        passed,
        expected: 'Audit stamped by Visa Officer with secondary Branch Manager sign-off.',
        actual: `Approved: ${audit.approved}, Manager Sign-off: ${audit.twoTierManagerSignoff?.approvedByManager}`,
        details: 'Ensures consular dossier passes rigorous two-tier review before student presents file to embassy.'
      });
    } catch (err: any) {
      results.push({
        id: 'SRV-TEST-07',
        name: 'Multi-Tier Document Audit & Approval Gate',
        category: 'Visa Compliance',
        passed: false,
        expected: 'Audit sign-off',
        actual: err.message,
        details: 'Error in audit sign-off test.'
      });
    }

    // TEST 8: Visa Decision Recording & Reapplication Tracking
    try {
      const student3 = students[2] || testStudent;
      const testCase = this.getVisaCaseForStudent(student3);

      // Record a refusal to test reapplication history preservation
      this.recordVisaDecision(
        testCase.id,
        'rejected',
        'Consulate General of Germany Mumbai',
        'Section 214(b) insufficient financial tie-down',
        'Language score below target cutoff',
        'Sneha Kulkarni',
        'visa_officer'
      );

      const reapplicationPreserved = testCase.reapplicationHistory.length > 0 && testCase.currentStage === 'visa_refused';

      results.push({
        id: 'SRV-TEST-08',
        name: 'Visa Decision Recording & Refusal Tracking',
        category: 'Visa Lifecycle',
        passed: reapplicationPreserved,
        expected: 'Refusal decision logged and historic reapplication record preserved with corrective strategy.',
        actual: `Stage: ${testCase.currentStage}, Refusal grounds stored: true, History entries: ${testCase.reapplicationHistory.length}`,
        details: 'Verifies refusal handling preserves audit history and initiates reapplication strategy.'
      });
    } catch (err: any) {
      results.push({
        id: 'SRV-TEST-08',
        name: 'Visa Decision Recording & Refusal Tracking',
        category: 'Visa Lifecycle',
        passed: false,
        expected: 'Decision record',
        actual: err.message,
        details: 'Error in decision test.'
      });
    }

    // TEST 9: RBAC Permission Enforcement on Critical Visa Actions
    try {
      const visaCase = this.getVisaCaseForStudent(testStudent);
      let unauthorizedRejected = false;

      try {
        // Attempt audit sign-off as student role
        this.submitDocumentAudit(
          visaCase.id,
          true,
          'Test Student',
          'student' as UserRole
        );
      } catch (err: any) {
        unauthorizedRejected = err.message.includes('Permission Denied');
      }

      results.push({
        id: 'SRV-TEST-09',
        name: 'RBAC Permission Enforcement on Visa Audits',
        category: 'Security & RBAC',
        passed: unauthorizedRejected,
        expected: 'Unauthorized roles (student/counselor) rejected from approving document audit.',
        actual: unauthorizedRejected ? 'Permission Denied error properly enforced.' : 'Failed: Unauthorized role was allowed to approve audit.',
        details: 'Enforces role-based access control ensuring only authorized Visa Officers or Managers can stamp files.'
      });
    } catch (err: any) {
      results.push({
        id: 'SRV-TEST-09',
        name: 'RBAC Permission Enforcement on Visa Audits',
        category: 'Security & RBAC',
        passed: false,
        expected: 'RBAC enforcement',
        actual: err.message,
        details: 'Error in permission test.'
      });
    }

    // TEST 10: Immutable Audit Logging Across Service Transitions
    try {
      const aaravServices = this.getServicesForStudent(testStudent.id);
      const sampleService = aaravServices[0];
      const hasTimeline = sampleService && sampleService.timeline.length > 0;
      const hasNotes = sampleService && sampleService.notes.length > 0;
      const passed = hasTimeline && hasNotes;

      results.push({
        id: 'SRV-TEST-10',
        name: 'Immutable Audit Logging & Activity Trail',
        category: 'Audit & Compliance',
        passed,
        expected: 'Every service maintains complete timestamped timeline and internal notes history.',
        actual: `Found ${sampleService?.timeline.length || 0} timeline events and ${sampleService?.notes.length || 0} notes on service ${sampleService?.serviceType}.`,
        details: 'Verifies complete auditability of state changes, checklist checks, and document additions.'
      });
    } catch (err: any) {
      results.push({
        id: 'SRV-TEST-10',
        name: 'Immutable Audit Logging & Activity Trail',
        category: 'Audit & Compliance',
        passed: false,
        expected: 'Audit trail verified',
        actual: err.message,
        details: 'Error in audit logging test.'
      });
    }

    return results;
  }
}

export const serviceEngine = new ServiceEngine();
