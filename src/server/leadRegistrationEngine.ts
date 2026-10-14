/**
 * Student Lifecycle CRM - Lead Management and Registration Engine
 * Handles Lead Creation, Deduplication, Multi-rule Assignment, Contact Logs,
 * Escalation, Structured Counselling, Secure Payment Verification, and Idempotent Conversion.
 */

import crypto from 'crypto';
import zlib from 'zlib';
import { 
  LeadRecord, 
  LeadSource, 
  LeadPriority,
  DatabaseLeadSourceRecord,
  CallAttemptRecord, 
  CallDisposition,
  DuplicateMatchInfo,
  CounsellingSessionData,
  RegistrationRecord,
  LeadAssignmentConfiguration,
  CounselorAssignmentProfile,
  CounselorAvailabilityStatus,
  CounselorDailyScheduleEntry,
  LeadWorkflowTestResult,
  LeadImportParsedRow,
  LeadImportRowPreview,
  LeadImportPreviewResponse,
  LeadImportCommitResponse
} from '../types/leadRegistration';
import { StudentMasterProfile } from '../types/crm';
import { AuthenticatedUserSession } from '../types/security';
import { SEED_SECURITY_USERS } from './securityEngine';
import {
  parseAndValidateCgpaOrPercentage,
  validateEmailFormat,
  validateMobilePhoneFormat,
  normalizeMobileForComparison,
  resolveAndValidateLeadSource,
  normalizeOptionalDegree,
  normalizeOptionalIntakeSeason,
  normalizeOptionalBooleanLoan,
  parseCsvToRowObjects,
  extractLeadFieldsFromRawRow
} from '../utils/leadValidationAndImport';

function buildSevenDaySchedule(defaultStatus: CounselorAvailabilityStatus = 'available', note?: string): CounselorDailyScheduleEntry[] {
  const days: CounselorDailyScheduleEntry[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 86400 * 1000);
    const dateIso = d.toISOString().split('T')[0];
    const dayLabel = i === 0
      ? `Today (${d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })})`
      : d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
    days.push({
      dateIso,
      dayLabel,
      status: defaultStatus,
      note: note || (defaultStatus === 'available' ? 'Available for Round-Robin Leads' : `Marked ${defaultStatus.replace('_', ' ')}`)
    });
  }
  return days;
}

export class LeadRegistrationEngine {
  private leads: LeadRecord[] = [];
  private leadSources: DatabaseLeadSourceRecord[] = [];
  private assignmentConfig: LeadAssignmentConfiguration;
  private roundRobinCursor = 0;
  private leadSequence = 100;
  private studentSequence = 45;
  private invoiceSequence = 200;

  constructor() {
    // Seed GMI-lead_sources database table (All Digital platform leads default to 'hot')
    this.seedInitialLeadSources();

    // Default Assignment Configuration (Round-Robin based on Bandwidth & Availability)
    this.assignmentConfig = {
      ruleType: 'round_robin',
      roundRobinCursor: 0,
      fallbackCounselorId: 'usr_c1',
      counselors: [
        {
          id: 'usr_c1',
          name: 'Sandeep Koteshwara',
          email: 'sandeepkoteshwara29@gmail.com',
          branch: 'Hyderabad - Somajiguda',
          activeLeadCount: 0,
          maxLeadCapacity: 35,
          specializedCountries: ['United Kingdom', 'Ireland', 'Germany', 'USA', 'Canada'],
          isAvailable: true,
          availabilityStatus: 'available',
          statusDurationMode: 'today',
          statusNote: 'Available for Lead Assignment',
          weeklySchedule: buildSevenDaySchedule('available')
        }
      ]
    };

    // No dummy leads created per requirement
    this.leads = [];
  }

  private seedInitialLeadSources() {
    const nowIso = new Date().toISOString();
    // Backend Lead Temperature Rules in GMI-lead_sources:
    // Digital / Walk-in / Direct Inbound = HOT
    // College Seminar / Education Fairs / Webinars / Referral = WARM
    // Outbound Telecalling / Bulk Database = COLD
    this.leadSources = [
      { id: 1, code: 'website', label: 'Website Inquiry Form', channel: 'Digital', category: 'Digital Platform', defaultTemperature: 'hot', isActive: true, updatedBy: 'System Seed (GMI-lead_sources)', updatedAt: nowIso },
      { id: 2, code: 'google_ads', label: 'Google Ads (Search & Display)', channel: 'Digital', category: 'Digital Platform', defaultTemperature: 'hot', isActive: true, updatedBy: 'System Seed (GMI-lead_sources)', updatedAt: nowIso },
      { id: 3, code: 'instagram', label: 'Instagram Ads & DMs', channel: 'Digital', category: 'Digital Platform', defaultTemperature: 'hot', isActive: true, updatedBy: 'System Seed (GMI-lead_sources)', updatedAt: nowIso },
      { id: 4, code: 'facebook', label: 'Facebook Lead Gen Form', channel: 'Digital', category: 'Digital Platform', defaultTemperature: 'hot', isActive: true, updatedBy: 'System Seed (GMI-lead_sources)', updatedAt: nowIso },
      { id: 5, code: 'whatsapp', label: 'WhatsApp Official Chatbot', channel: 'Digital', category: 'Digital Messaging', defaultTemperature: 'hot', isActive: true, updatedBy: 'System Seed (GMI-lead_sources)', updatedAt: nowIso },
      { id: 6, code: 'walk_in', label: 'Branch Walk-in', channel: 'Direct', category: 'In-Person Walk-in', defaultTemperature: 'hot', isActive: true, updatedBy: 'System Seed (GMI-lead_sources)', updatedAt: nowIso },
      { id: 7, code: 'phone_call', label: 'Direct Phone / Inbound Toll-free', channel: 'Direct', category: 'Direct Telephony', defaultTemperature: 'hot', isActive: true, updatedBy: 'System Seed (GMI-lead_sources)', updatedAt: nowIso },
      { id: 8, code: 'college_visits', label: 'Campus / College Visit Seminar', channel: 'Offline', category: 'College Seminar', defaultTemperature: 'warm', isActive: true, updatedBy: 'System Seed (GMI-lead_sources)', updatedAt: nowIso },
      { id: 9, code: 'education_fairs', label: 'Study Abroad Education Fair', channel: 'Offline', category: 'Offline Exhibition', defaultTemperature: 'warm', isActive: true, updatedBy: 'System Seed (GMI-lead_sources)', updatedAt: nowIso },
      { id: 10, code: 'events', label: 'Webinars & Spot Assessment Events', channel: 'Offline', category: 'Offline / Virtual Event', defaultTemperature: 'warm', isActive: true, updatedBy: 'System Seed (GMI-lead_sources)', updatedAt: nowIso },
      { id: 11, code: 'referral', label: 'Alumni / Student Referral', channel: 'Direct', category: 'Direct Referral', defaultTemperature: 'warm', isActive: true, updatedBy: 'System Seed (GMI-lead_sources)', updatedAt: nowIso },
      { id: 12, code: 'cold_calling', label: 'Outbound Telecalling / Bulk Database', channel: 'Offline', category: 'Cold Outreach', defaultTemperature: 'cold', isActive: true, updatedBy: 'System Seed (GMI-lead_sources)', updatedAt: nowIso }
    ];
  }

  // --- DATABASE LEAD SOURCES & DEFAULT TEMPERATURE (GMI-lead_sources) ---
  public getLeadSources(includeInactive = true): DatabaseLeadSourceRecord[] {
    return includeInactive ? [...this.leadSources] : this.leadSources.filter(s => s.isActive);
  }

  public upsertLeadSource(payload: {
    id?: number;
    code?: string;
    label: string;
    channel: 'Digital' | 'Offline' | 'Direct';
    category?: string;
    defaultTemperature?: LeadPriority;
    isActive?: boolean;
    actorName?: string;
  }): DatabaseLeadSourceRecord {
    const nowIso = new Date().toISOString();
    // By default all Digital platform leads are HOT unless explicitly overridden
    const resolvedTemp: LeadPriority =
      payload.defaultTemperature || (payload.channel === 'Digital' ? 'hot' : 'warm');

    if (payload.id) {
      const idx = this.leadSources.findIndex(s => s.id === payload.id);
      if (idx !== -1) {
        this.leadSources[idx] = {
          ...this.leadSources[idx],
          label: payload.label.trim(),
          channel: payload.channel,
          category: payload.category || (payload.channel === 'Digital' ? 'Digital Platform' : payload.channel === 'Direct' ? 'Direct Channel' : 'Offline Channel'),
          defaultTemperature: resolvedTemp,
          isActive: payload.isActive ?? this.leadSources[idx].isActive,
          updatedBy: payload.actorName || 'Database Admin',
          updatedAt: nowIso
        };
        return this.leadSources[idx];
      }
    }

    const cleanCode = (payload.code || payload.label)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const existingByCode = this.leadSources.findIndex(s => s.code === cleanCode);
    if (existingByCode !== -1) {
      this.leadSources[existingByCode] = {
        ...this.leadSources[existingByCode],
        label: payload.label.trim(),
        channel: payload.channel,
        category: payload.category || this.leadSources[existingByCode].category,
        defaultTemperature: resolvedTemp,
        isActive: payload.isActive ?? true,
        updatedBy: payload.actorName || 'Database Admin',
        updatedAt: nowIso
      };
      return this.leadSources[existingByCode];
    }

    const nextId = this.leadSources.reduce((max, s) => Math.max(max, s.id), 0) + 1;
    const created: DatabaseLeadSourceRecord = {
      id: nextId,
      code: cleanCode || `source_${nextId}`,
      label: payload.label.trim(),
      channel: payload.channel,
      category: payload.category || (payload.channel === 'Digital' ? 'Digital Platform' : payload.channel === 'Direct' ? 'Direct Channel' : 'Offline Channel'),
      defaultTemperature: resolvedTemp,
      isActive: payload.isActive ?? true,
      updatedBy: payload.actorName || 'Database Admin',
      updatedAt: nowIso
    };
    this.leadSources.push(created);
    return created;
  }

  public deleteLeadSource(id: number): boolean {
    const before = this.leadSources.length;
    this.leadSources = this.leadSources.filter(s => s.id !== id);
    return this.leadSources.length < before;
  }

  // Helper: Normalize phone to last 10 digits (or international digits)
  public normalizePhone(phone: string): string {
    return normalizeMobileForComparison(phone);
  }

  // Helper: Normalize email
  public normalizeEmail(email: string): string {
    return String(email || '').trim().toLowerCase();
  }

  // 1. DEDUPLICATION ENGINE
  public checkDuplicates(
    phone: string, 
    email: string, 
    passportNumber?: string,
    existingStudentsList: StudentMasterProfile[] = [],
    excludeOptions?: { excludeLeadId?: string; excludeStudentId?: string }
  ): DuplicateMatchInfo[] {
    const normPhone = this.normalizePhone(phone);
    const normEmail = this.normalizeEmail(email);
    const normPassport = passportNumber ? passportNumber.trim().toUpperCase() : null;
    const matches: DuplicateMatchInfo[] = [];

    // Check against existing leads
    for (const lead of this.leads) {
      if (lead.status === 'merged') continue;
      if (excludeOptions?.excludeLeadId && lead.id === excludeOptions.excludeLeadId) continue;
      if (
        excludeOptions?.excludeStudentId &&
        lead.registrationRecord?.studentId === excludeOptions.excludeStudentId
      ) {
        continue;
      }

      const matchedFields: ('phone' | 'email' | 'passport')[] = [];
      let score = 0;

      if (normEmail && this.normalizeEmail(lead.contact.email) === normEmail) {
        matchedFields.push('email');
        score += 50;
      }
      if (normPhone && this.normalizePhone(lead.contact.phone) === normPhone) {
        matchedFields.push('phone');
        score += 45;
      }

      if (matchedFields.length > 0) {
        matches.push({
          existingLeadId: lead.id,
          existingName: `${lead.contact.firstName} ${lead.contact.lastName}`.trim(),
          assignedCounselorName: lead.assignedCounselorName,
          matchedFields,
          matchScore: Math.min(100, score),
          createdAt: lead.enquiryDateTime
        });
      }
    }

    // Check against converted students
    for (const student of existingStudentsList) {
      if (excludeOptions?.excludeStudentId && student.id === excludeOptions.excludeStudentId) continue;
      const matchedFields: ('phone' | 'email' | 'passport')[] = [];
      let score = 0;

      if (normEmail && this.normalizeEmail(student.personal.email) === normEmail) {
        matchedFields.push('email');
        score += 50;
      }
      if (normPhone && this.normalizePhone(student.personal.phone) === normPhone) {
        matchedFields.push('phone');
        score += 45;
      }
      if (normPassport && student.personal.passportNumber && student.personal.passportNumber.trim().toUpperCase() === normPassport) {
        matchedFields.push('passport');
        score += 60;
      }

      if (matchedFields.length > 0) {
        matches.push({
          existingStudentId: student.id,
          existingRefNo: student.studentRefNo,
          existingName: `${student.personal.firstName} ${student.personal.lastName}`.trim(),
          assignedCounselorName: student.assignedCounselorName,
          matchedFields,
          matchScore: Math.min(100, score),
          createdAt: student.createdAt
        });
      }
    }

    return matches;
  }

