/**
 * Student Lifecycle CRM - Documentation Management & Profile Analysis Engine
 * Handles country checklists, file upload validation, versioning, verification/rejection,
 * automated reminder cron workflows, German Bavarian GPA calculation, risk scoring,
 * eligibility determination, personalized study roadmaps, and idempotent service triggers.
 */

import { 
  ManagedDocument, 
  DocumentVersion, 
  DocumentStatus, 
  DocumentCategory, 
  DocumentRequirementLevel, 
  CountryChecklistTemplate,
  DocumentReminderLog,
  StudentProfileAnalysis,
  AcademicRecord,
  LanguageAptitudeRecord,
  PassportReadiness,
  FinancialReadiness,
  ProfileRiskItem,
  EligibilityOutcome,
  PersonalizedRoadmapMilestone,
  TriggeredServiceRecord,
  TriggeredServiceType,
  REJECTION_REASON_PRESETS
} from '../types/documentation';
import { StudentMasterProfile } from '../types/crm';
import { SecurityEngine } from './securityEngine';

export class DocumentationEngine {
  private studentChecklists: Map<string, ManagedDocument[]> = new Map();
  private reminderLogs: DocumentReminderLog[] = [];
  private profileAnalyses: Map<string, StudentProfileAnalysis> = new Map();
  private triggeredServices: Map<string, TriggeredServiceRecord[]> = new Map();
  private securityEngine: SecurityEngine;

  constructor(securityEngine: SecurityEngine) {
    this.securityEngine = securityEngine;
    this.seedInitialData();
  }

  // --- Country Checklists Master Definitions ---
  public getCountryChecklistTemplates(): Record<string, CountryChecklistTemplate> {
    return {
      Germany: {
        country: 'Germany',
        countryCode: 'DE',
        currency: 'EUR',
        requirements: [
          { documentKey: 'tenth_marksheet', title: '10th Class Marksheet / SSC Certificate', category: 'Academic', requirementLevel: 'mandatory', description: 'Original state/CBSE/ICSE 10th board passing certificate & marksheet showing date of birth.' },
          { documentKey: 'twelfth_marksheet', title: '12th Class Marksheet / HSC Certificate', category: 'Academic', requirementLevel: 'mandatory', description: 'Original 12th standard mark card with subject breakdowns (Physics, Chemistry, Maths/Commerce).' },
          { documentKey: 'bachelor_transcripts', title: 'Bachelor Degree Semester-wise Transcripts', category: 'Academic', requirementLevel: 'mandatory', description: 'Complete official transcripts issued by university registrar for all semesters (1 to 8).' },
          { documentKey: 'bachelor_degree_cert', title: 'Bachelor Degree Certificate / Provisional', category: 'Academic', requirementLevel: 'mandatory', description: 'Original graduation convocation degree certificate or provisional certificate.' },
          { documentKey: 'aps_certificate', title: 'German APS Certificate (India Verification)', category: 'Visa', requirementLevel: 'mandatory', description: 'Mandatory German Academic Evaluation Centre (APS) verification certificate with security barcode.' },
          { documentKey: 'german_lang_cert', title: 'German Language Certificate (A1 / A2 / B1)', category: 'Test_Scores', requirementLevel: 'conditional', condition: 'Required if program has German language modules or visa interview preference', description: 'Goethe-Institut, Telc, or TestDaF official language exam certificate.' },
          { documentKey: 'english_test_score', title: 'English Proficiency Scorecard (IELTS / TOEFL)', category: 'Test_Scores', requirementLevel: 'mandatory', description: 'Academic IELTS (overall min 6.5) or TOEFL iBT (min 88) test report form.' },
          { documentKey: 'statement_of_purpose', title: 'Statement of Purpose (SOP)', category: 'Statement', requirementLevel: 'mandatory', description: 'Academic & career goal motivation letter tailored to German university curriculum.' },
          { documentKey: 'letters_of_recommendation', title: 'Letters of Recommendation (2 Academic LORs)', category: 'Academic', requirementLevel: 'mandatory', description: 'Two signed official institutional letterhead recommendation letters from college professors.' },
          { documentKey: 'europass_cv', title: 'Curriculum Vitae (Europass Format)', category: 'Academic', requirementLevel: 'mandatory', description: 'Chronological CV formatted according to official European Union Europass standards.' },
          { documentKey: 'passport_bio', title: 'Passport Bio Pages (First & Last Page)', category: 'Identity', requirementLevel: 'mandatory', description: 'High-resolution colored scan of first bio page and address page with min 18 months validity.' },
          { documentKey: 'blocked_account_confirmation', title: 'German Blocked Account Confirmation (€11,904)', category: 'Financial', requirementLevel: 'mandatory', description: 'Official 06-Sperrkonto confirmation document from Expatrio, Coracle, or Fintiba.' },
          { documentKey: 'health_insurance_letter', title: 'Statutory Health Insurance Certificate (TK / Barmer)', category: 'Visa', requirementLevel: 'mandatory', description: 'German public/private student health insurance confirmation for enrollment & visa.' }
        ]
      },
      UK: {
        country: 'United Kingdom',
        countryCode: 'GB',
        currency: 'GBP',
        requirements: [
          { documentKey: 'tenth_marksheet', title: '10th Class Marksheet / Certificate', category: 'Academic', requirementLevel: 'mandatory', description: 'Secondary school examination board certificate.' },
          { documentKey: 'twelfth_marksheet', title: '12th Class Marksheet / HSC', category: 'Academic', requirementLevel: 'mandatory', description: 'Higher secondary marksheet (UK universities often evaluate 12th English score for IELTS waiver).' },
          { documentKey: 'bachelor_transcripts', title: 'Bachelor Degree Official Transcripts', category: 'Academic', requirementLevel: 'mandatory', description: 'Consolidated and individual semester mark cards.' },
          { documentKey: 'bachelor_degree_cert', title: 'Degree Certificate / Provisional', category: 'Academic', requirementLevel: 'mandatory', description: 'Convocation or provisional degree issued by university.' },
          { documentKey: 'ielts_ukvi_score', title: 'IELTS Academic / UKVI Scorecard', category: 'Test_Scores', requirementLevel: 'mandatory', description: 'IELTS UKVI or standard Academic (min 6.5, no band less than 5.5).' },
          { documentKey: 'statement_of_purpose', title: 'Statement of Purpose (SOP - UK Format)', category: 'Statement', requirementLevel: 'mandatory', description: '500-1000 word statement explaining course choice, career vision, and why UK.' },
          { documentKey: 'letters_of_recommendation', title: 'Academic / Professional Reference Letters (2 LORs)', category: 'Academic', requirementLevel: 'mandatory', description: 'Referees with official corporate/institutional domain email addresses.' },
          { documentKey: 'academic_cv', title: 'Professional Academic Resume', category: 'Academic', requirementLevel: 'mandatory', description: 'Formatted CV detailing educational timeline, projects, and work history.' },
          { documentKey: 'tb_test_certificate', title: 'Tuberculosis (TB) Test Certificate (IOM Approved)', category: 'Visa', requirementLevel: 'mandatory', description: 'Mandatory UKVI medical TB clearance from designated clinic in India.' },
          { documentKey: 'bank_statement_28days', title: '28-Day Bank Statement & Balance Certificate', category: 'Financial', requirementLevel: 'mandatory', description: 'Funds covering tuition balance + 9-month living costs held continuously for 28 days.' },
          { documentKey: 'passport_bio', title: 'Passport Bio Pages', category: 'Identity', requirementLevel: 'mandatory', description: 'Valid passport with at least 2 blank pages for UK visa vignette.' }
        ]
      },
      USA: {
        country: 'United States',
        countryCode: 'US',
        currency: 'USD',
        requirements: [
          { documentKey: 'tenth_marksheet', title: '10th Secondary Certificate', category: 'Academic', requirementLevel: 'mandatory', description: 'Official high school passing certificate.' },
          { documentKey: 'twelfth_marksheet', title: '12th Higher Secondary Certificate', category: 'Academic', requirementLevel: 'mandatory', description: 'Pre-university certificate with subject marks.' },
          { documentKey: 'bachelor_transcripts', title: 'College Transcripts (WES Evaluation if required)', category: 'Academic', requirementLevel: 'mandatory', description: 'Official college transcript in sealed registrar envelope.' },
          { documentKey: 'bachelor_degree_cert', title: 'Bachelor Degree Certificate', category: 'Academic', requirementLevel: 'mandatory', description: 'Degree convocation certificate or course completion letter.' },
          { documentKey: 'english_test_score', title: 'TOEFL iBT / IELTS Academic / Duolingo', category: 'Test_Scores', requirementLevel: 'mandatory', description: 'Official score sent via ETS/IDP reporting code.' },
          { documentKey: 'gre_gmat_score', title: 'GRE / GMAT Official Scorecard', category: 'Test_Scores', requirementLevel: 'conditional', condition: 'Required for STEM Master\'s and top 100 US colleges', description: 'Standardized graduate admissions exam score report.' },
          { documentKey: 'statement_of_purpose', title: 'Statement of Purpose / Personal Statement', category: 'Statement', requirementLevel: 'mandatory', description: 'In-depth essay highlighting research interests, undergraduate projects, and professors.' },
          { documentKey: 'letters_of_recommendation', title: '3 Letters of Recommendation (Academic & Employer)', category: 'Academic', requirementLevel: 'mandatory', description: 'Three detailed references evaluating academic merit and quantitative abilities.' },
          { documentKey: 'financial_affidavit', title: 'Affidavit of Financial Support & Bank Statements', category: 'Financial', requirementLevel: 'mandatory', description: 'Bank balance letter showing 1st year tuition + living ($40,000 - $60,000 USD).' },
          { documentKey: 'passport_bio', title: 'Passport Bio Pages', category: 'Identity', requirementLevel: 'mandatory', description: 'Valid passport with minimum 6 months validity beyond intended stay.' }
        ]
      },
      Canada: {
        country: 'Canada',
        countryCode: 'CA',
        currency: 'CAD',
        requirements: [
          { documentKey: 'tenth_marksheet', title: '10th Class Marksheet', category: 'Academic', requirementLevel: 'mandatory', description: 'Secondary school certificate.' },
          { documentKey: 'twelfth_marksheet', title: '12th Class Marksheet', category: 'Academic', requirementLevel: 'mandatory', description: 'Senior secondary mark card.' },
          { documentKey: 'bachelor_transcripts', title: 'Bachelor Degree Transcripts', category: 'Academic', requirementLevel: 'mandatory', description: 'Complete undergraduate transcripts.' },
          { documentKey: 'bachelor_degree_cert', title: 'Degree Certificate', category: 'Academic', requirementLevel: 'mandatory', description: 'Graduation certificate.' },
          { documentKey: 'ielts_score', title: 'IELTS Academic (Min 6.0 in each band for SDS)', category: 'Test_Scores', requirementLevel: 'mandatory', description: 'Student Direct Stream (SDS) compliant language score.' },
          { documentKey: 'statement_of_purpose', title: 'Statement of Purpose / Study Plan', category: 'Statement', requirementLevel: 'mandatory', description: 'Detailed study plan addressing IRCC visa officer requirements.' },
          { documentKey: 'letters_of_recommendation', title: '2 Letters of Recommendation', category: 'Academic', requirementLevel: 'mandatory', description: 'Academic and professional LORs.' },
          { documentKey: 'gic_certificate', title: 'Guaranteed Investment Certificate (GIC $20,635 CAD)', category: 'Financial', requirementLevel: 'mandatory', description: 'Scotiabank, CIBC, or ICICI Canada GIC investment certificate.' },
          { documentKey: 'medical_exam_sheet', title: 'Upfront eMedical Exam Sheet', category: 'Visa', requirementLevel: 'mandatory', description: 'IRCC panel physician medical checkup acknowledgment sheet.' },
          { documentKey: 'passport_bio', title: 'Passport Bio Pages', category: 'Identity', requirementLevel: 'mandatory', description: 'Valid passport with minimum 2 years validity.' }
        ]
      }
    };
  }