  // 2. ASSIGNMENT RULES ENGINE (Round-Robin based on Counsellor Bandwidth & Daily/Weekly Availability)
  private isCounselorAvailableToday(c: CounselorAssignmentProfile): boolean {
    const todayIso = new Date().toISOString().split('T')[0];
    const todaySchedule = c.weeklySchedule?.find(d => d.dateIso === todayIso) || c.weeklySchedule?.[0];
    if (todaySchedule && todaySchedule.status !== 'available') {
      return false;
    }
    if (c.availabilityStatus && c.availabilityStatus !== 'available') {
      return false;
    }
    return c.isAvailable && c.activeLeadCount < c.maxLeadCapacity;
  }

  public assignCounselor(preferredCountries: string[], branch?: string, forceRuleType?: 'round_robin' | 'destination_specialist' | 'workload_balanced'): { id: string; name: string; branch: string } {
    const activeRule = forceRuleType || this.assignmentConfig.ruleType || 'round_robin';
    const availablePool = this.assignmentConfig.counselors.filter(c => this.isCounselorAvailableToday(c));
    const pool = availablePool.length > 0 ? availablePool : this.assignmentConfig.counselors;

    if (activeRule === 'destination_specialist') {
      const specialist = pool.find(c => 
        preferredCountries.some(country => c.specializedCountries.includes(country))
      );
      if (specialist) {
        specialist.activeLeadCount += 1;
        specialist.lastAssignedAt = new Date().toISOString();
        return { id: specialist.id, name: specialist.name, branch: specialist.branch };
      }
    }

    if (activeRule === 'workload_balanced') {
      const leastLoaded = [...pool].sort((a, b) => (a.activeLeadCount / a.maxLeadCapacity) - (b.activeLeadCount / b.maxLeadCapacity))[0];
      if (leastLoaded) {
        leastLoaded.activeLeadCount += 1;
        leastLoaded.lastAssignedAt = new Date().toISOString();
        return { id: leastLoaded.id, name: leastLoaded.name, branch: leastLoaded.branch };
      }
    }

    // Default: Sequential Round-Robin across Available Counsellors with Bandwidth
    const chosen = pool[this.roundRobinCursor % pool.length] || this.assignmentConfig.counselors[0];
    this.roundRobinCursor = (this.roundRobinCursor + 1) % Math.max(1, pool.length);
    this.assignmentConfig.roundRobinCursor = this.roundRobinCursor;
    chosen.activeLeadCount += 1;
    chosen.lastAssignedAt = new Date().toISOString();
    return { id: chosen.id, name: chosen.name, branch: chosen.branch };
  }

  // 3. PRIORITY & LEAD SCORING ALGORITHM (Backend-driven from GMI-lead_sources: Digital/Walk-in = Hot, College Seminar = Warm, etc.)
  public calculateLeadScoreAndPriority(
    budgetInLakhs: number, 
    intakeYear: number, 
    hasPassport: boolean,
    source: LeadSource,
    explicitPriority?: LeadPriority
  ): { leadScore: number; priority: 'hot' | 'warm' | 'cold' } {
    const dbSource = this.leadSources.find(s => s.code === source);
    const isHotSource = dbSource
      ? dbSource.defaultTemperature === 'hot' || dbSource.channel === 'Digital'
      : ['website', 'google_ads', 'instagram', 'facebook', 'whatsapp', 'walk_in', 'phone_call'].includes(source);
    const isWarmSource = dbSource
      ? dbSource.defaultTemperature === 'warm'
      : ['college_visits', 'education_fairs', 'events', 'referral'].includes(source);

    let score = isHotSource ? 55 : isWarmSource ? 42 : 30; // Base score

    // Budget weight
    if (budgetInLakhs >= 30) score += 25;
    else if (budgetInLakhs >= 20) score += 15;
    else score += 10;

    // Intake urgency
    const currentYear = 2026;
    if (intakeYear <= currentYear) score += 20;
    else if (intakeYear === currentYear + 1) score += 15;
    else score += 5;

    // Source intent
    if (isHotSource) score += 15;
    else if (isWarmSource) score += 10;
    else score += 5;

    // Document readiness
    if (hasPassport) score += 10;

    score = Math.min(100, Math.max(10, score));

    // Determine priority purely via backend rule & GMI-lead_sources table:
    // Digital / Walk-in / Direct Phone = 'hot'
    // College Visit Seminar / Education Fair / Events / Referral = 'warm'
    // Cold Calling / Bulk Outreach = 'cold'
    let priority: LeadPriority;
    if (explicitPriority && ['hot', 'warm', 'cold'].includes(explicitPriority)) {
      priority = explicitPriority;
    } else if (dbSource && dbSource.defaultTemperature) {
      priority = dbSource.defaultTemperature;
    } else if (isHotSource) {
      priority = 'hot';
    } else if (isWarmSource) {
      priority = 'warm';
    } else {
      priority = 'cold';
    }

    if (priority === 'hot' && score < 78) score = 82;
    else if (priority === 'warm' && (score < 55 || score >= 78)) score = 68;
    else if (priority === 'cold' && score >= 50) score = 42;

    return { leadScore: score, priority };
  }

  // 4. CREATE NEW LEAD
  public createLead(payload: {
    source: LeadSource;
    priority?: LeadPriority;
    firstName: string;
    lastName?: string;
    email: string;
    phone: string;
    whatsapp?: string;
    city?: string;
    state?: string;
    country?: string;
    preferredCountries?: string[];
    targetDegree?: string;
    targetCourse?: string;
    targetIntakeSeason?: 'Fall' | 'Spring' | 'Summer' | '';
    targetIntakeYear?: number;
    budgetInLakhsINR?: number;
    requiresLoan?: boolean;
    cgpaOrPercentage?: string | number;
    utmCampaignData?: any;
    existingStudentsList?: StudentMasterProfile[];
  }): { lead: LeadRecord; duplicateDetected: boolean } {
    this.leadSequence += 1;
    const leadId = `GMI-LD-2026-${String(this.leadSequence).padStart(4, '0')}`;
    const prefCountries = Array.isArray(payload.preferredCountries)
      ? payload.preferredCountries.map(c => String(c).trim()).filter(Boolean)
      : [];

    const cgpaParsed = parseAndValidateCgpaOrPercentage(payload.cgpaOrPercentage);

    // Check duplicates
    const duplicates = this.checkDuplicates(
      payload.phone, 
      payload.email, 
      undefined, 
      payload.existingStudentsList || []
    );

    // Auto-assignment via Round-Robin based on Bandwidth & Availability
    const assigned = this.assignCounselor(prefCountries, payload.city);

    // Scoring & Priority (reads defaultTemperature from GMI-lead_sources; Digital leads are Hot by default)
    const { leadScore, priority } = this.calculateLeadScoreAndPriority(
      payload.budgetInLakhsINR !== undefined && payload.budgetInLakhsINR !== null ? Number(payload.budgetInLakhsINR) : 0,
      payload.targetIntakeYear || 2026,
      false,
      payload.source,
      payload.priority
    );

    const now = new Date();
    const newLead: LeadRecord = {
      id: leadId,
      enquiryDateTime: now.toISOString(),
      source: payload.source,
      campaignData: payload.utmCampaignData || {},
      contact: {
        firstName: String(payload.firstName || '').trim(),
        lastName: String(payload.lastName || '').trim(),
        email: String(payload.email || '').trim(),
        phone: String(payload.phone || '').trim(),
        whatsapp: String(payload.whatsapp || payload.phone || '').trim(),
        city: payload.city !== undefined ? String(payload.city).trim() : '',
        state: payload.state !== undefined ? String(payload.state).trim() : '',
        country: payload.country || 'India'
      },
      studyPreferences: {
        preferredCountries: prefCountries,
        targetDegree: payload.targetDegree !== undefined ? String(payload.targetDegree).trim() : '',
        targetCourse: payload.targetCourse !== undefined ? String(payload.targetCourse).trim() : '',
        targetIntakeSeason: payload.targetIntakeSeason !== undefined ? payload.targetIntakeSeason : '',
        targetIntakeYear: payload.targetIntakeYear ? Number(payload.targetIntakeYear) : 2026,
        budgetInLakhsINR: payload.budgetInLakhsINR !== undefined && payload.budgetInLakhsINR !== null && String(payload.budgetInLakhsINR) !== '' ? Number(payload.budgetInLakhsINR) : 0,
        requiresLoan: Boolean(payload.requiresLoan),
        cgpaOrPercentage: cgpaParsed.isEmpty ? '' : cgpaParsed.formatted,
        cgpaValue: cgpaParsed.numericValue,
        scoreType: cgpaParsed.scoreType
      },
      assignedCounselorId: assigned.id,
      assignedCounselorName: assigned.name,
      assignedBranch: assigned.branch,
      priority,
      leadScore,
      status: 'new',
      duplicateInfo: {
        isDuplicate: duplicates.length > 0,
        duplicateMatches: duplicates
      },
      callHistory: [],
      callAttemptsCount: 0,
      isEscalated: false,
      tasks: [
        {
          id: `tsk_init_${Date.now()}`,
          title: 'First Contact Discovery Call (SLA: 4 Hours)',
          assignedRole: 'counselor',
          slaHoursRemaining: 4,
          dueDate: new Date(now.getTime() + 4 * 3600 * 1000).toISOString(),
          completed: false
        },
        {
          id: `tsk_verif_${Date.now()}`,
          title: 'Academic Profile & Target Country Assessment (SLA: 24 Hours)',
          assignedRole: 'counselor',
          slaHoursRemaining: 24,
          dueDate: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
          completed: false
        },
        {
          id: `tsk_sch_${Date.now()}`,
          title: 'Schedule Structured Counselling Session (SLA: 48 Hours)',
          assignedRole: 'counselor',
          slaHoursRemaining: 48,
          dueDate: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
          completed: false
        }
      ]
    };

    this.leads.unshift(newLead);
    return { lead: newLead, duplicateDetected: duplicates.length > 0 };
  }

  // 4B. UPDATE EXISTING LEAD (Master Update / Lead Edit with Backend Validation & Duplicate Protection)
  public updateLead(
    leadId: string,
    payload: {
      source?: string;
      priority?: LeadPriority;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      whatsapp?: string;
      city?: string;
      state?: string;
      preferredCountries?: string[] | string;
      targetDegree?: string;
      targetCourse?: string;
      targetIntakeSeason?: 'Fall' | 'Spring' | 'Summer' | '';
      targetIntakeYear?: number | string;
      budgetInLakhsINR?: number | string;
      requiresLoan?: boolean;
      cgpaOrPercentage?: string | number;
    },
    existingStudentsList: StudentMasterProfile[] = [],
    actorName = 'Authorized Staff'
  ): LeadRecord {
    const lead = this.leads.find(l => l.id === leadId);
    if (!lead) {
      throw new Error(`Lead record ${leadId} not found.`);
    }

    const rawSource = payload.source !== undefined ? payload.source : lead.source;
    const rawFirstName = payload.firstName !== undefined ? String(payload.firstName).trim() : lead.contact.firstName;
    const rawLastName = payload.lastName !== undefined ? String(payload.lastName).trim() : lead.contact.lastName;
    const rawEmail = payload.email !== undefined ? String(payload.email).trim() : lead.contact.email;
    const rawPhone = payload.phone !== undefined ? String(payload.phone).trim() : lead.contact.phone;
    const rawCgpa = payload.cgpaOrPercentage !== undefined ? payload.cgpaOrPercentage : lead.studyPreferences.cgpaOrPercentage;

    // 1. Validate Mandatory Fields
    const sourceValidation = resolveAndValidateLeadSource(rawSource, this.leadSources);
    if (!sourceValidation.valid) {
      throw new Error(sourceValidation.error || 'Lead Source is required.');
    }
    if (!rawFirstName) {
      throw new Error('First Name is required.');
    }
    const emailValidation = validateEmailFormat(rawEmail);
    if (!emailValidation.valid) {
      throw new Error(emailValidation.error || 'Valid Email Address is required.');
    }
    const phoneValidation = validateMobilePhoneFormat(rawPhone);
    if (!phoneValidation.valid) {
      throw new Error(phoneValidation.error || 'Valid Mobile Phone is required.');
    }
    const cgpaValidation = parseAndValidateCgpaOrPercentage(rawCgpa);
    if (!cgpaValidation.valid) {
      throw new Error(cgpaValidation.error || 'Invalid CGPA / Percentage value.');
    }

    // 2. Duplicate check excluding self & linked student
    const duplicates = this.checkDuplicates(
      phoneValidation.trimmed,
      emailValidation.normalized,
      undefined,
      existingStudentsList,
      {
        excludeLeadId: lead.id,
        excludeStudentId: lead.registrationRecord?.studentId
      }
    );

    if (duplicates.length > 0) {
      const m = duplicates[0];
      const fieldStr = m.matchedFields.join(' & ');
      const refLabel = m.existingLeadId || m.existingRefNo || m.existingStudentId || 'existing record';
      throw new Error(
        `Duplicate ${fieldStr} detected: already associated with ${m.existingName} (${refLabel}).`
      );
    }

    // 3. Apply updates
    lead.source = sourceValidation.code;
    if (payload.priority && ['hot', 'warm', 'cold'].includes(payload.priority)) {
      lead.priority = payload.priority;
    }

    lead.contact = {
      ...lead.contact,
      firstName: rawFirstName,
      lastName: rawLastName,
      email: emailValidation.normalized,
      phone: phoneValidation.trimmed,
      whatsapp: payload.whatsapp !== undefined ? String(payload.whatsapp).trim() : lead.contact.whatsapp || phoneValidation.trimmed,
      city: payload.city !== undefined ? String(payload.city).trim() : lead.contact.city,
      state: payload.state !== undefined ? String(payload.state).trim() : lead.contact.state
    };

    const updatedCountries =
      payload.preferredCountries !== undefined
        ? Array.isArray(payload.preferredCountries)
          ? payload.preferredCountries.map(c => String(c).trim()).filter(Boolean)
          : String(payload.preferredCountries)
              .split(',')
              .map(c => c.trim())
              .filter(Boolean)
        : lead.studyPreferences.preferredCountries;

    lead.studyPreferences = {
      ...lead.studyPreferences,
      preferredCountries: updatedCountries,
      targetDegree: payload.targetDegree !== undefined ? String(payload.targetDegree).trim() : lead.studyPreferences.targetDegree,
      targetCourse: payload.targetCourse !== undefined ? String(payload.targetCourse).trim() : lead.studyPreferences.targetCourse,
      targetIntakeSeason:
        payload.targetIntakeSeason !== undefined
          ? payload.targetIntakeSeason
          : lead.studyPreferences.targetIntakeSeason,
      targetIntakeYear:
        payload.targetIntakeYear !== undefined && String(payload.targetIntakeYear).trim() !== ''
          ? Number(payload.targetIntakeYear)
          : lead.studyPreferences.targetIntakeYear,
      budgetInLakhsINR:
        payload.budgetInLakhsINR !== undefined && String(payload.budgetInLakhsINR).trim() !== ''
          ? Number(payload.budgetInLakhsINR)
          : lead.studyPreferences.budgetInLakhsINR,
      requiresLoan:
        payload.requiresLoan !== undefined ? Boolean(payload.requiresLoan) : lead.studyPreferences.requiresLoan,
      cgpaOrPercentage: cgpaValidation.isEmpty ? '' : cgpaValidation.formatted,
      cgpaValue: cgpaValidation.numericValue,
      scoreType: cgpaValidation.scoreType
    };

    lead.updatedAt = new Date().toISOString();
    lead.updatedBy = actorName;

    lead.callHistory.push({
      id: `call_edit_${Date.now()}`,
      attemptNumber: lead.callHistory.length + 1,
      timestamp: lead.updatedAt,
      counselorId: lead.assignedCounselorId,
      counselorName: actorName,
      status: 'reachable',
      disposition: 'call_answered',
      durationSeconds: 0,
      callNotes: `[LEAD DETAILS UPDATED] Updated lead master details (${lead.contact.firstName} ${lead.contact.lastName}, ${lead.contact.email}, ${lead.contact.phone}${lead.studyPreferences.cgpaOrPercentage ? `, Score: ${lead.studyPreferences.cgpaOrPercentage}` : ''}) by ${actorName}.`
    });

    // 4. Sync with converted Student Master record if linked
    if (lead.registrationRecord?.studentId) {
      const stu = existingStudentsList.find(s => s.id === lead.registrationRecord?.studentId);
      if (stu) {
        stu.personal.firstName = lead.contact.firstName;
        stu.personal.lastName = lead.contact.lastName;
        stu.personal.email = lead.contact.email;
        stu.personal.phone = lead.contact.phone;
        stu.personal.whatsapp = lead.contact.whatsapp;
        if (lead.contact.city) stu.personal.city = lead.contact.city;
        if (lead.contact.state) stu.personal.state = lead.contact.state;
        stu.preferences.targetCountries = lead.studyPreferences.preferredCountries;
        stu.preferences.targetDegree = lead.studyPreferences.targetDegree as any;
        stu.preferences.targetIntakeSeason = lead.studyPreferences.targetIntakeSeason;
        stu.preferences.targetIntakeYear = lead.studyPreferences.targetIntakeYear;
        stu.preferences.budgetCapInLakhsINR = lead.studyPreferences.budgetInLakhsINR;
        stu.preferences.requiresLoan = lead.studyPreferences.requiresLoan;
        if (!cgpaValidation.isEmpty && cgpaValidation.numericValue !== undefined) {
          stu.academics.scoreValue = cgpaValidation.numericValue;
          stu.academics.scoreType = cgpaValidation.scoreType || 'gpa_10';
          stu.academics.cgpaOrPercentage = cgpaValidation.formatted;
        }
        stu.updatedAt = lead.updatedAt;
      }
    }

    return lead;
  }

  // 4C. PARSE UPLOADED EXCEL (.XLSX) OR CSV FILE INTO RAW ROW OBJECTS
  public parseUploadedLeadFile(params: {
    fileName?: string;
    fileContentBase64?: string;
    csvText?: string;
    rows?: Record<string, string>[];
  }): Record<string, string>[] {
    if (Array.isArray(params.rows) && params.rows.length > 0) {
      return params.rows;
    }

    if (params.csvText && typeof params.csvText === 'string') {
      return parseCsvToRowObjects(params.csvText);
    }

    if (params.fileContentBase64) {
      const cleanBase64 = params.fileContentBase64.replace(/^data:[^;]+;base64,/, '');
      const buf = Buffer.from(cleanBase64, 'base64');
      const isZipXlsx =
        buf.length > 4 &&
        buf[0] === 0x50 &&
        buf[1] === 0x4b &&
        buf[2] === 0x03 &&
        buf[3] === 0x04;

      if (isZipXlsx || (params.fileName || '').toLowerCase().endsWith('.xlsx')) {
        return this.parseXlsxBufferToRows(buf);
      }

      const textContent = buf.toString('utf8');
      return parseCsvToRowObjects(textContent);
    }

    return [];
  }

  private parseXlsxBufferToRows(buf: Buffer): Record<string, string>[] {
    const zipEntries = new Map<string, string>();

    // Locate End of Central Directory (EOCD: 0x06054b50)
    let eocdOffset = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset !== -1) {
      const totalEntries = buf.readUInt16LE(eocdOffset + 10);
      let cdOffset = buf.readUInt32LE(eocdOffset + 16);

      for (let e = 0; e < totalEntries && cdOffset + 46 <= buf.length; e++) {
        if (buf.readUInt32LE(cdOffset) !== 0x02014b50) break;
        const compressionMethod = buf.readUInt16LE(cdOffset + 10);
        const compressedSize = buf.readUInt32LE(cdOffset + 20);
        const fileNameLen = buf.readUInt16LE(cdOffset + 28);
        const extraLen = buf.readUInt16LE(cdOffset + 30);
        const commentLen = buf.readUInt16LE(cdOffset + 32);
        const localHeaderOffset = buf.readUInt32LE(cdOffset + 42);
        const fileName = buf.subarray(cdOffset + 46, cdOffset + 46 + fileNameLen).toString('utf8');

        if (localHeaderOffset + 30 <= buf.length && buf.readUInt32LE(localHeaderOffset) === 0x04034b50) {
          const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
          const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
          const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
          const compressedSlice = buf.subarray(dataStart, dataStart + compressedSize);

          try {
            if (compressionMethod === 0) {
              zipEntries.set(fileName, compressedSlice.toString('utf8'));
            } else if (compressionMethod === 8) {
              const inflated = zlib.inflateRawSync(compressedSlice);
              zipEntries.set(fileName, inflated.toString('utf8'));
            }
          } catch {
            // Ignore unreadable non-sheet entry
          }
        }

        cdOffset += 46 + fileNameLen + extraLen + commentLen;
      }
    }

    const decodeXmlEntities = (str: string) =>
      str
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');