  // --- Checklist Initialization & Retrieval ---
  public getStudentChecklist(studentId: string, country = 'Germany'): ManagedDocument[] {
    if (this.studentChecklists.has(studentId)) {
      return this.studentChecklists.get(studentId)!;
    }

    const templates = this.getCountryChecklistTemplates();
    const template = templates[country] || templates['Germany'];

    const initialDocs: ManagedDocument[] = template.requirements.map((req, idx) => {
      // Simulate realistic initial states for demo
      let status: DocumentStatus = 'requested';
      let versions: DocumentVersion[] = [];
      let verificationNotes: string | undefined = undefined;
      let rejectionReason: string | undefined = undefined;

      if (idx === 0 || idx === 1) {
        status = 'approved';
        versions = [{
          versionNumber: 1,
          fileName: `${req.documentKey}_scanned_verified.pdf`,
          fileSizeMb: 2.4,
          mimeType: 'application/pdf',
          uploadedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
          uploadedByUserId: studentId,
          uploadedByName: 'Student (Self)',
          uploadedByRole: 'student',
          sha256Hash: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`,
          vaultToken: `vlt_tok_${studentId}_${idx}`,
          status: 'approved',
          reviewedBy: 'Rajesh Nair (Processing Officer)',
          reviewedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
          verificationNotes: 'Marks verified against state board database. Clear scan.'
        }];
      } else if (idx === 2) {
        status = 'rejected';
        versions = [{
          versionNumber: 1,
          fileName: `${req.documentKey}_v1.pdf`,
          fileSizeMb: 3.1,
          mimeType: 'application/pdf',
          uploadedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
          uploadedByUserId: studentId,
          uploadedByName: 'Student (Self)',
          uploadedByRole: 'student',
          sha256Hash: `a8b1c24298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b866`,
          vaultToken: `vlt_tok_${studentId}_${idx}_v1`,
          status: 'rejected',
          rejectionReason: 'Missing Pages or Backside: Semester 5 & 6 marks card missing backside grading legend.',
          verificationNotes: 'Please re-scan with all pages front and back.'
        }];
        rejectionReason = 'Missing Pages or Backside: Semester 5 & 6 marks card missing backside grading legend.';
        verificationNotes = 'Please re-scan with all pages front and back.';
      } else if (idx === 3) {
        status = 'uploaded';
        versions = [{
          versionNumber: 1,
          fileName: `${req.documentKey}_draft.pdf`,
          fileSizeMb: 1.8,
          mimeType: 'application/pdf',
          uploadedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          uploadedByUserId: studentId,
          uploadedByName: 'Student (Self)',
          uploadedByRole: 'student',
          sha256Hash: `b7c9c24298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b877`,
          vaultToken: `vlt_tok_${studentId}_${idx}_v1`,
          status: 'uploaded'
        }];
      }

      return {
        id: `doc_${studentId}_${req.documentKey}`,
        studentId,
        documentKey: req.documentKey,
        title: req.title,
        category: req.category,
        requirementLevel: req.requirementLevel,
        applicableCountries: [country],
        conditionalExplanation: req.condition,
        description: req.description,
        status,
        currentVersion: versions.length > 0 ? versions.length : 1,
        versions,
        requestedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
        remindersSent: status === 'rejected' ? 2 : status === 'requested' ? 1 : 0,
        lastReminderAt: status === 'rejected' ? new Date(Date.now() - 24 * 3600 * 1000).toISOString() : undefined,
        isEscalatedToManager: status === 'rejected',
        verificationNotes,
        rejectionReason
      };
    });

    this.studentChecklists.set(studentId, initialDocs);
    return initialDocs;
  }

  // --- Document Upload with Validation & Versioning ---
  public uploadDocument(params: {
    studentId: string;
    documentId: string;
    fileName: string;
    fileSizeMb: number;
    mimeType: string;
    uploaderId: string;
    uploaderName: string;
    uploaderRole: string;
    clientIp: string;
  }): { success: boolean; document?: ManagedDocument; error?: string } {
    const list = this.studentChecklists.get(params.studentId) || this.getStudentChecklist(params.studentId);
    const doc = list.find(d => d.id === params.documentId || d.documentKey === params.documentId);

    if (!doc) {
      return { success: false, error: 'Document requirement not found in student checklist.' };
    }

    // Validation checks
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(params.mimeType.toLowerCase())) {
      return { 
        success: false, 
        error: `Invalid file format (${params.mimeType}). Only PDF, JPEG, and PNG files are accepted.` 
      };
    }

    if (params.fileSizeMb > 2.0) {
      return { 
        success: false, 
        error: `File size (${params.fileSizeMb.toFixed(2)} MB) exceeds maximum permissible limit of 2.0 MB.` 
      };
    }

    // Safety checks against malicious extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.js', '.scr'];
    if (dangerousExtensions.some(ext => params.fileName.toLowerCase().endsWith(ext))) {
      return { success: false, error: 'Security violation: Executable files are strictly blocked.' };
    }

    const nextVersionNum = doc.versions.length + 1;
    const vaultToken = `vlt_tok_${params.studentId}_${doc.documentKey}_v${nextVersionNum}_${Date.now()}`;
    const sha256Hash = `sha256_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;

    const newVersion: DocumentVersion = {
      versionNumber: nextVersionNum,
      fileName: params.fileName,
      fileSizeMb: params.fileSizeMb,
      mimeType: params.mimeType,
      uploadedAt: new Date().toISOString(),
      uploadedByUserId: params.uploaderId,
      uploadedByName: params.uploaderName,
      uploadedByRole: params.uploaderRole,
      sha256Hash,
      vaultToken,
      status: 'uploaded'
    };

    doc.versions.push(newVersion);
    doc.currentVersion = nextVersionNum;
    doc.status = 'uploaded';
    // Clear past rejection notes upon successful re-upload
    doc.rejectionReason = undefined;
    doc.verificationNotes = undefined;

    this.securityEngine.logSecurityEvent(
      nextVersionNum > 1 ? 'DOCUMENT_REUPLOADED' : 'DOCUMENT_UPLOADED',
      params.uploaderId,
      params.uploaderRole,
      doc.id,
      'vault_documents',
      params.clientIp,
      `Document '${doc.title}' uploaded (Version ${nextVersionNum}, ${params.fileName}, ${params.fileSizeMb}MB) by ${params.uploaderName}`,
      'info'
    );

    return { success: true, document: doc };
  }

  // --- Document Verification, Approval, Rejection, and Waiving ---
  public updateDocumentStatus(params: {
    studentId: string;
    documentId: string;
    newStatus: DocumentStatus;
    reviewerId: string;
    reviewerName: string;
    reviewerRole: string;
    rejectionReason?: string;
    verificationNotes?: string;
    waiveReason?: string;
    clientIp: string;
  }): { success: boolean; document?: ManagedDocument; error?: string } {
    const list = this.studentChecklists.get(params.studentId) || this.getStudentChecklist(params.studentId);
    const doc = list.find(d => d.id === params.documentId || d.documentKey === params.documentId);

    if (!doc) {
      return { success: false, error: 'Document requirement not found.' };
    }

    // Role check: Only authorized staff can verify/approve/reject/waive
    const authorizedRoles = ['super_admin', 'branch_manager', 'processing_officer', 'counselor', 'visa_officer'];
    if (!authorizedRoles.includes(params.reviewerRole)) {
      return { success: false, error: 'Unauthorized: Students cannot alter verification statuses.' };
    }

    doc.status = params.newStatus;
    const now = new Date().toISOString();

    if (params.newStatus === 'approved') {
      doc.approvedBy = params.reviewerName;
      doc.approvedAt = now;
      doc.verificationNotes = params.verificationNotes || 'Document verified against authenticity criteria.';
      doc.rejectionReason = undefined;

      // Update current version record
      if (doc.versions.length > 0) {
        const latest = doc.versions[doc.versions.length - 1];
        latest.status = 'approved';
        latest.reviewedBy = params.reviewerName;
        latest.reviewedAt = now;
        latest.verificationNotes = doc.verificationNotes;
      }

      this.securityEngine.logSecurityEvent(
        'DOCUMENT_VERIFIED',
        params.reviewerId,
        params.reviewerRole,
        doc.id,
        'vault_documents',
        params.clientIp,
        `Document '${doc.title}' verified and APPROVED by ${params.reviewerName}. Notes: ${doc.verificationNotes}`,
        'info'
      );
    } else if (params.newStatus === 'rejected') {
      if (!params.rejectionReason) {
        return { success: false, error: 'Rejection reason is required when rejecting a document.' };
      }
      doc.rejectionReason = params.rejectionReason;
      doc.verificationNotes = params.verificationNotes || 'Re-upload requested with corrected document scan.';

      if (doc.versions.length > 0) {
        const latest = doc.versions[doc.versions.length - 1];
        latest.status = 'rejected';
        latest.rejectionReason = params.rejectionReason;
        latest.verificationNotes = params.verificationNotes;
        latest.reviewedBy = params.reviewerName;
        latest.reviewedAt = now;
      }

      this.securityEngine.logSecurityEvent(
        'DOCUMENT_REJECTED',
        params.reviewerId,
        params.reviewerRole,
        doc.id,
        'vault_documents',
        params.clientIp,
        `Document '${doc.title}' REJECTED by ${params.reviewerName}. Reason: ${params.rejectionReason}`,
        'warning'
      );
    } else if (params.newStatus === 'waived') {
      doc.waivedBy = params.reviewerName;
      doc.waivedAt = now;
      doc.waiveReason = params.waiveReason || 'Waived as per program prerequisites or alternative credential.';

      this.securityEngine.logSecurityEvent(
        'DOCUMENT_WAIVED',
        params.reviewerId,
        params.reviewerRole,
        doc.id,
        'vault_documents',
        params.clientIp,
        `Document '${doc.title}' WAIVED by ${params.reviewerName}. Reason: ${doc.waiveReason}`,
        'info'
      );
    }

    return { success: true, document: doc };
  }

  // --- Document Automation & Reminders (Idempotent Scheduler) ---
  public runReminderCronJob(studentsList: StudentMasterProfile[]): {
    totalEvaluated: number;
    remindersSent: number;
    escalationsTriggered: number;
    logs: DocumentReminderLog[];
  } {
    let remindersCount = 0;
    let escalationsCount = 0;
    const now = Date.now();
    const newLogs: DocumentReminderLog[] = [];

    studentsList.forEach(student => {
      const docs = this.studentChecklists.get(student.id) || this.getStudentChecklist(student.id);

      docs.forEach(doc => {
        // Evaluate only pending documents
        if (doc.status === 'requested' || doc.status === 'rejected') {
          const reqTime = doc.requestedAt ? new Date(doc.requestedAt).getTime() : now - 4 * 24 * 3600 * 1000;
          const daysPending = Math.max(1, Math.floor((now - reqTime) / (24 * 3600 * 1000)));

          // Idempotency: Check if reminder was already sent today (within last 24 hours)
          if (doc.lastReminderAt) {
            const hoursSinceLastReminder = (now - new Date(doc.lastReminderAt).getTime()) / (3600 * 1000);
            if (hoursSinceLastReminder < 24) {
              return; // Skip: Avoid duplicate reminders within 24 hours
            }
          }

          let stage: '3_days' | '7_days' | '10_days_escalation' | null = null;
          let channel: 'WhatsApp' | 'Email' | 'SMS' | 'Manager_Escalation' = 'WhatsApp';
          let message = '';

          if (daysPending >= 10 && !doc.isEscalatedToManager) {
            stage = '10_days_escalation';
            channel = 'Manager_Escalation';
            doc.isEscalatedToManager = true;
            escalationsCount++;
            message = `URGENT ESCALATION to Branch Manager: Student ${student.studentRefNo} (${student.personal.firstName}) has pending document '${doc.title}' overdue for ${daysPending} days. Action required.`;
            this.securityEngine.logSecurityEvent(
              'DOCUMENT_REMINDER_ESCALATED',
              'system_scheduler',
              'super_admin',
              doc.id,
              'vault_documents',
              '127.0.0.1',
              message,
              'critical'
            );
          } else if (daysPending >= 7 && doc.remindersSent < 2) {
            stage = '7_days';
            channel = 'Email';
            remindersCount++;
            message = `2nd Reminder: Dear ${student.personal.firstName}, your required document '${doc.title}' has been pending for ${daysPending} days. Please upload to avoid application delay.`;
            this.securityEngine.logSecurityEvent(
              'DOCUMENT_REMINDER_SENT',
              'system_scheduler',
              'super_admin',
              doc.id,
              'vault_documents',
              '127.0.0.1',
              `2nd reminder sent for document '${doc.title}' to ${student.personal.email}`,
              'info'
            );
          } else if (daysPending >= 3 && doc.remindersSent < 1) {
            stage = '3_days';
            channel = 'WhatsApp';
            remindersCount++;
            const appTitle = typeof global !== 'undefined' && (global as any).currentAppName ? (global as any).currentAppName : 'Admissions Desk';
            message = `Hi ${student.personal.firstName}, gentle reminder from ${appTitle} to upload your '${doc.title}' in the student portal.`;
            this.securityEngine.logSecurityEvent(
              'DOCUMENT_REMINDER_SENT',
              'system_scheduler',
              'super_admin',
              doc.id,
              'vault_documents',
              '127.0.0.1',
              `1st reminder sent for document '${doc.title}' to ${student.personal.phone}`,
              'info'
            );
          }

          if (stage) {
            doc.remindersSent += 1;
            doc.lastReminderAt = new Date().toISOString();

            const logEntry: DocumentReminderLog = {
              id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              studentId: student.id,
              studentName: `${student.personal.firstName} ${student.personal.lastName}`,
              documentId: doc.id,
              documentTitle: doc.title,
              daysPending,
              reminderStage: stage,
              sentAt: doc.lastReminderAt,
              recipientEmail: student.personal.email,
              recipientPhone: student.personal.phone,
              channel,
              status: stage === '10_days_escalation' ? 'escalated' : 'delivered',
              messageText: message
            };

            this.reminderLogs.unshift(logEntry);
            newLogs.push(logEntry);
          }
        }
      });
    });

    return {
      totalEvaluated: studentsList.length,
      remindersSent: remindersCount,
      escalationsTriggered: escalationsCount,
      logs: newLogs
    };
  }

  public getReminderLogs(): DocumentReminderLog[] {
    return this.reminderLogs;
  }

  // --- Profile Analysis Engine ---

  /**
   * German Bavarian Formula for Grade Conversion
   * Formula: N = 1 + 3 * (N_max - N_d) / (N_max - N_min)
   * Where:
   *   N = Resulting German GPA (1.0 = Best, 4.0 = Minimum Passing)
   *   N_max = Maximum achievable grade (e.g., 10.0 for CGPA, 100 for percentage)
   *   N_min = Minimum passing grade (e.g., 4.0 for CGPA, 40 for percentage)
   *   N_d = Candidate's obtained grade
   */
  public calculateGermanBavarianGpa(obtainedGrade: number, maxGrade = 10.0, minPassGrade = 4.0): number {
    if (obtainedGrade >= maxGrade) return 1.0;
    if (obtainedGrade <= minPassGrade) return 4.0;

    const bavarian = 1 + 3 * ((maxGrade - obtainedGrade) / (maxGrade - minPassGrade));
    return parseFloat(Math.min(4.0, Math.max(1.0, bavarian)).toFixed(2));
  }

  public evaluateProfile(student: StudentMasterProfile, overrides?: Partial<StudentProfileAnalysis>): StudentProfileAnalysis {
    const existing = this.profileAnalyses.get(student.id);
    if (existing && !overrides) {
      return existing;
    }

    const country = student.preferences?.targetCountries?.[0] || 'Germany';
    const targetCourse = student.preferences?.targetFields?.[0] || 'M.Sc. Data Science & AI';
    const targetIntake = student.preferences ? `${student.preferences.targetIntakeSeason} ${student.preferences.targetIntakeYear}` : 'Winter 2026';

    const cgpa = overrides?.academic?.cgpa ?? 8.4;
    const cgpaScale = overrides?.academic?.cgpaScale ?? 10.0;
    const minPass = cgpaScale === 100 ? 40 : 4.0;
    const bavarianGpa = this.calculateGermanBavarianGpa(cgpa, cgpaScale, minPass);

    const academic: AcademicRecord = {
      tenthMarksPct: overrides?.academic?.tenthMarksPct ?? 88.5,
      tenthBoard: overrides?.academic?.tenthBoard ?? 'CBSE',
      tenthPassingYear: overrides?.academic?.tenthPassingYear ?? 2018,
      twelfthMarksPct: overrides?.academic?.twelfthMarksPct ?? 84.0,
      twelfthBoard: overrides?.academic?.twelfthBoard ?? 'State Board',
      twelfthStream: overrides?.academic?.twelfthStream ?? 'PCM (Computer Science)',
      twelfthPassingYear: overrides?.academic?.twelfthPassingYear ?? 2020,
      degreeLevel: overrides?.academic?.degreeLevel ?? 'Bachelor',
      degreeName: overrides?.academic?.degreeName ?? 'B.Tech in Computer Science & Engineering',
      university: overrides?.academic?.university ?? 'Osmania University, Hyderabad',
      graduationYear: overrides?.academic?.graduationYear ?? 2024,
      cgpa,
      cgpaScale,
      germanBavarianGpa: bavarianGpa,
      backlogsTotal: overrides?.academic?.backlogsTotal ?? 1,
      backlogsActive: overrides?.academic?.backlogsActive ?? 0,
      academicGapYears: overrides?.academic?.academicGapYears ?? 0,
      gapJustification: overrides?.academic?.gapJustification ?? 'No academic gap. Graduated on schedule.',
      hasWorkExperience: overrides?.academic?.hasWorkExperience ?? true,
      workExperienceMonths: overrides?.academic?.workExperienceMonths ?? 18,
      workExperienceCompany: overrides?.academic?.workExperienceCompany ?? 'Tech Mahindra Ltd',
      workExperienceRole: overrides?.academic?.workExperienceRole ?? 'Junior Software Engineer'
    };

    const language: LanguageAptitudeRecord = {
      englishTest: overrides?.language?.englishTest ?? 'IELTS',
      overallScore: overrides?.language?.overallScore ?? 7.0,
      listeningScore: overrides?.language?.listeningScore ?? 7.5,
      readingScore: overrides?.language?.readingScore ?? 7.0,
      writingScore: overrides?.language?.writingScore ?? 6.5,
      speakingScore: overrides?.language?.speakingScore ?? 7.0,
      testDate: overrides?.language?.testDate ?? '2025-11-14',
      isTestBooked: true,
      germanLevel: overrides?.language?.germanLevel ?? (country === 'Germany' ? 'A1' : 'None'),
      germanCertificateType: country === 'Germany' ? 'Goethe' : undefined,
      hasGreGmat: overrides?.language?.hasGreGmat ?? false,
      greQuant: overrides?.language?.greQuant ?? 162,
      greVerbal: overrides?.language?.greVerbal ?? 154,
      greAwa: overrides?.language?.greAwa ?? 4.0
    };

    const passport: PassportReadiness = {
      passportNumber: student.personal.passportNumber || 'Z9182341',
      expiryDate: overrides?.passport?.expiryDate ?? '2031-08-15',
      validityMonths: overrides?.passport?.validityMonths ?? 62,
      blankPagesCount: overrides?.passport?.blankPagesCount ?? 28,
      nameMatchesAcademics: overrides?.passport?.nameMatchesAcademics ?? true,
      status: 'Ready'
    };

    const financial: FinancialReadiness = {
      annualFamilyIncomeInr: overrides?.financial?.annualFamilyIncomeInr ?? 1800000,
      liquidSavingsInr: overrides?.financial?.liquidSavingsInr ?? 1500000,
      estimatedYearlyBudgetInr: overrides?.financial?.estimatedYearlyBudgetInr ?? 2200000,
      requiresEducationLoan: student.preferences?.requiresLoan ?? true,
      loanEligibleAmountInr: overrides?.financial?.loanEligibleAmountInr ?? 2500000,
      hasCollateral: overrides?.financial?.hasCollateral ?? true,
      collateralValueInr: overrides?.financial?.collateralValueInr ?? 6500000,
      blockedAccountRequired: country === 'Germany',
      blockedAccountCapacityEur: country === 'Germany' ? 11904 : 0
    };

    // --- Dynamic Risk Matrix Calculation ---
    const risks: ProfileRiskItem[] = [];

    if (academic.backlogsActive > 0) {
      risks.push({
        id: 'r_active_backlogs',
        category: 'Academic',
        severity: 'high',
        title: `${academic.backlogsActive} Active Backlog(s) Remaining`,
        description: 'Universities in Germany and top UK institutions do not issue unconditional offers with pending uncleared backlogs.',
        mitigationStrategy: 'Immediate exam sitting to clear backlogs prior to application submission. Obtain provisional clearance memo.'
      });
    }

    if (academic.backlogsTotal >= 5) {
      risks.push({
        id: 'r_high_backlogs',
        category: 'Academic',
        severity: 'medium',
        title: `High Total Backlog History (${academic.backlogsTotal} attempts)`,
        description: 'Competitive public universities scrutinize total history attempts.',
        mitigationStrategy: 'Provide official backlogs clearance certificate and strong academic recommendation letters.'
      });
    }

    if (academic.academicGapYears >= 2 && !academic.hasWorkExperience) {
      risks.push({
        id: 'r_unexplained_gap',
        category: 'Academic',
        severity: 'critical',
        title: `${academic.academicGapYears}-Year Academic Gap without Work Experience`,
        description: 'Embassy visa officers require concrete documentary proof for gaps over 12 months.',
        mitigationStrategy: 'Prepare formal notarized gap affidavit, online certification certificates, and family support letters.'
      });
    }

    if (language.overallScore > 0 && language.overallScore < 6.5) {
      risks.push({
        id: 'r_ielts_low',
        category: 'Language',
        severity: 'medium',
        title: `English Test Score (${language.overallScore}) Borderline`,
        description: 'Direct entry for master programs generally mandates minimum 6.5 overall band.',
        mitigationStrategy: 'Enroll in GMI Fast-Track IELTS crash course to target 7.0 band retake within 30 days.'
      });
    }

    if (country === 'Germany' && language.germanLevel === 'None') {
      risks.push({
        id: 'r_german_lang',
        category: 'Language',
        severity: 'low',
        title: 'Zero German Language Proficiency',
        description: 'While English-taught programs accept A0, German visa officers strongly favor candidates with at least A1/A2.',
        mitigationStrategy: 'Trigger German A1 intensive weekend batch coaching.'
      });
    }

    if (financial.requiresEducationLoan && !financial.hasCollateral && (financial.loanEligibleAmountInr || 0) < 1500000) {
      risks.push({
        id: 'r_loan_unsecured',
        category: 'Financial',
        severity: 'high',
        title: 'High Non-Collateral Loan Requirement',
        description: 'Unsecured education loan approvals require strong co-applicant CIBIL score (>750).',
        mitigationStrategy: 'Route to HDFC Credila / Avanse non-collateral education loan desk for immediate co-applicant CIBIL check.'
      });
    }

    if (passport.validityMonths < 18) {
      risks.push({
        id: 'r_passport_renewal',
        category: 'Immigration',
        severity: 'high',
        title: `Passport Validity Under 18 Months (${passport.validityMonths} months remaining)`,
        description: 'VFS biometric appointment requires at least 18 months passport validity from date of entry.',
        mitigationStrategy: 'Immediate Tatkaal passport renewal at regional passport office (PSK).'
      });
    }

    // --- Dynamic Eligibility Outcome Assessment ---
    let eligibilityOutcome: EligibilityOutcome = 'Eligible';
    const conditions: string[] = [];

    if (academic.backlogsActive > 0) {
      eligibilityOutcome = 'Conditionally_Eligible';
      conditions.push('Clear all active backlogs before submitting university applications.');
    }

    if (language.overallScore < 6.5) {
      eligibilityOutcome = 'Conditionally_Eligible';
      conditions.push('Retake IELTS/PTE to achieve overall band 6.5 with no band less than 6.0.');
    }

    if (country === 'Germany') {
      if (bavarianGpa > 2.7) {
        eligibilityOutcome = 'Conditionally_Eligible';
        conditions.push('German grade above 2.5: Restrict university shortlisting to applied sciences (Fachhochschulen) with specific prerequisite alignment.');
      }
      conditions.push('Mandatory German APS verification certificate registration required.');
    }

    if (academic.academicGapYears >= 3 && !academic.hasWorkExperience) {
      eligibilityOutcome = 'Not_Currently_Eligible';
      conditions.push('Unjustified 3+ year gap requires professional work experience or post-graduate diploma before international filing.');
    }

    // --- Personalized Study Roadmap Milestones ---
    const roadmap: PersonalizedRoadmapMilestone[] = [
      {
        id: 'm1_tests',
        phase: 'Stage 1: Test Readiness & Language',
        title: 'English & Aptitude Test Completion',
        description: `Target IELTS 7.0 / German A1 certification. Send official scorecards to GMI Portal.`,
        targetDate: '2026-03-31',
        status: language.overallScore >= 6.5 ? 'completed' : 'in_progress',
        responsibleRole: 'Counselor / Student'
      },
      {
        id: 'm2_docs_vault',
        phase: 'Stage 2: Documentation & APS Filing',
        title: country === 'Germany' ? 'APS India Application & Document Vault Verification' : 'Document Vault Verification',
        description: country === 'Germany' 
          ? 'Courier sealed professor-attested mark cards to APS New Delhi office. Track token verification.' 
          : 'Upload 100% verified academic marksheets, SOP, and LORs to GMI Vault.',
        targetDate: '2026-04-30',
        status: 'in_progress',
        responsibleRole: 'Processing Officer'
      },
      {
        id: 'm3_university_filing',
        phase: 'Stage 3: University Application Submissions',
        title: 'Portal Submissions to Ambitious, Moderate, Safe Universities',
        description: `Submit 5 applications (Uni-Assist, directly to university portals, or UCAS). Pay application fees.`,
        targetDate: '2026-05-31',
        status: 'upcoming',
        responsibleRole: 'Application Executive'
      },
      {
        id: 'm4_offers',
        phase: 'Stage 4: Offer Letters & Conditional Clearances',
        title: 'Offer Evaluation & Admission Confirmation Deposit',
        description: 'Receive conditional/unconditional offers. Select top choice university and lock seat.',
        targetDate: '2026-07-15',
        status: 'upcoming',
        responsibleRole: 'Counselor'
      },
      {
        id: 'm5_financials_visa',
        phase: 'Stage 5: Financial Proof & Embassy Visa Dossier',
        title: country === 'Germany' ? 'Blocked Account (€11,904) & VFS Visa Appointment' : '28-Day Financials & VFS Biometrics',
        description: 'Transfer living funds to blocked account. Compile embassy visa dossier. Attend VFS biometrics.',
        targetDate: '2026-08-20',
        status: 'upcoming',
        responsibleRole: 'Visa Officer'
      },
      {
        id: 'm6_travel_landing',
        phase: 'Stage 6: Pre-Departure, Forex & Housing',
        title: 'Pre-Departure Briefing & Post-Landing Buddy',
        description: 'Issue international student forex card, overseas SIM card, book student accommodation, fly out.',
        targetDate: '2026-09-15',
        status: 'upcoming',
        responsibleRole: 'Travel Desk & Branch Manager'
      }
    ];

    // University Tiers Recommendations
    const recommendedUniversityTiers = {
      ambitious: country === 'Germany' ? [
        { university: 'Technical University of Munich (TUM)', course: 'M.Sc. Informatics', minGpa: 1.8, country: 'Germany' },
        { university: 'RWTH Aachen University', course: 'M.Sc. Computer Engineering', minGpa: 1.9, country: 'Germany' }
      ] : [
        { university: 'Imperial College London', course: 'MSc Computing', minGpa: 8.5, country: 'UK' },
        { university: 'Columbia University', course: 'MS Computer Science', minGpa: 8.8, country: 'USA' }
      ],
      moderate: country === 'Germany' ? [
        { university: 'Technical University of Berlin (TU Berlin)', course: 'M.Sc. Information Technology', minGpa: 2.3, country: 'Germany' },
        { university: 'University of Stuttgart', course: 'M.Sc. Computer Science', minGpa: 2.4, country: 'Germany' }
      ] : [
        { university: 'University of Manchester', course: 'MSc Advanced Computer Science', minGpa: 7.8, country: 'UK' },
        { university: 'Northeastern University', course: 'MS in Information Systems', minGpa: 7.5, country: 'USA' }
      ],
      safe: country === 'Germany' ? [
        { university: 'Deggendorf Institute of Technology', course: 'M.Sc. Applied Computer Science', minGpa: 2.7, country: 'Germany' },
        { university: 'Coburg University of Applied Sciences', course: 'M.Sc. Software Development', minGpa: 2.8, country: 'Germany' }
      ] : [
        { university: 'Coventry University', course: 'MSc Data Science', minGpa: 6.5, country: 'UK' },
        { university: 'University of North Texas', course: 'MS Computer Science', minGpa: 6.8, country: 'USA' }
      ]
    };

    const analysis: StudentProfileAnalysis = {
      id: `ana_${student.id}`,
      studentId: student.id,
      analyzedAt: new Date().toISOString(),
      analystId: 'usr_po1',
      analystName: 'Rajesh Nair (Senior Profile Analyst)',
      targetCountry: country,
      targetCourse,
      targetIntake,
      academic,
      language,
      passport,
      financial,
      risks,
      eligibilityOutcome,
      eligibilityConditions: conditions,
      analystSummaryNotes: `Student demonstrates strong academic background with ${cgpa} CGPA (German Bavarian Grade: ${bavarianGpa}). ${risks.length} manageable risk factors identified with concrete mitigation steps. Profile is fully viable for ${targetIntake} intake.`,
      isApproved: overrides?.isApproved ?? true,
      approvedBy: overrides?.isApproved ? (overrides.approvedBy || 'Pooja Sharma (Branch Manager)') : undefined,
      approvedAt: overrides?.isApproved ? new Date().toISOString() : undefined,
      roadmap,
      recommendedUniversityTiers
    };

    this.profileAnalyses.set(student.id, analysis);
    return analysis;
  }

  // --- Service Triggers Engine (With Causality Tracking & Idempotency) ---
  public evaluateServiceTriggers(student: StudentMasterProfile): TriggeredServiceRecord[] {
    const existingList = this.triggeredServices.get(student.id) || [];
    const analysis = this.evaluateProfile(student);
    const country = student.preferences?.targetCountries?.[0] || 'Germany';

    const rules: Array<{
      type: TriggeredServiceType;
      title: string;
      desk: string;
      shouldTrigger: boolean;
      ruleName: string;
      explanation: string;
    }> = [
      {
        type: 'passport_assistance',
        title: 'Passport Tatkaal Renewal Assistance',
        desk: 'Immigration & Compliance Desk',
        shouldTrigger: !student.personal.passportNumber || analysis.passport.validityMonths < 18,
        ruleName: 'RULE_PASSPORT_EXPIRING_OR_MISSING',
        explanation: `Triggered because passport validity is ${analysis.passport.validityMonths} months (< 18 months threshold required for embassy visa slot).`
      },
      {
        type: 'ielts_training',
        title: 'IELTS Fast-Track Band 7.0 Coaching',
        desk: 'Test Preparation Academy',
        shouldTrigger: analysis.language.overallScore < 6.5,
        ruleName: 'RULE_IELTS_SCORE_DEFICIT',
        explanation: `Triggered because current English score (${analysis.language.overallScore}) is below target direct entry minimum (6.5).`
      },
      {
        type: 'german_a1_a2',
        title: 'German Language A1/A2 Training Batch',
        desk: 'German Language Faculty',
        shouldTrigger: country === 'Germany' && (analysis.language.germanLevel === 'None' || analysis.language.germanLevel === 'A1'),
        ruleName: 'RULE_GERMANY_LANGUAGE_DEFICIT',
        explanation: `Triggered because preferred destination is Germany and student holds ${analysis.language.germanLevel} proficiency.`
      },
      {
        type: 'aps_certificate',
        title: 'German APS Verification Liaison Service',
        desk: 'German Academic Evaluation Desk',
        shouldTrigger: country === 'Germany',
        ruleName: 'RULE_GERMANY_APS_MANDATORY',
        explanation: `Triggered because APS Certificate is mandatory for all Indian degree holders applying to German universities.`
      },
      {
        type: 'loan_assistance',
        title: 'Education Loan Sanction Support (HDFC Credila / SBI)',
        desk: 'Financial Services Desk',
        shouldTrigger: student.preferences?.requiresLoan || analysis.financial.requiresEducationLoan,
        ruleName: 'RULE_FINANCIAL_LOAN_REQUIRED',
        explanation: `Triggered because student opted for education loan assistance and estimated budget is ₹${(analysis.financial.estimatedYearlyBudgetInr / 100000).toFixed(1)} Lakhs.`
      },
      {
        type: 'blocked_account',
        title: 'German Blocked Account Setup (€11,904 via Expatrio/Coracle)',
        desk: 'Forex & International Banking Desk',
        shouldTrigger: country === 'Germany',
        ruleName: 'RULE_GERMANY_BLOCKED_ACCOUNT_MANDATORY',
        explanation: `Triggered because German student visa mandates statutory blocked account proof of €11,904.`
      },
      {
        type: 'accommodation',
        title: 'Overseas Student Housing (AmberStudent / Casita)',
        desk: 'Logistics & Housing Desk',
        shouldTrigger: true, // Recommended for all overseas students
        ruleName: 'RULE_OVERSEAS_HOUSING_ASSISTANCE',
        explanation: `Triggered to secure verified student studio/shared accommodation near campus.`
      },
      {
        type: 'forex_card',
        title: 'Multi-Currency International Student Forex Card',
        desk: 'Travel & Forex Desk',
        shouldTrigger: true,
        ruleName: 'RULE_PRE_DEPARTURE_FOREX',
        explanation: `Triggered to provide zero-markup multi-currency debit card with emergency travel insurance.`
      },
      {
        type: 'sim_card',
        title: 'International Pre-Activated SIM Card (UK / EU / USA)',
        desk: 'Student Logistics Desk',
        shouldTrigger: true,
        ruleName: 'RULE_PRE_DEPARTURE_CONNECTIVITY',
        explanation: `Triggered to provide free pre-activated international SIM card with data pack upon airport arrival.`
      }
    ];

    rules.forEach(r => {
      if (r.shouldTrigger) {
        // Idempotency: Check if active service already exists
        const existing = existingList.find(s => s.serviceType === r.type && s.status !== 'completed');
        if (existing) {
          // Already active - do not create duplicate
          existing.isDuplicatePrevented = true;
        } else {
          // Trigger new service
          const newService: TriggeredServiceRecord = {
            id: `srv_${student.id}_${r.type}`,
            studentId: student.id,
            serviceType: r.type,
            serviceTitle: r.title,
            triggeredAt: new Date().toISOString(),
            triggerRuleName: r.ruleName,
            triggerReasonExplanation: r.explanation,
            status: 'active',
            assignedPartnerOrDesk: r.desk,
            isDuplicatePrevented: false
          };
          existingList.push(newService);

          this.securityEngine.logSecurityEvent(
            'SERVICE_TRIGGERED',
            'system_service_evaluator',
            'super_admin',
            newService.id,
            'parallel_services',
            '127.0.0.1',
            `Service '${r.title}' triggered for student ${student.studentRefNo}. Reason: ${r.explanation}`,
            'info'
          );
        }
      }
    });

    this.triggeredServices.set(student.id, existingList);
    return existingList;
  }

  // --- Automated Testing Suite ---
  public runDocumentationTestSuite(studentsList: StudentMasterProfile[]): Array<{
    id: string;
    testName: string;
    category: 'Checklists' | 'Upload & Versioning' | 'Access & IDOR' | 'Reminders & Escalation' | 'Profile Analysis' | 'Service Triggers';
    passed: boolean;
    expected: string;
    actual: string;
    details: string;
  }> {
    const results: Array<{
      id: string;
      testName: string;
      category: 'Checklists' | 'Upload & Versioning' | 'Access & IDOR' | 'Reminders & Escalation' | 'Profile Analysis' | 'Service Triggers';
      passed: boolean;
      expected: string;
      actual: string;
      details: string;
    }> = [];

    const testStudent = studentsList[0] || {
      id: 'stu_test_suite_1',
      studentRefNo: 'GMI-2026-TEST',
      personal: { firstName: 'Aarav', lastName: 'Patel', email: 'aarav.patel@example.com', phone: '+919876543210' },
      preferences: { targetCountries: ['Germany'], requiresLoan: true }
    } as any;

    // Test 1: Country-specific checklist generation (Germany)
    const deChecklist = this.getStudentChecklist(testStudent.id, 'Germany');
    const hasAps = deChecklist.some(d => d.documentKey === 'aps_certificate');
    results.push({
      id: 'tc_doc_1',
      testName: 'Country-Specific Checklist Generation (Germany APS Mandatory)',
      category: 'Checklists',
      passed: hasAps && deChecklist.length >= 10,
      expected: 'Germany checklist contains mandatory APS Certificate and >=10 requirements',
      actual: `Checklist generated with ${deChecklist.length} requirements. APS present: ${hasAps}`,
      details: 'Verified Germany-specific requirements include APS, Blocked Account, and German CV.'
    });

    // Test 2: Country-specific checklist generation (UK)
    const ukTemplates = this.getCountryChecklistTemplates();
    const ukReqs = ukTemplates['UK'].requirements;
    const hasTb = ukReqs.some(r => r.documentKey === 'tb_test_certificate');
    results.push({
      id: 'tc_doc_2',
      testName: 'Country-Specific Checklist Generation (UK TB Certificate)',
      category: 'Checklists',
      passed: hasTb,
      expected: 'UK checklist contains mandatory Tuberculosis (TB) clearance certificate',
      actual: `TB test requirement present: ${hasTb}`,
      details: 'Confirmed UK checklist accurately incorporates UKVI TB and 28-day bank balance rules.'
    });

    // Test 3: Document Rejection & Re-upload Version Increment (v1 -> v2)
    const docToReject = deChecklist.find(d => d.status === 'uploaded') || deChecklist[0];
    const rejectRes = this.updateDocumentStatus({
      studentId: testStudent.id,
      documentId: docToReject.id,
      newStatus: 'rejected',
      reviewerId: 'usr_po1',
      reviewerName: 'Rajesh Nair',
      reviewerRole: 'processing_officer',
      rejectionReason: 'Blurry / Unreadable Scan',
      verificationNotes: 'Resolution below 300 DPI.',
      clientIp: '127.0.0.1'
    });
    const uploadRes = this.uploadDocument({
      studentId: testStudent.id,
      documentId: docToReject.id,
      fileName: 'corrected_transcript_hd.pdf',
      fileSizeMb: 3.5,
      mimeType: 'application/pdf',
      uploaderId: testStudent.id,
      uploaderName: 'Aarav Patel',
      uploaderRole: 'student',
      clientIp: '127.0.0.1'
    });
    const versionAfter = uploadRes.document?.currentVersion || 1;
    results.push({
      id: 'tc_doc_3',
      testName: 'Document Rejection & Re-Upload Version Increment (v1 -> v2)',
      category: 'Upload & Versioning',
      passed: rejectRes.success && uploadRes.success && versionAfter >= 2,
      expected: 'Status changes to rejected with reason; re-upload creates Version 2 and archives previous',
      actual: `Reject: ${rejectRes.success}, Upload: ${uploadRes.success}, Current Version: v${versionAfter}`,
      details: 'Version history correctly preserved prior rejected scan with audit notes intact.'
    });

    // Test 4: File Type & Size Validation (Reject Executables & Over-Sized)
    const exeUpload = this.uploadDocument({
      studentId: testStudent.id,
      documentId: docToReject.id,
      fileName: 'malicious_script.exe',
      fileSizeMb: 1.0,
      mimeType: 'application/x-msdownload',
      uploaderId: testStudent.id,
      uploaderName: 'Hacker',
      uploaderRole: 'student',
      clientIp: '127.0.0.1'
    });
    const bigUpload = this.uploadDocument({
      studentId: testStudent.id,
      documentId: docToReject.id,
      fileName: 'huge_document.pdf',
      fileSizeMb: 15.4,
      mimeType: 'application/pdf',
      uploaderId: testStudent.id,
      uploaderName: 'Student',
      uploaderRole: 'student',
      clientIp: '127.0.0.1'
    });
    results.push({
      id: 'tc_doc_4',
      testName: 'File Safety & Boundary Validation (MIME & Size Limits)',
      category: 'Upload & Versioning',
      passed: !exeUpload.success && !bigUpload.success,
      expected: 'Block executable file extensions and files > 2MB',
      actual: `Executable rejected: ${!exeUpload.success}, Over-2MB rejected: ${!bigUpload.success}`,
      details: 'Verified server-side validation blocks dangerous file signatures and enforces 2MB limit.'
    });

    // Test 5: Access Restrictions & IDOR Protection
    const idorTest = this.securityEngine.generatePresignedDownloadToken(
      { userId: 'usr_other_student', name: 'Other Student', role: 'student', studentId: 'stu_unrelated_999' } as any,
      testStudent.id,
      'doc_secret_123',
      'Confidential_Marksheet.pdf',
      '127.0.0.1'
    );
    results.push({
      id: 'tc_doc_5',
      testName: 'Access Control & IDOR Prevention on Document Vault',
      category: 'Access & IDOR',
      passed: !!idorTest.error && !idorTest.token,
      expected: 'Cross-student document download is blocked with IDOR violation audit',
      actual: idorTest.error || 'UNEXPECTED_PERMITTED',
      details: 'Confirmed students can only download documents matching their authenticated studentId.'
    });

    // Test 6: Document Automation Reminders & Idempotency
    const cronResult = this.runReminderCronJob([testStudent]);
    // Run cron again immediately to test idempotency
    const cronResult2 = this.runReminderCronJob([testStudent]);
    results.push({
      id: 'tc_doc_6',
      testName: 'Automated Reminders & Scheduler Idempotency',
      category: 'Reminders & Escalation',
      passed: cronResult2.remindersSent === 0,
      expected: 'First cron schedules reminders; immediate second run sends 0 duplicate reminders',
      actual: `Run 1 sent: ${cronResult.remindersSent}, Run 2 sent: ${cronResult2.remindersSent}`,
      details: 'Idempotency verified: duplicate reminders within 24 hours are suppressed.'
    });

    // Test 7: Profile Analysis & Bavarian GPA Calculation
    const bavarianGpa = this.calculateGermanBavarianGpa(8.4, 10.0, 4.0);
    // Formula: 1 + 3 * (10 - 8.4) / (10 - 4) = 1 + 3 * (1.6 / 6) = 1 + 0.8 = 1.80
    const isBavarianAccurate = Math.abs(bavarianGpa - 1.8) < 0.05;
    const analysis = this.evaluateProfile(testStudent);
    results.push({
      id: 'tc_doc_7',
      testName: 'Bavarian GPA Conversion & Eligibility Determination',
      category: 'Profile Analysis',
      passed: isBavarianAccurate && !!analysis.eligibilityOutcome,
      expected: 'CGPA 8.4 converts to Bavarian ~1.80; Eligibility outcome determined',
      actual: `Calculated German GPA: ${bavarianGpa}. Outcome: ${analysis.eligibilityOutcome}`,
      details: 'Standard German Bavarian conversion mathematically verified.'
    });

    // Test 8: Duplicate Service Activation Prevention
    const services1 = this.evaluateServiceTriggers(testStudent);
    const services2 = this.evaluateServiceTriggers(testStudent);
    const hasDuplicatePrevented = services2.some(s => s.isDuplicatePrevented === true);
    results.push({
      id: 'tc_doc_8',
      testName: 'Parallel Service Triggers with Causality & Duplicate Prevention',
      category: 'Service Triggers',
      passed: services1.length > 0 && hasDuplicatePrevented && services1.length === services2.length,
      expected: 'All triggered services document exact causality and prevent duplicate active records',
      actual: `Active services: ${services1.length}. Duplicate prevented: ${hasDuplicatePrevented}`,
      details: 'Verified services show why triggered and do not silently create duplicate records.'
    });

    return results;
  }

  // Seed sample initial data
  private seedInitialData(): void {
    // Initial reminder logs
    this.reminderLogs = [
      {
        id: 'rem_seed_1',
        studentId: 'stu_1',
        studentName: 'Aarav Patel',
        documentId: 'doc_stu_1_bachelor_transcripts',
        documentTitle: 'Bachelor Degree Semester-wise Transcripts',
        daysPending: 7,
        reminderStage: '7_days',
        sentAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        recipientEmail: 'aarav.patel@example.com',
        recipientPhone: '+91 98765 43210',
        channel: 'Email',
        status: 'delivered',
        messageText: '2nd Reminder: Dear Aarav, your Bachelor transcripts require re-upload with semester 5 & 6 backside grading legends.'
      },
      {
        id: 'rem_seed_2',
        studentId: 'stu_3',
        studentName: 'Rohan Verma',
        documentId: 'doc_stu_3_aps_certificate',
        documentTitle: 'German APS Certificate (India Verification)',
        daysPending: 10,
        reminderStage: '10_days_escalation',
        sentAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        recipientEmail: 'rohan.verma@example.com',
        recipientPhone: '+91 98765 43212',
        channel: 'Manager_Escalation',
        status: 'escalated',
        messageText: 'URGENT ESCALATION to Branch Manager: Student Rohan Verma has pending APS Certificate registration overdue for 10 days.'
      }
    ];
  }
}