    // Parse sharedStrings.xml if present
    const sharedStrings: string[] = [];
    const sharedXml = zipEntries.get('xl/sharedStrings.xml') || '';
    if (sharedXml) {
      const siMatches = sharedXml.match(/<si[\s>][\s\S]*?<\/si>/g) || [];
      for (const si of siMatches) {
        const tMatches = si.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g) || [];
        const text = tMatches
          .map(t => decodeXmlEntities(t.replace(/<t(?:\s[^>]*)?>|<\/t>/g, '')))
          .join('');
        sharedStrings.push(text);
      }
    }

    // Find first worksheet XML
    let sheetXml = zipEntries.get('xl/worksheets/sheet1.xml') || '';
    if (!sheetXml) {
      for (const [k, v] of zipEntries.entries()) {
        if (k.startsWith('xl/worksheets/sheet') && k.endsWith('.xml')) {
          sheetXml = v;
          break;
        }
      }
    }
    if (!sheetXml) return [];

    const colLettersToIndex = (letters: string): number => {
      let idx = 0;
      for (let i = 0; i < letters.length; i++) {
        idx = idx * 26 + (letters.toUpperCase().charCodeAt(i) - 64);
      }
      return idx - 1;
    };

    const rowMatches = sheetXml.match(/<row[\s>][\s\S]*?<\/row>/g) || [];
    const matrix: string[][] = [];

    for (const rowXml of rowMatches) {
      const cellMatches = rowXml.match(/<c[\s>][\s\S]*?(?:<\/c>|\/>)/g) || [];
      const rowCells: string[] = [];
      let fallbackCol = 0;

      for (const cellXml of cellMatches) {
        const refMatch = cellXml.match(/\br="([A-Za-z]+)\d+"/);
        const colIdx = refMatch ? colLettersToIndex(refMatch[1]) : fallbackCol;
        fallbackCol = colIdx + 1;

        const typeMatch = cellXml.match(/\bt="([^"]+)"/);
        const cellType = typeMatch ? typeMatch[1] : '';

        let val = '';
        if (cellType === 'inlineStr') {
          const tMatch = cellXml.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/);
          val = tMatch ? decodeXmlEntities(tMatch[1]) : '';
        } else {
          const vMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
          const rawV = vMatch ? decodeXmlEntities(vMatch[1].trim()) : '';
          if (cellType === 's') {
            const sIdx = parseInt(rawV, 10);
            val = !isNaN(sIdx) && sharedStrings[sIdx] !== undefined ? sharedStrings[sIdx] : rawV;
          } else if (cellType === 'b') {
            val = rawV === '1' ? 'Yes' : 'No';
          } else {
            val = rawV;
          }
        }

        while (rowCells.length <= colIdx) {
          rowCells.push('');
        }
        rowCells[colIdx] = val.trim();
      }

      if (rowCells.some(c => c !== '')) {
        matrix.push(rowCells);
      }
    }

    if (matrix.length < 2) return [];
    const headers = matrix[0];
    const objects: Record<string, string>[] = [];
    for (let r = 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (row.every(c => !c || !c.trim())) continue;
      const obj: Record<string, string> = {};
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c] || `col_${c}`;
        obj[key] = row[c] !== undefined ? row[c] : '';
      }
      objects.push(obj);
    }

    return objects;
  }

  // 4D. VALIDATE & PREVIEW BULK LEAD IMPORT
  public previewLeadImport(
    rawRows: Record<string, string>[],
    existingStudentsList: StudentMasterProfile[] = []
  ): LeadImportPreviewResponse {
    const seenEmailsInFile = new Map<string, number>();
    const seenPhonesInFile = new Map<string, number>();
    const previewRows: LeadImportRowPreview[] = [];

    for (let idx = 0; idx < rawRows.length; idx++) {
      const rowNumber = idx + 1;
      const raw = rawRows[idx];
      const extracted = extractLeadFieldsFromRawRow(raw);

      const invalidReasons: string[] = [];
      const duplicateReasons: string[] = [];

      // 1. Validate 4 Mandatory Fields
      const sourceRes = resolveAndValidateLeadSource(extracted.source, this.leadSources);
      if (!sourceRes.valid) {
        invalidReasons.push(sourceRes.error || 'Lead Source is required.');
      }

      const firstName = extracted.firstName.trim();
      if (!firstName) {
        invalidReasons.push('First Name is required.');
      }

      const emailRes = validateEmailFormat(extracted.email);
      if (!emailRes.valid) {
        invalidReasons.push(emailRes.error || 'Email Address is required.');
      }

      const phoneRes = validateMobilePhoneFormat(extracted.phone);
      if (!phoneRes.valid) {
        invalidReasons.push(phoneRes.error || 'Mobile Phone is required.');
      }

      // 2. Validate Optional Fields if provided
      const degreeRes = normalizeOptionalDegree(extracted.targetDegree);
      if (!degreeRes.valid && degreeRes.error) {
        invalidReasons.push(degreeRes.error);
      }

      const intakeRes = normalizeOptionalIntakeSeason(extracted.intakeSeason);
      if (!intakeRes.valid && intakeRes.error) {
        invalidReasons.push(intakeRes.error);
      }

      let parsedIntakeYear: number | undefined = undefined;
      if (extracted.intakeYear) {
        const yr = Number(extracted.intakeYear);
        if (isNaN(yr) || yr < 2024 || yr > 2035) {
          invalidReasons.push(`Invalid Intake Year "${extracted.intakeYear}". Expected year between 2024 and 2035.`);
        } else {
          parsedIntakeYear = yr;
        }
      }

      let parsedBudget: number | undefined = undefined;
      if (extracted.budgetCap) {
        const cleanBudget = extracted.budgetCap.replace(/[₹,\sLlakhs]/gi, '');
        const bNum = Number(cleanBudget);
        if (isNaN(bNum) || bNum < 0) {
          invalidReasons.push(`Invalid Budget Cap "${extracted.budgetCap}". Must be a positive number.`);
        } else {
          parsedBudget = bNum;
        }
      }

      const loanRes = normalizeOptionalBooleanLoan(extracted.requiresLoan);
      if (!loanRes.valid && loanRes.error) {
        invalidReasons.push(loanRes.error);
      }

      const cgpaRes = parseAndValidateCgpaOrPercentage(extracted.cgpaOrPercentage);
      if (!cgpaRes.valid && cgpaRes.error) {
        invalidReasons.push(cgpaRes.error);
      }

      // 3. Duplicate Detection (against DB Leads, DB Students, and earlier rows in the same file)
      if (emailRes.valid || phoneRes.valid) {
        const dbDups = this.checkDuplicates(
          phoneRes.valid ? phoneRes.trimmed : '',
          emailRes.valid ? emailRes.normalized : '',
          undefined,
          existingStudentsList
        );
        if (dbDups.length > 0) {
          const match = dbDups[0];
          const ref = match.existingLeadId || match.existingRefNo || match.existingStudentId || 'Database';
          duplicateReasons.push(
            `Duplicate ${match.matchedFields.join(' & ')} already exists in ${ref} (${match.existingName}).`
          );
        }

        if (emailRes.valid) {
          const prevEmailRow = seenEmailsInFile.get(emailRes.normalized);
          if (prevEmailRow !== undefined) {
            duplicateReasons.push(
              `Duplicate Email Address "${emailRes.normalized}" already appears in Row ${prevEmailRow} of this file.`
            );
          } else {
            seenEmailsInFile.set(emailRes.normalized, rowNumber);
          }
        }

        if (phoneRes.valid && phoneRes.normalized) {
          const prevPhoneRow = seenPhonesInFile.get(phoneRes.normalized);
          if (prevPhoneRow !== undefined) {
            duplicateReasons.push(
              `Duplicate Mobile Phone "${phoneRes.trimmed}" already appears in Row ${prevPhoneRow} of this file.`
            );
          } else {
            seenPhonesInFile.set(phoneRes.normalized, rowNumber);
          }
        }
      }

      let status: 'valid' | 'duplicate' | 'invalid' = 'valid';
      let reasons: string[] = [];

      if (invalidReasons.length > 0) {
        status = 'invalid';
        reasons = [...invalidReasons, ...duplicateReasons];
      } else if (duplicateReasons.length > 0) {
        status = 'duplicate';
        reasons = duplicateReasons;
      }

      const parsed: LeadImportParsedRow = {
        source: sourceRes.valid ? sourceRes.code : extracted.source,
        sourceLabel: sourceRes.valid ? sourceRes.label : extracted.source || '—',
        firstName,
        lastName: extracted.lastName.trim(),
        email: emailRes.normalized || extracted.email.trim(),
        phone: phoneRes.trimmed || extracted.phone.trim(),
        targetCountry: extracted.targetCountry.trim(),
        targetDegree: degreeRes.value,
        intakeSeason: intakeRes.value,
        intakeYear: parsedIntakeYear,
        budgetInLakhsINR: parsedBudget,
        requiresLoan: loanRes.value,
        cgpaOrPercentage: cgpaRes.isEmpty ? '' : cgpaRes.formatted,
        cgpaValue: cgpaRes.numericValue,
        scoreType: cgpaRes.scoreType
      };

      previewRows.push({
        rowNumber,
        status,
        reasons,
        raw,
        parsed
      });
    }

    const validRecords = previewRows.filter(r => r.status === 'valid').length;
    const duplicateRecords = previewRows.filter(r => r.status === 'duplicate').length;
    const invalidRecords = previewRows.filter(r => r.status === 'invalid').length;

    return {
      totalRecords: previewRows.length,
      validRecords,
      duplicateRecords,
      invalidRecords,
      rows: previewRows
    };
  }

  // 4E. COMMIT BULK LEAD IMPORT (Imports Valid Records Only, Rejects Invalid & Duplicates)
  public commitLeadImport(
    rawRows: Record<string, string>[],
    existingStudentsList: StudentMasterProfile[] = []
  ): LeadImportCommitResponse {
    const preview = this.previewLeadImport(rawRows, existingStudentsList);
    const importedLeads: LeadRecord[] = [];
    const rejectedRows: LeadImportRowPreview[] = [];

    for (const row of preview.rows) {
      if (row.status === 'valid') {
        const created = this.createLead({
          source: row.parsed.source,
          firstName: row.parsed.firstName,
          lastName: row.parsed.lastName,
          email: row.parsed.email,
          phone: row.parsed.phone,
          preferredCountries: row.parsed.targetCountry
            ? row.parsed.targetCountry.split(',').map(s => s.trim()).filter(Boolean)
            : [],
          targetDegree: row.parsed.targetDegree,
          targetIntakeSeason: row.parsed.intakeSeason,
          targetIntakeYear: row.parsed.intakeYear,
          budgetInLakhsINR: row.parsed.budgetInLakhsINR,
          requiresLoan: row.parsed.requiresLoan,
          cgpaOrPercentage: row.parsed.cgpaOrPercentage,
          existingStudentsList
        });
        importedLeads.push(created.lead);
      } else {
        rejectedRows.push(row);
      }
    }

    return {
      success: true,
      totalRecords: preview.totalRecords,
      importedCount: importedLeads.length,
      skippedDuplicateCount: preview.duplicateRecords,
      skippedInvalidCount: preview.invalidRecords,
      importedLeads,
      rejectedRows
    };
  }

  // 5. CONTROLLED DUPLICATE MERGE
  public mergeLeads(primaryLeadId: string, secondaryLeadId: string, adminNotes?: string): { success: boolean; mergedLead?: LeadRecord; error?: string } {
    const primary = this.leads.find(l => l.id === primaryLeadId);
    const secondary = this.leads.find(l => l.id === secondaryLeadId);

    if (!primary || !secondary) {
      return { success: false, error: 'Both primary and secondary lead records must exist to merge.' };
    }

    if (primary.id === secondary.id) {
      return { success: false, error: 'Cannot merge a lead into itself.' };
    }

    // Transfer call history and tasks to primary
    primary.callHistory = [...primary.callHistory, ...secondary.callHistory];
    primary.callAttemptsCount = primary.callHistory.length;

    // Merge study preferences if primary lacks any
    secondary.studyPreferences.preferredCountries.forEach(c => {
      if (!primary.studyPreferences.preferredCountries.includes(c)) {
        primary.studyPreferences.preferredCountries.push(c);
      }
    });

    // Mark secondary as merged
    secondary.status = 'merged';
    secondary.duplicateInfo = {
      isDuplicate: true,
      duplicateMatches: [],
      mergedWithLeadId: primary.id
    };

    // Add note to primary
    primary.callHistory.push({
      id: `call_merge_${Date.now()}`,
      attemptNumber: primary.callHistory.length + 1,
      timestamp: new Date().toISOString(),
      counselorId: primary.assignedCounselorId,
      counselorName: primary.assignedCounselorName,
      status: 'reachable',
      disposition: 'call_answered',
      durationSeconds: 0,
      callNotes: `[SYSTEM MERGE] Duplicate lead ${secondary.id} merged into this record. ${adminNotes || ''}`
    });

    return { success: true, mergedLead: primary };
  }

  // 6. FIRST CONTACT CALL LOGGING & ESCALATION
  public logCallAttempt(
    leadId: string, 
    counselorId: string,
    counselorName: string,
    status: 'reachable' | 'not_reachable',
    disposition: CallDisposition,
    durationSeconds: number,
    callNotes: string,
    scheduledFollowUp?: string
  ): { lead: LeadRecord; escalated: boolean } {
    const lead = this.leads.find(l => l.id === leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const attemptNumber = lead.callHistory.length + 1;
    const now = new Date().toISOString();

    const record: CallAttemptRecord = {
      id: `call_${Date.now()}`,
      attemptNumber,
      timestamp: now,
      counselorId,
      counselorName,
      status,
      disposition,
      durationSeconds,
      callNotes,
      scheduledFollowUp
    };

    lead.callHistory.push(record);
    lead.callAttemptsCount = lead.callHistory.length;
    lead.nextFollowUpDateTime = scheduledFollowUp;

    if (status === 'reachable') {
      lead.status = 'contact_in_progress';
      // Mark initial contact task completed
      const initTask = lead.tasks.find(t => t.title.includes('First Contact'));
      if (initTask) initTask.completed = true;
    }

    // Escalation rule: 3 consecutive not_reachable attempts
    const lastThree = lead.callHistory.slice(-3);
    const threeMissed = lastThree.length >= 3 && lastThree.every(a => a.status === 'not_reachable');

    if (threeMissed && !lead.isEscalated) {
      lead.isEscalated = true;
      lead.escalationReason = 'Exceeded 3 consecutive unreachable attempts within SLA. Escalated to Branch Manager for supervisor intervention.';
      record.isEscalated = true;
      lead.tasks.push({
        id: `tsk_esc_${Date.now()}`,
        title: 'URGENT ESCALATION: 3 Consecutive Unreachable Calls (Branch Manager Review)',
        assignedRole: 'branch_manager',
        slaHoursRemaining: 12,
        dueDate: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        completed: false
      });
    }

    return { lead, escalated: !!lead.isEscalated };
  }

  // 7. MARK LEAD AS LOST
  public markLeadLost(leadId: string, reason: string): LeadRecord {
    const lead = this.leads.find(l => l.id === leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    lead.status = 'lost';
    lead.lostReason = reason;
    lead.callHistory.push({
      id: `call_lost_${Date.now()}`,
      attemptNumber: lead.callHistory.length + 1,
      timestamp: new Date().toISOString(),
      counselorId: lead.assignedCounselorId,
      counselorName: lead.assignedCounselorName,
      status: 'reachable',
      disposition: 'call_answered',
      durationSeconds: 0,
      callNotes: `[LEAD STATUS UPDATE: LOST] Reason: ${reason}`
    });

    return lead;
  }

  // 8. RECORD STRUCTURED COUNSELLING & GENERATE PROPOSAL
  public saveCounsellingAndGenerateProposal(
    leadId: string, 
    sessionPayload: {
      mode: 'in_person_branch' | 'google_meet' | 'zoom' | 'phone_call';
      academics: any;
      profession: any;
      studyPreferences: any;
      financials: any;
      documentsChecklist: any;
      studentGoalsAndConcerns: string;
      packageType: 'standard_advisory' | 'premium_comprehensive' | 'germany_aps_specialized';
      discountINR?: number;
    }
  ): CounsellingSessionData {
    const lead = this.leads.find(l => l.id === leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    // Pricing Matrix
    let baseFeeINR = 25000;
    if (sessionPayload.packageType === 'premium_comprehensive') baseFeeINR = 45000;
    if (sessionPayload.packageType === 'germany_aps_specialized') baseFeeINR = 35000;

    const discount = sessionPayload.discountINR || 0;
    const discountedBase = Math.max(0, baseFeeINR - discount);
    const gstRatePercent = 18;
    const gstAmountINR = Math.round(discountedBase * 0.18);
    const netPayableINR = discountedBase + gstAmountINR;

    const paymentToken = `pay_tok_${crypto.randomBytes(12).toString('hex')}`;
    const paymentLink = {
      linkUrl: `https://pay.crm-portal.com/checkout/${paymentToken}`,
      paymentToken,
      expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString()
    };

    const session: CounsellingSessionData = {
      id: `coun_${Date.now()}`,
      scheduledAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      mode: sessionPayload.mode,
      meetingLink: sessionPayload.mode.includes('meet') ? 'https://meet.google.com/new' : undefined,
      counselorId: lead.assignedCounselorId,
      counselorName: lead.assignedCounselorName,
      academics: sessionPayload.academics,
      profession: sessionPayload.profession,
      studyPreferences: sessionPayload.studyPreferences,
      financials: sessionPayload.financials,
      documentsChecklist: sessionPayload.documentsChecklist,
      studentGoalsAndConcerns: sessionPayload.studentGoalsAndConcerns,
      proposal: {
        packageType: sessionPayload.packageType,
        baseFeeINR,
        gstRatePercent,
        gstAmountINR,
        discountINR: discount,
        netPayableINR,
        generatedAt: new Date().toISOString(),
        paymentLink
      },
      counselorVerdict: 'recommended_for_registration'
    };

    lead.counsellingSession = session;
    lead.status = 'counselled';
    lead.tasks.push({
      id: `tsk_pay_${Date.now()}`,
      title: `Registration Fee Follow-up (₹${netPayableINR.toLocaleString()} INR)`,
      assignedRole: 'counselor',
      slaHoursRemaining: 48,
      dueDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      completed: false
    });

    return session;
  }

  // 9. VERIFIED REGISTRATION PAYMENT & IDEMPOTENT CONVERSION
  // Blueprint mandate: Do not mark payment successful based solely on redirect.
  // Must use verified webhook HMAC or admin bank reconciliation.
  public verifyPaymentAndRegisterStudent(
    leadId: string,
    verification: {
      method: 'razorpay_webhook' | 'admin_bank_reconciliation';
      paymentProviderRef: string; // Razorpay payment ID or Bank UTR
      webhookSignature?: string; // x-razorpay-signature for HMAC verification
      verifiedByAdminSession?: AuthenticatedUserSession;
      existingStudentsList: StudentMasterProfile[];
    }
  ): { 
    success: boolean; 
    registrationRecord?: RegistrationRecord; 
    createdStudent?: StudentMasterProfile; 
    isIdempotentReplay?: boolean;
    error?: string;
  } {
    const lead = this.leads.find(l => l.id === leadId);
    if (!lead) {
      return { success: false, error: `Lead ${leadId} not found` };
    }

    // IDEMPOTENCY CHECK: If already registered with this ref or lead, return existing record without duplicate
    if (lead.status === 'registered' && lead.registrationRecord) {
      const existingStudent = verification.existingStudentsList.find(s => s.id === lead.registrationRecord?.studentId);
      return {
        success: true,
        isIdempotentReplay: true,
        registrationRecord: lead.registrationRecord,
        createdStudent: existingStudent
      };
    }

    // SECURITY VERIFICATION:
    // A) Razorpay Webhook HMAC check
    if (verification.method === 'razorpay_webhook') {
      const WEBHOOK_SECRET = 'gmi_prod_rzp_secret_9981';
      const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(verification.paymentProviderRef)
        .digest('hex');

      if (!verification.webhookSignature || verification.webhookSignature !== expectedSignature) {
        return {
          success: false,
          error: 'Security Failure: Invalid Razorpay webhook signature. Forged or unverified payment rejection.',
        };
      }
    }

    // B) Admin Bank Reconciliation RBAC check
    if (verification.method === 'admin_bank_reconciliation') {
      if (!verification.verifiedByAdminSession) {
        return { success: false, error: 'Admin session required for manual bank reconciliation.' };
      }
      const allowedRoles = ['super_admin', 'ceo', 'finance_team'];
      if (!allowedRoles.includes(verification.verifiedByAdminSession.role)) {
        return { 
          success: false, 
          error: 'Permission Denied: Only Finance Team or Super Admin can reconcile bank transfers.' 
        };
      }
    }

    // Fee amounts from proposal or standard default
    const netAmount = lead.counsellingSession?.proposal.netPayableINR || 29500;
    const gstAmount = lead.counsellingSession?.proposal.gstAmountINR || 4500;
    const feeAmount = netAmount - gstAmount;

    // Generate unique serial IDs
    this.studentSequence += 1;
    this.invoiceSequence += 1;
    const studentRefNo = `GMI-STU-2026-${String(this.studentSequence).padStart(4, '0')}`;
    const studentId = `std_${Date.now()}`;
    const invoiceNumber = `GMI-INV-2026-${String(this.invoiceSequence).padStart(4, '0')}`;
    const receiptNumber = `GMI-RCP-2026-${String(this.invoiceSequence).padStart(4, '0')}`;
    const registeredAt = new Date().toISOString();

    const portalUsername = `${lead.contact.firstName.toLowerCase()}.${studentRefNo.toLowerCase().slice(-4)}@portal.crm-portal.com`;

    const onboardingTasks = [
      'Assign Processing & Documentation Officer (Stage 4 Documentation Vault)',
      'Issue Official Welcome Kit & Agreement Copy via WhatsApp / Email',
      'Collect Academic Transcripts, Passport Copies & English Test Scorecards',
      'Schedule Stage 5 Profile Analysis with Academic Evaluator'
    ];

    const registrationRecord: RegistrationRecord = {
      id: `reg_${Date.now()}`,
      leadId: lead.id,
      studentId,
      studentRefNo,
      registeredAt,
      invoiceNumber,
      receiptNumber,
      feeAmountINR: feeAmount,
      gstAmountINR: gstAmount,
      totalAmountINR: netAmount,
      paymentVerificationMethod: verification.method,
      paymentProviderRef: verification.paymentProviderRef,
      verifiedBy: verification.method === 'razorpay_webhook' 
        ? 'Razorpay Webhook HMAC-SHA256' 
        : (verification.verifiedByAdminSession?.name || 'Finance Officer'),
      agreementSigned: true,
      agreementSignedAt: registeredAt,
      portalUsername,
      portalActivated: true,
      onboardingTasksCreated: onboardingTasks
    };

    lead.status = 'registered';
    lead.registrationRecord = registrationRecord;

    // Construct full StudentMasterProfile in Stage 3 (Registration)
    const newStudentProfile: StudentMasterProfile = {
      id: studentId,
      studentRefNo,
      createdAt: registeredAt,
      updatedAt: registeredAt,
      currentStage: 'registration',
      branch: lead.assignedBranch,
      assignedCounselorId: lead.assignedCounselorId,
      assignedCounselorName: lead.assignedCounselorName,
      assignedProcessingOfficerId: 'usr_p1',
      assignedProcessingOfficerName: 'Rajesh Nair (Processing)',
      personal: {
        firstName: lead.contact.firstName,
        lastName: lead.contact.lastName,
        email: lead.contact.email,
        phone: lead.contact.phone,
        whatsapp: lead.contact.whatsapp,
        dateOfBirth: '2003-05-14',
        nationality: 'Indian',
        passportNumber: undefined, // Pending documentation vault upload
        aadhaarNumber: undefined,
        panNumber: undefined,
        city: lead.contact.city,
        state: lead.contact.state,
        emergencyContact: {
          name: 'Guardian / Parent',
          relation: 'Father',
          phone: lead.contact.phone,
          portalAccessEnabled: true
        }
      },
      leadDetails: {
        source: lead.source as any,
        subSource: lead.campaignData.utmCampaign || lead.campaignData.eventOrCollegeName,
        campaign: lead.campaignData.utmCampaign,
        leadScore: lead.leadScore,
        firstContactDate: lead.enquiryDateTime.split('T')[0],
        duplicateFlag: false
      },
      academics: {
        highestQualification: lead.counsellingSession?.academics.undergraduateDegree || 'BTech Computer Science',
        institution: lead.counsellingSession?.academics.undergraduateInstitution || 'Osmania University',
        completionYear: lead.counsellingSession?.academics.undergraduateCompletionYear || 2026,
        scoreType: lead.studyPreferences.scoreType || 'gpa_10',
        scoreValue: lead.counsellingSession?.academics.undergraduateCgpa || lead.studyPreferences.cgpaValue || 8.4,
        cgpaOrPercentage: lead.studyPreferences.cgpaOrPercentage || (lead.counsellingSession?.academics.undergraduateCgpa ? `${lead.counsellingSession.academics.undergraduateCgpa} CGPA` : '8.4 CGPA'),
        backlogs: lead.counsellingSession?.academics.backlogsCount || 0,
        englishTest: {
          testType: 'IELTS',
          overallScore: 7.5,
          bands: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 7.5 }
        }
      },
      preferences: {
        targetCountries: lead.studyPreferences.preferredCountries,
        targetDegree: lead.studyPreferences.targetDegree as any,
        targetIntakeSeason: lead.studyPreferences.targetIntakeSeason,
        targetIntakeYear: lead.studyPreferences.targetIntakeYear,
        targetFields: [lead.studyPreferences.targetCourse],
        budgetCapInLakhsINR: lead.studyPreferences.budgetInLakhsINR,
        requiresLoan: lead.studyPreferences.requiresLoan
      },
      registration: {
        isRegistered: true,
        registrationDate: registeredAt,
        registrationFeeAmount: netAmount,
        paymentStatus: 'paid',
        agreementSigned: true,
        agreementSignedAt: registeredAt
      },
      parallelServices: {
        educationLoan: {
          active: lead.studyPreferences.requiresLoan,
          status: lead.studyPreferences.requiresLoan ? 'applied' : 'not_required',
          partnerBank: lead.studyPreferences.requiresLoan ? 'HDFC Credila' : undefined
        },
        testPrep: { active: false },
        forexCard: { active: true, status: 'pending' },
        simCard: { active: true, status: 'pending' },
        accommodation: { active: false, status: 'searching' }
      },
      applications: [],
      documents: [],
      tasks: onboardingTasks.map((t, idx) => ({
        id: `tsk_onboard_${Date.now()}_${idx}`,
        title: t,
        assignedToRole: idx === 0 ? 'processing_officer' : 'counselor',
        assignedToName: idx === 0 ? 'Rajesh Nair' : lead.assignedCounselorName,
        dueDate: new Date(Date.now() + (24 * (idx + 1)) * 3600 * 1000).toISOString(),
        priority: 'high',
        completed: false,
        slaHoursRemaining: 24 * (idx + 1),
        isOverdue: false
      })),
      auditTrail: [
        {
          id: `aud_reg_${Date.now()}`,
          action: 'Student Registered & Profile Created',
          role: 'counselor',
          timestamp: registeredAt,
          performedBy: registrationRecord.verifiedBy,
          details: `Registration payment of ₹${netAmount.toLocaleString()} INR verified via ${verification.method} (Ref: ${verification.paymentProviderRef}). Generated Student ID ${studentRefNo} and Invoice ${invoiceNumber}.`
        }
      ]
    };

    verification.existingStudentsList.unshift(newStudentProfile);

    return {
      success: true,
      registrationRecord,
      createdStudent: newStudentProfile
    };
  }

  // 10. GET LEADS (Filtered)
  public getLeads(filters?: {
    status?: string;
    source?: string;
    priority?: string;
    counselorId?: string;
    search?: string;
  }): LeadRecord[] {
    let result = [...this.leads];

    if (filters?.status && filters.status !== 'all') {
      result = result.filter(l => l.status === filters.status);
    }
    if (filters?.source && filters.source !== 'all') {
      result = result.filter(l => l.source === filters.source);
    }
    if (filters?.priority && filters.priority !== 'all') {
      result = result.filter(l => l.priority === filters.priority);
    }
    if (filters?.counselorId && filters.counselorId !== 'all') {
      result = result.filter(l => l.assignedCounselorId === filters.counselorId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(l => 
        l.id.toLowerCase().includes(q) ||
        l.contact.firstName.toLowerCase().includes(q) ||
        l.contact.lastName.toLowerCase().includes(q) ||
        l.contact.email.toLowerCase().includes(q) ||
        l.contact.phone.includes(q)
      );
    }

    return result;
  }

  public getLeadById(id: string): LeadRecord | undefined {
    return this.leads.find(l => l.id === id);
  }

  public setLeads(leads: LeadRecord[]) {
    this.leads = [...leads];
  }

  public syncCounselorsFromDb(dbCounselors: any[]) {
    if (!Array.isArray(dbCounselors) || dbCounselors.length === 0) return;

    for (const c of dbCounselors) {
      const counselorId = String(c.id);
      const counselorEmail = (c.email || '').toLowerCase().trim();
      const counselorName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name || 'Counselor';
      const counselorBranch = c.branch || 'Hyderabad - Somajiguda';

      const existing = this.assignmentConfig.counselors.find(
        p => p.id === counselorId || p.email.toLowerCase() === counselorEmail
      );

      if (existing) {
        existing.id = counselorId;
        existing.name = counselorName;
        existing.email = counselorEmail;
        existing.branch = counselorBranch;
        existing.isAvailable = c.is_active !== false && c.isActive !== false;
      } else {
        this.assignmentConfig.counselors.push({
          id: counselorId,
          name: counselorName,
          email: counselorEmail,
          branch: counselorBranch,
          activeLeadCount: this.leads.filter(
            l => (l.assignedCounselorId === counselorId || l.assignedCounselorName === counselorName) && l.status !== 'lost' && l.status !== 'merged'
          ).length,
          maxLeadCapacity: 35,
          specializedCountries: ['United Kingdom', 'Ireland', 'Germany', 'USA', 'Canada'],
          isAvailable: c.is_active !== false && c.isActive !== false,
          availabilityStatus: 'available',
          statusDurationMode: 'today',
          statusNote: 'Available for Lead Assignment',
          weeklySchedule: buildSevenDaySchedule('available')
        });
      }
    }

    if (this.assignmentConfig.counselors.length > 0) {
      const hasFallback = this.assignmentConfig.counselors.some(c => c.id === this.assignmentConfig.fallbackCounselorId);
      if (!hasFallback) {
        this.assignmentConfig.fallbackCounselorId = this.assignmentConfig.counselors[0].id;
      }
    }
  }

  public getAssignmentConfig(): LeadAssignmentConfiguration {
    for (const c of this.assignmentConfig.counselors) {
      c.activeLeadCount = this.leads.filter(
        l => (l.assignedCounselorId === c.id || l.assignedCounselorName === c.name) && l.status !== 'lost' && l.status !== 'merged'
      ).length;
    }
    return this.assignmentConfig;
  }

  public updateAssignmentConfig(config: Partial<LeadAssignmentConfiguration>): LeadAssignmentConfiguration {
    if (config.ruleType) this.assignmentConfig.ruleType = config.ruleType;
    if (config.counselors) this.assignmentConfig.counselors = config.counselors;
    return this.getAssignmentConfig();
  }

  // --- UPDATE LEAD TEMPERATURE (Hot / Warm / Cold in Database GMI-leads) ---
  public updateLeadPriority(leadId: string, priority: LeadPriority, actorName = 'Staff'): LeadRecord {
    const lead = this.leads.find(l => l.id === leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);
    lead.priority = priority;
    if (priority === 'hot' && lead.leadScore < 75) lead.leadScore = 82;
    else if (priority === 'warm' && (lead.leadScore < 50 || lead.leadScore >= 75)) lead.leadScore = 65;
    else if (priority === 'cold' && lead.leadScore >= 50) lead.leadScore = 40;

    lead.callHistory.push({
      id: `call_temp_${Date.now()}`,
      attemptNumber: lead.callHistory.length + 1,
      timestamp: new Date().toISOString(),
      counselorId: lead.assignedCounselorId,
      counselorName: actorName,
      status: 'reachable',
      disposition: 'call_answered',
      durationSeconds: 0,
      callNotes: `[DB LEAD TEMPERATURE UPDATE] Lead priority updated to ${priority.toUpperCase()} by ${actorName}.`
    });
    return lead;
  }

  // --- COUNSELLOR AVAILABILITY & BANDWIDTH UPDATE (For Today / Full 1 Week / Custom 7-Day Schedule) ---
  public updateCounselorAvailability(params: {
    counselorId: string;
    availabilityStatus: CounselorAvailabilityStatus;
    durationMode: 'today' | 'full_week' | 'custom_days';
    statusNote?: string;
    maxLeadCapacity?: number;
    customWeeklySchedule?: CounselorDailyScheduleEntry[];
    actorName?: string;
  }): CounselorAssignmentProfile {
    let counselor = this.assignmentConfig.counselors.find(
      c => c.id === params.counselorId || c.email.toLowerCase() === params.counselorId.toLowerCase()
    );
    if (!counselor) {
      counselor = {
        id: params.counselorId,
        name: params.actorName || 'Counsellor',
        email: params.counselorId.includes('@') ? params.counselorId : `${params.counselorId}@crm-portal.com`,
        branch: 'Hyderabad - Head Office',
        activeLeadCount: this.leads.filter(
          l => l.assignedCounselorId === params.counselorId && l.status !== 'lost' && l.status !== 'merged'
        ).length,
        maxLeadCapacity: params.maxLeadCapacity || 35,
        specializedCountries: ['Germany', 'United Kingdom', 'United States'],
        isAvailable: true,
        availabilityStatus: 'available',
        statusDurationMode: 'today',
        statusNote: 'Available for Round-Robin Lead Assignment',
        weeklySchedule: buildSevenDaySchedule('available')
      };
      this.assignmentConfig.counselors.push(counselor);
    }

    if (typeof params.maxLeadCapacity === 'number' && params.maxLeadCapacity >= 1) {
      counselor.maxLeadCapacity = params.maxLeadCapacity;
    }

    const now = new Date();
    const currentSchedule =
      counselor.weeklySchedule && counselor.weeklySchedule.length === 7
        ? [...counselor.weeklySchedule]
        : buildSevenDaySchedule('available');

    if (params.durationMode === 'full_week') {
      // Update all 7 days for full 1 week
      counselor.weeklySchedule = buildSevenDaySchedule(
        params.availabilityStatus,
        params.statusNote || `Full 1-Week ${params.availabilityStatus.replace('_', ' ')}`
      );
      counselor.availabilityStatus = params.availabilityStatus;
      counselor.statusDurationMode = 'full_week';
      counselor.statusEffectiveUntil = new Date(now.getTime() + 7 * 86400 * 1000).toISOString();
    } else if (params.durationMode === 'custom_days' && params.customWeeklySchedule?.length) {
      counselor.weeklySchedule = params.customWeeklySchedule;
      counselor.availabilityStatus = params.customWeeklySchedule[0]?.status || params.availabilityStatus;
      counselor.statusDurationMode = 'custom_days';
      counselor.statusEffectiveUntil = new Date(now.getTime() + 7 * 86400 * 1000).toISOString();
    } else {
      // Default: Update for Today (that day)
      currentSchedule[0] = {
        ...currentSchedule[0],
        status: params.availabilityStatus,
        note: params.statusNote || `Updated for today: ${params.availabilityStatus.replace('_', ' ')}`
      };
      counselor.weeklySchedule = currentSchedule;
      counselor.availabilityStatus = params.availabilityStatus;
      counselor.statusDurationMode = 'today';
      counselor.statusEffectiveUntil = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
    }

    counselor.statusNote =
      params.statusNote ||
      (counselor.availabilityStatus === 'available'
        ? 'Available for Round-Robin Lead Assignment'
        : `${counselor.availabilityStatus.replace('_', ' ').toUpperCase()} (${
            counselor.statusDurationMode === 'full_week' ? 'Full 1 Week' : 'Today'
          })`);

    const todayStatus = counselor.weeklySchedule?.[0]?.status || counselor.availabilityStatus;
    counselor.isAvailable = todayStatus === 'available' && counselor.activeLeadCount < counselor.maxLeadCapacity;

    return counselor;
  }

  // --- HIGHER HIERARCHY REASSIGN LEAD COUNSELLOR (GMI-sp_reassign_lead_counselor) ---
  public reassignLeadCounselor(params: {
    leadId: string;
    newCounselorId: string;
    actorName: string;
    actorRole: string;
    reason?: string;
  }): {
    lead: LeadRecord;
    previousCounselorName: string;
    newCounselor: CounselorAssignmentProfile;
  } {
    const lead = this.leads.find(l => l.id === params.leadId);
    if (!lead) {
      throw new Error(`Lead ${params.leadId} not found.`);
    }

    let newCounselor = this.assignmentConfig.counselors.find(
      c => c.id === params.newCounselorId || c.email.toLowerCase() === params.newCounselorId.toLowerCase()
    );
    if (!newCounselor) {
      const seed = SEED_SECURITY_USERS.find(
        u => u.id === params.newCounselorId || u.email.toLowerCase() === params.newCounselorId.toLowerCase()
      );
      if (seed) {
        newCounselor = {
          id: seed.id,
          name: seed.name,
          email: seed.email,
          branch: seed.branch || 'Hyderabad - Head Office',
          activeLeadCount: 0,
          maxLeadCapacity: 35,
          specializedCountries: ['United Kingdom', 'Ireland', 'Germany', 'USA', 'Canada'],
          isAvailable: true,
          availabilityStatus: 'available',
          statusDurationMode: 'today',
          statusNote: 'Available for Lead Assignment',
          weeklySchedule: buildSevenDaySchedule('available')
        };
        this.assignmentConfig.counselors.push(newCounselor);
      }
    }
    if (!newCounselor) {
      throw new Error(`Target counsellor ${params.newCounselorId} not found.`);
    }

    const prevCounselor = this.assignmentConfig.counselors.find(c => c.id === lead.assignedCounselorId);
    const previousCounselorName = lead.assignedCounselorName;

    if (prevCounselor && prevCounselor.id !== newCounselor.id && prevCounselor.activeLeadCount > 0) {
      prevCounselor.activeLeadCount = Math.max(0, prevCounselor.activeLeadCount - 1);
    }
    if (!prevCounselor || prevCounselor.id !== newCounselor.id) {
      newCounselor.activeLeadCount += 1;
    }

    lead.assignedCounselorId = newCounselor.id;
    lead.assignedCounselorName = newCounselor.name;
    lead.assignedBranch = newCounselor.branch;

    lead.callHistory.push({
      id: `call_reassign_${Date.now()}`,
      attemptNumber: lead.callHistory.length + 1,
      timestamp: new Date().toISOString(),
      counselorId: newCounselor.id,
      counselorName: params.actorName,
      status: 'reachable',
      disposition: 'call_answered',
      durationSeconds: 0,
      callNotes: `[HIGHER HIERARCHY REASSIGNMENT] Reassigned from ${previousCounselorName} to ${newCounselor.name} (${newCounselor.branch}) by ${params.actorName} (${params.actorRole}). ${params.reason ? `Reason: ${params.reason}` : ''}`
    });

    return {
      lead,
      previousCounselorName,
      newCounselor
    };
  }

  // 11. AUTOMATED LEAD-TO-REGISTRATION WORKFLOW TEST SUITE
  public runWorkflowTestSuite(existingStudentsList: StudentMasterProfile[]): LeadWorkflowTestResult[] {
    const results: LeadWorkflowTestResult[] = [];

    // TEST 1: Duplicate Lead Detection (Normalized Phone & Email)
    const phoneTest = '9849011223'; // Same as Aarav Reddy
    const dupMatches = this.checkDuplicates(phoneTest, 'sandeepfidrox@gmail.com', undefined, existingStudentsList);
    const passed1 = dupMatches.length > 0 && dupMatches[0].matchedFields.includes('phone');
    results.push({
      id: 'L-TEST-01',
      testName: 'Duplicate Lead Detection (Phone & Email Normalization)',
      category: 'Deduplication',
      passed: passed1,
      expectedOutcome: 'Detect duplicate student Aarav Reddy with matchScore >= 90',
      actualOutcome: passed1 ? `Detected match with ${dupMatches[0].existingName} (Score: ${dupMatches[0].matchScore}%)` : 'Failed to detect duplicate',
      evidence: JSON.stringify(dupMatches[0] || {})
    });

    // TEST 2: Multi-rule Assignment (Destination Specialist Routing)
    const assignedGerman = this.assignCounselor(['Germany'], undefined, 'destination_specialist');
    const passed2 = assignedGerman.name.includes('Rajesh Nair');
    results.push({
      id: 'L-TEST-02',
      testName: 'Destination Specialist Routing (Germany -> Rajesh Nair)',
      category: 'Assignment',
      passed: passed2,
      expectedOutcome: 'Route Germany inquiry to specialized European desk (Rajesh Nair)',
      actualOutcome: `Routed to ${assignedGerman.name} (${assignedGerman.branch})`,
      evidence: `Assigned Counselor: ${assignedGerman.name}, ID: ${assignedGerman.id}`
    });

    // TEST 3: Contact Escalation (3 Consecutive Missed Calls)
    const testLeadResult = this.createLead({
      source: 'google_ads',
      firstName: 'Siddharth',
      lastName: 'Kapoor',
      email: 'siddharth.kapoor@example.com',
      phone: '9988776655',
      preferredCountries: ['United States'],
      budgetInLakhsINR: 35,
      existingStudentsList
    });
    const testLead = testLeadResult.lead;

    // Simulate 3 unreachable attempts
    this.logCallAttempt(testLead.id, 'usr_c1', 'Pooja Sharma', 'not_reachable', 'switched_off', 0, 'Phone switched off. Sent WhatsApp notification.');
    this.logCallAttempt(testLead.id, 'usr_c1', 'Pooja Sharma', 'not_reachable', 'busy_not_picked', 0, 'No answer after 5 rings.');
    const attempt3 = this.logCallAttempt(testLead.id, 'usr_c1', 'Pooja Sharma', 'not_reachable', 'busy_not_picked', 0, 'Still unreachable.');

    const passed3 = attempt3.escalated && testLead.isEscalated && testLead.tasks.some(t => t.assignedRole === 'branch_manager');
    results.push({
      id: 'L-TEST-03',
      testName: 'First Contact SLA Escalation (3 Consecutive Unreachable Calls)',
      category: 'First Contact & Escalation',
      passed: passed3,
      expectedOutcome: 'Flag isEscalated: true and create urgent supervisor task for Branch Manager',
      actualOutcome: passed3 ? 'Escalation triggered. Branch Manager supervisor review task created.' : 'Escalation failed to trigger',
      evidence: `Escalation Reason: ${testLead.escalationReason}`
    });

    // TEST 4: Security Forgery Check (Invalid Razorpay Webhook Signature)
    const forgedWebhookResult = this.verifyPaymentAndRegisterStudent(testLead.id, {
      method: 'razorpay_webhook',
      paymentProviderRef: 'pay_rzp_test_forged_999',
      webhookSignature: 'bogus_forged_signature_hex_123',
      existingStudentsList
    });
    const passed4 = !forgedWebhookResult.success && (forgedWebhookResult.error?.includes('Invalid Razorpay webhook signature') || false);
    results.push({
      id: 'L-TEST-04',
      testName: 'Payment Security: Forged Webhook Signature Rejection',
      category: 'Payment Security',
      passed: passed4,
      expectedOutcome: 'Reject payment with HMAC-SHA256 signature verification failure',
      actualOutcome: passed4 ? 'Forged webhook rejected. Student conversion prevented.' : 'SECURITY FAILED: Accepted forged signature!',
      evidence: forgedWebhookResult.error || 'No error'
    });

    // TEST 5: Verified Razorpay Payment & Conversion to Student
    const validPaymentRef = 'pay_rzp_valid_9981001';
    const validSignature = crypto
      .createHmac('sha256', 'gmi_prod_rzp_secret_9981')
      .update(validPaymentRef)
      .digest('hex');

    const verifiedResult = this.verifyPaymentAndRegisterStudent(testLead.id, {
      method: 'razorpay_webhook',
      paymentProviderRef: validPaymentRef,
      webhookSignature: validSignature,
      existingStudentsList
    });
    const passed5 = verifiedResult.success && !!verifiedResult.createdStudent && testLead.status === 'registered';
    results.push({
      id: 'L-TEST-05',
      testName: 'Verified Payment Conversion: Invoice, Receipt & Student ID Generation',
      category: 'Registration Idempotency',
      passed: passed5,
      expectedOutcome: 'Generate GMI-STU-2026-XXXX, Tax Invoice GMI-INV, and activate Student Portal',
      actualOutcome: passed5 
        ? `Generated Student ID: ${verifiedResult.createdStudent?.studentRefNo}, Invoice: ${verifiedResult.registrationRecord?.invoiceNumber}`
        : 'Payment verification failed',
      evidence: `Portal Username: ${verifiedResult.registrationRecord?.portalUsername}`
    });

    // TEST 6: Registration Idempotency (Replaying Webhook Does Not Duplicate Record)
    const replayResult = this.verifyPaymentAndRegisterStudent(testLead.id, {
      method: 'razorpay_webhook',
      paymentProviderRef: validPaymentRef,
      webhookSignature: validSignature,
      existingStudentsList
    });
    const passed6 = replayResult.success && replayResult.isIdempotentReplay === true && replayResult.registrationRecord?.invoiceNumber === verifiedResult.registrationRecord?.invoiceNumber;
    results.push({
      id: 'L-TEST-06',
      testName: 'Registration Idempotency (Webhook Replay Protection)',
      category: 'Registration Idempotency',
      passed: passed6,
      expectedOutcome: 'Return existing registration record without creating duplicate student or invoice',
      actualOutcome: passed6 ? 'Idempotent replay detected. Preserved existing student & invoice serial.' : 'Failed idempotency check',
      evidence: `Invoice: ${replayResult.registrationRecord?.invoiceNumber}, Replay Flag: ${replayResult.isIdempotentReplay}`
    });

    // TEST 7: RBAC Restriction on Manual Bank Reconciliation
    const counselorSession: AuthenticatedUserSession = {
      userId: 'usr_c1',
      name: 'Pooja Sharma',
      email: 'sandeepkoteshwara29@gmail.com',
      role: 'counselor',
      branch: 'Hyderabad',
      token: 'tok_counselor',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
    };
    const rbacResult = this.verifyPaymentAndRegisterStudent(testLead.id, {
      method: 'admin_bank_reconciliation',
      paymentProviderRef: 'HDFCR520260918001',
      verifiedByAdminSession: counselorSession,
      existingStudentsList
    });
    // Should be rejected or blocked because counselor is not finance/super_admin
    // (Note: testLead is already registered in test 5, so let's test with a fresh lead)
    const freshLead = this.createLead({
      source: 'walk_in',
      firstName: 'Divya',
      lastName: 'Nambiar',
      email: 'divya.nambiar@example.com',
      phone: '9840112233',
      preferredCountries: ['United Kingdom'],
      existingStudentsList
    }).lead;

    const rbacCheckFresh = this.verifyPaymentAndRegisterStudent(freshLead.id, {
      method: 'admin_bank_reconciliation',
      paymentProviderRef: 'HDFCR520260918001',
      verifiedByAdminSession: counselorSession,
      existingStudentsList
    });

    const passed7 = !rbacCheckFresh.success && (rbacCheckFresh.error?.includes('Permission Denied') || false);
    results.push({
      id: 'L-TEST-07',
      testName: 'RBAC Enforcement: Counselor Blocked from Bank Reconciliation',
      category: 'RBAC Enforcement',
      passed: passed7,
      expectedOutcome: 'Reject bank reconciliation when initiated by Counselor (Finance/Admin required)',
      actualOutcome: passed7 ? 'Access Denied: Non-finance role blocked from manual financial reconciliation.' : 'VULNERABILITY: Counselor approved bank payment!',
      evidence: rbacCheckFresh.error || 'No error'
    });

    // TEST 8: Controlled Duplicate Merge
    const dupLeadA = this.createLead({
      source: 'website',
      firstName: 'Kunal',
      lastName: 'Verma',
      email: 'kunal.verma@example.com',
      phone: '9820011223',
      preferredCountries: ['Canada'],
      existingStudentsList
    }).lead;

    const dupLeadB = this.createLead({
      source: 'instagram',
      firstName: 'Kunal',
      lastName: 'Verma',
      email: 'kunal.verma@example.com',
      phone: '9820011223',
      preferredCountries: ['United States'],
      existingStudentsList
    }).lead;

    const mergeResult = this.mergeLeads(dupLeadA.id, dupLeadB.id, 'User confirmed duplicate inquiry from Instagram.');
    const passed8 = mergeResult.success && dupLeadB.status === 'merged' && dupLeadA.studyPreferences.preferredCountries.includes('United States');
    results.push({
      id: 'L-TEST-08',
      testName: 'Controlled Duplicate Lead Merge & Audit Trail',
      category: 'Deduplication',
      passed: passed8,
      expectedOutcome: 'Merge secondary lead history into primary and set secondary status to merged',
      actualOutcome: passed8 ? 'Merged successfully. Merged Canadian and US preferences into primary record.' : 'Merge failed',
      evidence: `Primary Lead ${dupLeadA.id} now contains ${dupLeadA.callHistory.length} call/system events.`
    });

    return results;
  }

  // Seed initial realistic leads
  private seedInitialLeads() {
    this.leads = [
      {
        id: 'GMI-LD-2026-0091',
        enquiryDateTime: '2026-09-17T10:15:00Z',
        source: 'google_ads',
        campaignData: {
          utmSource: 'google',
          utmMedium: 'cpc',
          utmCampaign: 'study_in_germany_masters_2026',
          utmTerm: 'ms in mechanical engineering germany free tuition'
        },
        contact: {
          firstName: 'Rohan',
          lastName: 'Sharma',
          email: 'rohan.sharma26@gmail.com',
          phone: '+91 98491 12345',
          whatsapp: '+91 98491 12345',
          city: 'Hyderabad',
          state: 'Telangana',
          country: 'India'
        },
        studyPreferences: {
          preferredCountries: ['Germany', 'Sweden'],
          targetDegree: 'Masters',
          targetCourse: 'MSc Automotive Engineering',
          targetIntakeSeason: 'Fall',
          targetIntakeYear: 2026,
          budgetInLakhsINR: 20,
          requiresLoan: true,
          cgpaOrPercentage: '8.6 CGPA',
          cgpaValue: 8.6,
          scoreType: 'gpa_10'
        },
        assignedCounselorId: 'usr_c2',
        assignedCounselorName: 'Rajesh Nair',
        assignedBranch: 'Bangalore - Indiranagar',
        priority: 'hot',
        leadScore: 85,
        status: 'counselling_scheduled',
        callHistory: [
          {
            id: 'call_seed_1',
            attemptNumber: 1,
            timestamp: '2026-09-17T11:00:00Z',
            counselorId: 'usr_c2',
            counselorName: 'Rajesh Nair',
            status: 'reachable',
            disposition: 'call_answered',
            durationSeconds: 340,
            callNotes: 'Student has 8.6 CGPA in Mechanical Engg from JNTU. Target: TU Munich, RWTH Aachen. Wants APS certificate guidance. Scheduled virtual counselling session.',
            scheduledFollowUp: '2026-09-19T14:30:00Z'
          }
        ],
        callAttemptsCount: 1,
        isEscalated: false,
        nextFollowUpDateTime: '2026-09-19T14:30:00Z',
        tasks: [
          {
            id: 'tsk_seed_1',
            title: 'Virtual Counselling Session on Google Meet (TU Munich & APS Evaluation)',
            assignedRole: 'counselor',
            slaHoursRemaining: 18,
            dueDate: '2026-09-19T14:30:00Z',
            completed: false
          }
        ]
      },
      {
        id: 'GMI-LD-2026-0092',
        enquiryDateTime: '2026-09-17T14:45:00Z',
        source: 'instagram',
        campaignData: {
          utmSource: 'instagram',
          utmMedium: 'social_story_ad',
          utmCampaign: 'uk_jan_intake_spot_assessment'
        },
        contact: {
          firstName: 'Ananya',
          lastName: 'Choudhury',
          email: 'ananya.c@yahoo.com',
          phone: '+91 97112 33445',
          whatsapp: '+91 97112 33445',
          city: 'Delhi',
          state: 'Delhi',
          country: 'India'
        },
        studyPreferences: {
          preferredCountries: ['United Kingdom', 'Ireland'],
          targetDegree: 'Masters',
          targetCourse: 'MSc Business Analytics',
          targetIntakeSeason: 'Spring',
          targetIntakeYear: 2027,
          budgetInLakhsINR: 32,
          requiresLoan: false,
          cgpaOrPercentage: '8.2 CGPA',
          cgpaValue: 8.2,
          scoreType: 'gpa_10'
        },
        assignedCounselorId: 'usr_c1',
        assignedCounselorName: 'Sandeep Koteshwara',
        assignedBranch: 'Hyderabad - Head Office',
        priority: 'hot',
        leadScore: 80,
        status: 'counselled',
        callHistory: [
          {
            id: 'call_seed_2',
            attemptNumber: 1,
            timestamp: '2026-09-17T15:30:00Z',
            counselorId: 'usr_c1',
            counselorName: 'Sandeep Koteshwara',
            status: 'reachable',
            disposition: 'call_answered',
            durationSeconds: 420,
            callNotes: 'Conducted detailed counseling. Student has 7.8 IELTS score. Recommended Warwick, Manchester, and Leeds. Sent Premium Comprehensive proposal.',
            scheduledFollowUp: '2026-09-20T11:00:00Z'
          }
        ],
        callAttemptsCount: 1,
        isEscalated: false,
        nextFollowUpDateTime: '2026-09-20T11:00:00Z',
        counsellingSession: {
          id: 'coun_seed_1',
          scheduledAt: '2026-09-17T15:00:00Z',
          completedAt: '2026-09-17T16:00:00Z',
          mode: 'google_meet',
          meetingLink: 'https://meet.google.com/new',
          counselorId: 'usr_c1',
          counselorName: 'Sandeep Koteshwara',
          academics: {
            tenthPercentage: 91.2,
            twelfthPercentage: 88.5,
            undergraduateDegree: 'BBA Finance',
            undergraduateInstitution: 'Delhi University',
            undergraduateCompletionYear: 2025,
            undergraduateCgpa: 8.2,
            backlogsCount: 0,
            englishTestStatus: 'completed',
            englishTestType: 'IELTS',
            englishTestOverallScore: 7.5,
            greGmatStatus: 'waiver_expected'
          },
          profession: {
            hasWorkExperience: true,
            totalYearsOfExperience: 1.5,
            currentDesignation: 'Financial Analyst Intern',
            currentEmployer: 'KPMG India',
            relevantToStudyField: true
          },
          studyPreferences: {
            targetCountries: ['United Kingdom', 'Ireland'],
            targetDegree: 'Masters',
            targetCourseCategory: 'Business Analytics & FinTech',
            targetIntakeSeason: 'Spring',
            targetIntakeYear: 2027,
            universityTierPreference: 'Top 100-200'
          },
          financials: {
            estimatedTotalBudgetINR: 3200000,
            selfOrFamilyContributionINR: 3200000,
            loanRequired: false,
            collateralAvailable: true
          },
          documentsChecklist: {
            passportValid: true,
            transcriptsAvailable: true,
            provisionalDegreeAvailable: true,
            englishScorecardAvailable: true,
            sopDraftAvailable: true,
            lorLettersAvailable: true,
            financialSponsorAffidavit: true
          },
          studentGoalsAndConcerns: 'Seeks 2-year post-study work visa in UK and placement support in London banking sector.',
          proposal: {
            packageType: 'premium_comprehensive',
            baseFeeINR: 45000,
            gstRatePercent: 18,
            gstAmountINR: 8100,
            discountINR: 3100,
            netPayableINR: 50000,
            generatedAt: '2026-09-17T16:15:00Z',
            paymentLink: {
              linkUrl: 'https://pay.crm-portal.com/checkout/pay_tok_ananya_uk_2026',
              paymentToken: 'pay_tok_ananya_uk_2026',
              expiresAt: '2026-09-20T23:59:59Z'
            }
          },
          counselorVerdict: 'recommended_for_registration'
        },
        tasks: [
          {
            id: 'tsk_seed_2',
            title: 'Follow-up on ₹50,000 Registration Payment Link',
            assignedRole: 'counselor',
            slaHoursRemaining: 36,
            dueDate: '2026-09-20T11:00:00Z',
            completed: false
          }
        ]
      },
      {
        id: 'GMI-LD-2026-0093',
        enquiryDateTime: '2026-09-18T08:30:00Z',
        source: 'education_fairs',
        campaignData: {
          eventOrCollegeName: 'QS World Grad School Fair Hyderabad',
          utmCampaign: 'qs_fair_hyderabad_sept2026'
        },
        contact: {
          firstName: 'Varun',
          lastName: 'Teja',
          email: 'varun.teja.engg@gmail.com',
          phone: '+91 94401 55667',
          whatsapp: '+91 94401 55667',
          city: 'Hyderabad',
          state: 'Telangana',
          country: 'India'
        },
        studyPreferences: {
          preferredCountries: ['United States'],
          targetDegree: 'Masters',
          targetCourse: 'MS Computer Science & Data Science',
          targetIntakeSeason: 'Fall',
          targetIntakeYear: 2026,
          budgetInLakhsINR: 45,
          requiresLoan: true,
          cgpaOrPercentage: '84.5%',
          cgpaValue: 84.5,
          scoreType: 'percentage'
        },
        assignedCounselorId: 'usr_c3',
        assignedCounselorName: 'Ananya Deshmukh',
        assignedBranch: 'Hyderabad - Somajiguda',
        priority: 'warm',
        leadScore: 68,
        status: 'contact_in_progress',
        callHistory: [
          {
            id: 'call_seed_3',
            attemptNumber: 1,
            timestamp: '2026-09-18T10:00:00Z',
            counselorId: 'usr_c3',
            counselorName: 'Ananya Deshmukh',
            status: 'not_reachable',
            disposition: 'busy_not_picked',
            durationSeconds: 0,
            callNotes: 'Call not answered. Sent SMS and WhatsApp brochure.',
            scheduledFollowUp: '2026-09-18T16:00:00Z'
          },
          {
            id: 'call_seed_4',
            attemptNumber: 2,
            timestamp: '2026-09-18T16:15:00Z',
            counselorId: 'usr_c3',
            counselorName: 'Ananya Deshmukh',
            status: 'reachable',
            disposition: 'requested_callback',
            durationSeconds: 120,
            callNotes: 'Student was in office meeting. Requested evening callback after 7:30 PM.',
            scheduledFollowUp: '2026-09-18T19:30:00Z'
          }
        ],
        callAttemptsCount: 2,
        isEscalated: false,
        nextFollowUpDateTime: '2026-09-18T19:30:00Z',
        tasks: [
          {
            id: 'tsk_seed_3',
            title: 'Evening Follow-up Call (Post 7:30 PM)',
            assignedRole: 'counselor',
            slaHoursRemaining: 6,
            dueDate: '2026-09-18T19:30:00Z',
            completed: false
          }
        ]
      },
      {
        id: 'GMI-LD-2026-0094',
        enquiryDateTime: '2026-09-18T11:20:00Z',
        source: 'website',
        campaignData: {
          utmSource: 'website',
          utmMedium: 'organic',
          utmCampaign: 'australia_masters_intake_2026'
        },
        contact: {
          firstName: 'Meera',
          lastName: 'Krishnan',
          email: 'meera.krishnan@example.com',
          phone: '+91 98110 44556',
          whatsapp: '+91 98110 44556',
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India'
        },
        studyPreferences: {
          preferredCountries: ['Australia', 'New Zealand'],
          targetDegree: 'Masters',
          targetCourse: 'Master of Data Science',
          targetIntakeSeason: 'Fall',
          targetIntakeYear: 2026,
          budgetInLakhsINR: 36,
          requiresLoan: false,
          cgpaOrPercentage: '8.4 CGPA',
          cgpaValue: 8.4,
          scoreType: 'gpa_10'
        },
        assignedCounselorId: 'usr_c4',
        assignedCounselorName: 'Rahul Kumar',
        assignedBranch: 'New Delhi - Connaught Place',
        priority: 'hot',
        leadScore: 84,
        status: 'new',
        callHistory: [],
        callAttemptsCount: 0,
        isEscalated: false,
        nextFollowUpDateTime: '2026-09-19T10:30:00Z',
        tasks: [
          {
            id: 'tsk_seed_4',
            title: 'Initial First-Contact Qualification Call (Australia Desk)',
            assignedRole: 'counselor',
            slaHoursRemaining: 12,
            dueDate: '2026-09-19T10:30:00Z',
            completed: false
          }
        ]
      }
    ];
  }
}

// Singleton Engine
export const leadRegistrationEngine = new LeadRegistrationEngine();
