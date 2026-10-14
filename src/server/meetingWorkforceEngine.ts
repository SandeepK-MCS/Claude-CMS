import nodemailer from 'nodemailer';
import {
  GoogleMeetSession,
  GoogleMeetStatus,
  MeetingProviderCode,
  MeetingReminderInterval,
  MeetingNotificationRecord,
  CandidateNoShowStatus,
  StaffAvailabilityRecord,
  StaffPresenceStatus,
  OrganizationWorkingHoursConfig,
  SystemConfigRecord,
  StoredProcedureRecord,
  HierarchyRoleMappingRecord,
  DEFAULT_WORKFORCE_HOURS_VISIBLE_ROLES,
  ROLES_ALLOWED_TO_SCHEDULE_MEETINGS,
  canScheduleGoogleMeet,
  canConfigureWorkingHours,
  canViewWorkforceHours,
  isHigherHierarchyRole
} from '../types/meetingsWorkforce.ts';
import { SecurityEngine, SEED_SECURITY_USERS } from './securityEngine.ts';
import {
  schedulerOAuthEngine,
  generateProviderMeetingUrl,
  buildProviderWebCalendarUrl
} from './schedulerOAuthEngine.ts';

function formatMinutesToHours(mins: number): string {
  const safeMins = Math.max(0, Math.round(mins));
  const h = Math.floor(safeMins / 60);
  const m = safeMins % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function generateSessionReference(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `GMI-MEET-${num}`;
}

function safeDate(iso?: string | number | Date): Date {
  if (!iso) return new Date();
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Builds a 100% valid Google Calendar Event Creation URL with `vcon=meet`
 * so Google Calendar provisions a real Google Meet room and invites both parties.
 */
function buildGoogleCalendarUrl(params: {
  title: string;
  startIso: string;
  endIso: string;
  agenda: string;
  meetLink: string;
  candidateEmail: string;
  schedulerEmail: string;
}): string {
  const formatCalDate = (iso: string) =>
    safeDate(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dates = `${formatCalDate(params.startIso)}/${formatCalDate(params.endIso)}`;
  const details = `${params.agenda}\n\nGoogle Meet Video Room: ${params.meetLink}\nScheduled via Student Lifecycle CRM`;
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    vcon: 'meet',
    text: params.title,
    dates,
    details,
    location: params.meetLink,
    add: `${params.candidateEmail},${params.schedulerEmail}`
  });
  return `https://calendar.google.com/calendar/u/0/r/eventedit?${query.toString()}`;
}

/**
 * Builds a direct Gmail Web Compose URL addressed to both Candidate and Scheduler/Counsellor
 * containing the clickable Google Meet link, Google Calendar block link, and agenda.
 */
function buildGmailComposeUrl(params: {
  title: string;
  startIso: string;
  endIso?: string;
  durationMinutes?: number;
  agenda: string;
  meetLink: string;
  googleCalendarUrl: string;
  candidateName: string;
  candidateEmail: string;
  schedulerName: string;
  schedulerEmail: string;
}): string {
  const recipients = Array.from(
    new Set([params.candidateEmail, params.schedulerEmail].map(e => (e || '').trim()).filter(Boolean))
  ).join(',');
  const formattedTime = safeDate(params.startIso).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });
  const durMins = params.durationMinutes || 30;
  const subject = `Google Meet Invite & Calendar Block: ${params.title} (${params.candidateName})`;
  const body = [
    `Hello ${params.candidateName} & ${params.schedulerName},`,
    ``,
    `Your Google Meet counselling session has been scheduled and blocked on the calendar:`,
    ``,
    `• Session: ${params.title}`,
    `• Date & Time (IST): ${formattedTime} (${durMins} mins)`,
    `• Candidate: ${params.candidateName} (${params.candidateEmail})`,
    `• Counsellor / Host: ${params.schedulerName} (${params.schedulerEmail})`,
    `• Agenda: ${params.agenda}`,
    ``,
    `JOIN GOOGLE MEET VIDEO CALL:`,
    `${params.meetLink}`,
    ``,
    `ADD TO GOOGLE CALENDAR & SEND CALENDAR BLOCK:`,
    `${params.googleCalendarUrl}`,
    ``,
    `Automated reminders will be sent at 1 Hour, 30 Minutes, 15 Minutes, and On Time.`
  ].join('\n');

  const query = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: recipients,
    su: subject,
    body
  });
  return `https://mail.google.com/mail/?${query.toString()}`;
}

/**
 * Builds an RFC-5545 iCalendar (.ics) string with METHOD:REQUEST so Gmail / Outlook
 * automatically renders a Calendar Invite RSVP card and blocks both calendars.
 */
function buildIcsCalendarContent(m: GoogleMeetSession): string {
  const fmt = (iso?: string) => safeDate(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const cleanAgenda = (m?.agenda || '').replace(/\r?\n/g, ' ');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Student Lifecycle CRM//Google Meet Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${m?.id || 'meet'}@crm-portal.com`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(m?.scheduledStartAt)}`,
    `DTEND:${fmt(m?.scheduledEndAt)}`,
    `SUMMARY:${m?.title || 'Counselling Session'} (${m?.candidateName || 'Candidate'})`,
    `DESCRIPTION:${cleanAgenda}${m?.meetLink ? ` - Join Google Meet: ${m.meetLink}` : ''}`,
    `LOCATION:${m?.meetLink || ''}`,
    `URL:${m?.meetLink || ''}`,
    `ORGANIZER;CN=${m?.schedulerName || 'Counsellor'}:mailto:${m?.schedulerEmail || 'sandeepkoteshwara29@gmail.com'}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${m?.candidateName || 'Candidate'}:mailto:${m?.candidateEmail || 'sandeepfidrox@gmail.com'}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=TRUE;CN=${m?.assignedCounselorName || 'Counsellor'}:mailto:${m?.assignedCounselorEmail || 'sandeepkoteshwara29@gmail.com'}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Strict validator for real Google Meet URLs.
 * Rejects placeholder links (/new, xxx-xxxx-xxx, dummy seeds, or missing).
 */
export function isPlaceholderOrInvalidMeetUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) return true;
  if (
    trimmed === 'https://meet.google.com/new' ||
    trimmed === 'https://meet.google.com/' ||
    trimmed === 'https://meet.google.com' ||
    trimmed.includes('/new') ||
    trimmed.includes('xxx-xxxx-xxx') ||
    trimmed.includes('gmi-cnsl-uk26')
  ) {
    return true;
  }
  if (trimmed.startsWith('https://meet.google.com/')) {
    const code = trimmed.replace('https://meet.google.com/', '').split('?')[0].split('/')[0];
    if (!code || code === 'new' || code.includes('xxx') || code.length < 5) return true;
  }
  return false;
}

export function isValidGoogleMeetUrl(url?: string): boolean {
  return !isPlaceholderOrInvalidMeetUrl(url);
}

function normalizeValidMeetLink(
  customLink?: string,
  _defaultBaseUrl?: string,
  providerCode: MeetingProviderCode = 'GOOGLE'
): string {
  const trimmed = (customLink || '').trim();
  if (trimmed.startsWith('https://') && !isPlaceholderOrInvalidMeetUrl(trimmed)) {
    return trimmed;
  }
  return '';
}

export class MeetingWorkforceEngine {
  public isPlaceholderOrInvalidMeetUrl(url?: string): boolean {
    return isPlaceholderOrInvalidMeetUrl(url);
  }

  private securityEngine: SecurityEngine;
  private meetings: Map<string, GoogleMeetSession> = new Map();
  private notifications: MeetingNotificationRecord[] = [];
  private staffAvailability: Map<string, StaffAvailabilityRecord> = new Map();
  private systemConfigs: Map<string, SystemConfigRecord> = new Map();
  private storedProcedures: Map<string, StoredProcedureRecord> = new Map();
  private hierarchyConfigs: HierarchyRoleMappingRecord[] = [];

  private workingHours: OrganizationWorkingHoursConfig = {
    startTime: '09:00',
    endTime: '18:00',
    displayLabel: '09:00 AM – 06:00 PM IST',
    timezone: 'Asia/Kolkata (IST, UTC+05:30)',
    totalDailyHours: 9,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    updatedBy: 'Sandeep Koteshwar (Admin)',
    updatedByRole: 'super_admin',
    updatedAt: new Date(Date.now() - 86400 * 1000).toISOString()
  };

  constructor(securityEngine: SecurityEngine) {
    this.securityEngine = securityEngine;
    this.seedSystemConfigurations();
    this.seedStoredProcedures();
    this.seedInitialHierarchyConfigs();
    this.seedInitialStaffAvailability();
    this.seedInitialMeetings();

    // Background automatic reminder check every 30 seconds (1 hr, 30 min, 15 min, On Time)
    setInterval(() => {
      this.processAutomaticReminders();
    }, 30 * 1000);
  }

  // --- 0. DATABASE-DRIVEN SYSTEM CONFIGURATIONS & GMI- PREFIXED STORED PROCEDURES ---
  public getDbPrefix(): string {
    return this.getConfigValue<string>('DB_TABLE_SP_PREFIX', 'GMI-');
  }

  private seedSystemConfigurations() {
    const nowIso = new Date().toISOString();
    const initialConfigs: SystemConfigRecord[] = [
      // 1. MULTI-TENANT SCHEMA & DOMAIN CONFIGURATION
      {
        key: 'DB_TABLE_SP_PREFIX',
        category: 'Multi-Tenant Schema & Domain',
        label: 'Database Table & Stored Procedure Prefix (Multi-Client)',
        value: 'GMI-',
        valueType: 'string',
        description:
          'Prefix automatically prepended to every database table (e.g. "GMI-users", "GMI-students", "GMI-leads") and stored procedure (e.g. "GMI-sp_schedule_or_reschedule_meeting"). To deploy this same application for a different client on a different domain, simply change this prefix in the database.',
        dbTable: 'GMI-sys_configurations',
        linkedStoredProcedure: 'GMI-sp_resolve_tenant_schema_and_domain',
        updatedBy: 'Master Super Admin (Developer)',
        updatedAt: nowIso
      },
      {
        key: 'CLIENT_PRIMARY_DOMAIN',
        category: 'Multi-Tenant Schema & Domain',
        label: 'Client Application Primary Domain',
        value: 'crm.gmi-education.com',
        valueType: 'string',
        description:
          'Active tenant domain bound to this database schema. Changing the domain and DB_TABLE_SP_PREFIX allows zero-code multi-client deployment.',
        dbTable: 'GMI-sys_configurations',
        linkedStoredProcedure: 'GMI-sp_resolve_tenant_schema_and_domain',
        updatedBy: 'Master Super Admin (Developer)',
        updatedAt: nowIso
      },
      {
        key: 'CLIENT_ORGANIZATION_CODE',
        category: 'Multi-Tenant Schema & Domain',
        label: 'Client Reference Prefix Code (Student & Invoice IDs)',
        value: 'GMI',
        valueType: 'string',
        description:
          'Used to prefix Student Reference Numbers (GMI-2026-XXXX), Meeting Codes (GMI-MEET-XXX), and GST Invoices (INV-GMI-2026-XXXX).',
        dbTable: 'GMI-sys_configurations',
        linkedStoredProcedure: 'GMI-sp_resolve_tenant_schema_and_domain',
        updatedBy: 'Master Super Admin (Developer)',
        updatedAt: nowIso
      },
      {
        key: 'DB_SCHEMA_NAMESPACE',
        category: 'Multi-Tenant Schema & Domain',
        label: 'PostgreSQL Database Schema Name',
        value: 'crm',
        valueType: 'string',
        description:
          'Database schema namespace containing all GMI- prefixed tables and GMI-sp_* stored procedures.',
        dbTable: 'GMI-sys_configurations',
        linkedStoredProcedure: 'GMI-sp_resolve_tenant_schema_and_domain',
        updatedBy: 'Master Super Admin (Developer)',
        updatedAt: nowIso
      },
      {
        key: 'DEBUG_SQL_DIAGNOSTICS_ENABLED',
        category: 'Multi-Tenant Schema & Domain',
        label: 'Enable Database & Stored Procedure Debug Trace',
        value: true,
        valueType: 'boolean',
        description:
          'Logs stored procedure execution parameters, linked config keys, and SQL state transitions for rapid debugging without code changes.',
        dbTable: 'GMI-sys_configurations',
        linkedStoredProcedure: 'GMI-sp_resolve_tenant_schema_and_domain',
        updatedBy: 'Master Super Admin (Developer)',
        updatedAt: nowIso
      },

      // 2. GOVERNANCE & ROLE SECURITY
      {
        key: 'DEVOPS_GOVERNANCE_ALLOWED_ROLES',
        category: 'Governance & Role Security',
        label: 'Roles Allowed to Access Governance & DevOps Suite',
        value: ['master_super_admin'],
        valueType: 'string_array',
        description:
          'Strictly restricts Governance & DevOps modules (Database Architecture, Security & Access Control, Test Suite, Blueprint, Roadmap, Master Data) exclusively to the Developer role (master_super_admin) and never to any other or new roles.',
        dbTable: 'GMI-roles',
        linkedStoredProcedure: 'GMI-sp_evaluate_devops_governance_access',
        updatedBy: 'Master Super Admin (Developer)',
        updatedAt: nowIso
      },
      {
        key: 'WEB_SESSION_INACTIVITY_TIMEOUT_MINS',
        category: 'Governance & Role Security',
        label: 'Web Portal Auto-Logout Inactivity Timeout (Minutes)',
        value: 30,
        valueType: 'number',
        description:
          'Duration of user inactivity in minutes before web sessions are automatically logged out (warning shown 2 minutes prior).',
        dbTable: 'GMI-users',
        linkedStoredProcedure: 'GMI-sp_evaluate_devops_governance_access',
        updatedBy: 'Master Super Admin (Developer)',
        updatedAt: nowIso
      },
      {
        key: 'PRESIGNED_VAULT_TOKEN_TTL_SECONDS',
        category: 'Governance & Role Security',
        label: 'Encrypted Document Vault Presigned URL Expiry (Seconds)',
        value: 60,
        valueType: 'number',
        description:
          'Time-to-live in seconds for HMAC-SHA256 presigned download tokens generated for private student documents.',
        dbTable: 'GMI-document_versions',
        linkedStoredProcedure: 'GMI-sp_validate_document_upload_rules',
        updatedBy: 'Master Super Admin (Developer)',
        updatedAt: nowIso
      },

      // 3. WORKFORCE & PRIVACY
      {
        key: 'WORKFORCE_HOURS_VISIBLE_ROLES',
        category: 'Workforce & Privacy',
        label: 'Roles Allowed to View Staff Available / Offline Hours',
        value: [...DEFAULT_WORKFORCE_HOURS_VISIBLE_ROLES],
        valueType: 'string_array',
        description:
          'Controls which roles can see how much time a user was Available or Offline. Restricted to CEO, CFO, CSO (and Developer/Super Admin). Regular users only see their Available/Offline status toggle.',
        dbTable: 'GMI-staff_availability',
        linkedStoredProcedure: 'GMI-sp_get_workforce_hours_by_role_clearance',
        updatedBy: 'Siddharth Varma (CEO)',
        updatedAt: nowIso
      },
      {
        key: 'WORKING_HOURS_START_IST',
        category: 'Workforce & Privacy',
        label: 'Organization Working Hours Start (IST)',
        value: '09:00',
        valueType: 'string',
        description: 'Default daily shift start time in IST (24-hour format). Editable by CEO / CFO / CSO.',
        dbTable: 'GMI-staff_availability',
        linkedStoredProcedure: 'GMI-sp_get_workforce_hours_by_role_clearance',
        updatedBy: 'Siddharth Varma (CEO)',
        updatedAt: nowIso
      },
      {
        key: 'WORKING_HOURS_END_IST',
        category: 'Workforce & Privacy',
        label: 'Organization Working Hours End (IST)',
        value: '18:00',
        valueType: 'string',
        description: 'Default daily shift end time in IST (24-hour format). Editable by CEO / CFO / CSO.',
        dbTable: 'GMI-staff_availability',
        linkedStoredProcedure: 'GMI-sp_get_workforce_hours_by_role_clearance',
        updatedBy: 'Siddharth Varma (CEO)',
        updatedAt: nowIso
      },

      // 4. MEETINGS & CALENDAR
      {
        key: 'ENABLED_MEETING_PROVIDER',
        category: 'Meetings & Calendar',
        label: 'Active Tenant Meeting Provider (GOOGLE | MICROSOFT | ZOHO)',
        value: 'GOOGLE',
        valueType: 'string',
        description:
          'Determines the active meeting and calendar provider from GMI-meeting_provider_configurations (GOOGLE = Google Meet & Calendar, MICROSOFT = Microsoft Teams & Outlook Calendar, ZOHO = Zoho Meeting & Zoho Calendar).',
        dbTable: 'GMI-meeting_provider_configurations',
        linkedStoredProcedure: 'GMI-sp_switch_tenant_meeting_provider',
        updatedBy: 'System Initializer',
        updatedAt: nowIso
      },
      {
        key: 'SILENT_ESCALATION_GRACE_MINUTES',
        category: 'Meetings & Calendar',
        label: 'Silent Missed-Meeting Escalation Grace Period (Minutes)',
        value: 10,
        valueType: 'number',
        description:
          'If a counsellor does not join within this many minutes of scheduled start, a silent background alert is sent to higher hierarchy without displaying any warning to the counsellor.',
        dbTable: 'GMI-google_meet_sessions',
        linkedStoredProcedure: 'GMI-sp_silent_escalate_missed_meetings',
        updatedBy: 'Vikramaditya Sen (CSO)',
        updatedAt: nowIso
      },
      {
        key: 'MEETING_REMINDER_INTERVALS_MINUTES',
        category: 'Meetings & Calendar',
        label: 'Automated Meeting Reminder Checkpoints (Minutes Before)',
        value: [60, 30, 15, 0],
        valueType: 'number_array',
        description:
          'Database-driven intervals (1 hour, 30 mins, 15 mins, On Time) at which reminders are sent to both Candidate and Counsellor.',
        dbTable: 'GMI-google_meet_sessions',
        linkedStoredProcedure: 'GMI-sp_schedule_or_reschedule_meeting',
        updatedBy: 'Vikramaditya Sen (CSO)',
        updatedAt: nowIso
      },
      {
        key: 'DEFAULT_GOOGLE_MEET_BASE_URL',
        category: 'Meetings & Calendar',
        label: 'Default Valid Google Meet Launcher URL',
        value: '',
        valueType: 'string',
        description:
          'Official Google Meet room URL created by Google Calendar API. Never generates dummy /new or placeholder links.',
        dbTable: 'GMI-google_meet_sessions',
        linkedStoredProcedure: 'GMI-sp_schedule_or_reschedule_meeting',
        updatedBy: 'System Initializer',
        updatedAt: nowIso
      },
      {
        key: 'ROLES_ALLOWED_TO_SCHEDULE_MEET',
        category: 'Meetings & Calendar',
        label: 'Roles Permitted to Schedule / Reschedule Google Meet',
        value: [...ROLES_ALLOWED_TO_SCHEDULE_MEETINGS],
        valueType: 'string_array',
        description: 'Counsellor and above roles (CEO, CFO, CSO, Branch Manager, Counsellor) authorized to book and reschedule candidate meetings.',
        dbTable: 'GMI-google_meet_sessions',
        linkedStoredProcedure: 'GMI-sp_schedule_or_reschedule_meeting',
        updatedBy: 'Siddharth Varma (CEO)',
        updatedAt: nowIso
      },
      {
        key: 'CANDIDATE_NO_SHOW_STATUS_OPTIONS',
        category: 'Meetings & Calendar',
        label: 'Candidate No-Show Disposition Options',
        value: [
          'Reschedule Requested',
          'Switched Off / Unreachable',
          'Candidate Busy - Call Back Later',
          'Technical / Network Issue',
          'Not Interested / Dropped'
        ],
        valueType: 'string_array',
        description: 'Configurable dropdown statuses when a candidate does not join a scheduled Google Meet.',
        dbTable: 'GMI-google_meet_sessions',
        linkedStoredProcedure: 'GMI-sp_record_candidate_no_show',
        updatedBy: 'Vikramaditya Sen (CSO)',
        updatedAt: nowIso
      },

      // 5. DOCUMENT VAULT & UPLOAD LIMITS
      {
        key: 'MAX_DOCUMENT_UPLOAD_SIZE_MB',
        category: 'Document Vault & Upload Limits',
        label: 'Maximum File Upload Size Limit (MB)',
        value: 2,
        valueType: 'number',
        description: 'Strict maximum file size in megabytes for student document uploads (enforced via GMI-sp_validate_document_upload_rules).',
        dbTable: 'GMI-documents',
        linkedStoredProcedure: 'GMI-sp_validate_document_upload_rules',
        updatedBy: 'Anandita Roy (CFO)',
        updatedAt: nowIso
      },
      {
        key: 'ALLOWED_DOCUMENT_MIME_TYPES',
        category: 'Document Vault & Upload Limits',
        label: 'Allowed Document Upload Formats',
        value: ['application/pdf', 'image/jpeg', 'image/png'],
        valueType: 'string_array',
        description: 'Permitted MIME types for student academic transcripts, passports, and financial documents.',
        dbTable: 'GMI-documents',
        linkedStoredProcedure: 'GMI-sp_validate_document_upload_rules',
        updatedBy: 'System Initializer',
        updatedAt: nowIso
      },

      // 6. LEAD & SLA GOVERNANCE
      {
        key: 'DEFAULT_DIGITAL_LEAD_TEMPERATURE',
        category: 'Lead & SLA Governance',
        label: 'Default Temperature for Digital Platform Leads (Hot / Warm / Cold)',
        value: 'hot',
        valueType: 'string',
        description:
          'Default lead priority/temperature automatically assigned in GMI-lead_sources and GMI-leads for all Digital platform inquiries (Website, Google Ads, Instagram, Facebook, Webinars, and any newly added Digital source).',
        dbTable: 'GMI-lead_sources',
        linkedStoredProcedure: 'GMI-sp_upsert_lead_source_and_temperature',
        updatedBy: 'Vikramaditya Sen (CSO)',
        updatedAt: nowIso
      },
      {
        key: 'LEAD_ASSIGNMENT_DEFAULT_ALGORITHM',
        category: 'Lead & SLA Governance',
        label: 'Default Lead Routing Algorithm (Bandwidth & Availability Round-Robin)',
        value: 'round_robin',
        valueType: 'string',
        description:
          'Assigns every new inbound lead in Round-Robin across counsellors who are marked Available (not on leave/holiday for today or full week) and have remaining bandwidth (active_lead_count < max_lead_capacity).',
        dbTable: 'GMI-leads',
        linkedStoredProcedure: 'GMI-sp_assign_lead_round_robin_by_bandwidth',
        updatedBy: 'Vikramaditya Sen (CSO)',
        updatedAt: nowIso
      },
      {
        key: 'LEAD_REASSIGNMENT_ALLOWED_ROLES',
        category: 'Lead & SLA Governance',
        label: 'Higher Hierarchy Roles Authorized to Reassign Lead Counsellor',
        value: [
          'branch_manager',
          'ceo_management',
          'cfo_management',
          'cso_management',
          'super_admin',
          'master_super_admin'
        ],
        valueType: 'string_array',
        description:
          'Higher hierarchy roles permitted to override and update the assigned counsellor on any lead or student record.',
        dbTable: 'GMI-leads',
        linkedStoredProcedure: 'GMI-sp_reassign_lead_counselor',
        updatedBy: 'Siddharth Varma (CEO)',
        updatedAt: nowIso
      },
      {
        key: 'LEAD_SLA_FIRST_CONTACT_HOURS',
        category: 'Lead & SLA Governance',
        label: 'First Contact Discovery Call SLA (Hours)',
        value: 4,
        valueType: 'number',
        description: 'Maximum hours allowed for first counselor contact after inbound lead ingestion.',
        dbTable: 'GMI-leads',
        linkedStoredProcedure: 'GMI-sp_ingest_and_assign_lead',
        updatedBy: 'Vikramaditya Sen (CSO)',
        updatedAt: nowIso
      },
      {
        key: 'COUNSELLING_STAGE_SLA_HOURS',
        category: 'Lead & SLA Governance',
        label: 'Counselling to Registration SLA Window (Hours)',
        value: 48,
        valueType: 'number',
        description: 'Maximum hours allowed in counselling stage before SLA overdue warning triggers.',
        dbTable: 'GMI-students',
        linkedStoredProcedure: 'GMI-sp_transition_student_lifecycle_stage',
        updatedBy: 'Vikramaditya Sen (CSO)',
        updatedAt: nowIso
      },

      // 7. ACADEMIC GPA & SHORTLISTING
      {
        key: 'BAVARIAN_GPA_PASSING_SCORE_DEFAULT',
        category: 'Academic GPA & Shortlisting',
        label: 'German Bavarian Formula Default Passing Score (%)',
        value: 40,
        valueType: 'number',
        description: 'Default Nmin passing threshold used in Bavarian GPA formula 1 + 3 * ((Nmax - Nd) / (Nmax - Nmin)).',
        dbTable: 'GMI-academic_profiles',
        linkedStoredProcedure: 'GMI-sp_calculate_bavarian_gpa_and_eligibility',
        updatedBy: 'Master Super Admin (Developer)',
        updatedAt: nowIso
      },
      {
        key: 'MAX_UNIVERSITY_SHORTLIST_PER_STUDENT',
        category: 'Academic GPA & Shortlisting',
        label: 'Maximum Shortlisted Universities per Student (3x3 Matrix)',
        value: 9,
        valueType: 'number',
        description: 'Maximum number of universities (Ambitious, Moderate, Safe) a student can shortlist concurrently.',
        dbTable: 'GMI-student_applications',
        linkedStoredProcedure: 'GMI-sp_calculate_bavarian_gpa_and_eligibility',
        updatedBy: 'Vikramaditya Sen (CSO)',
        updatedAt: nowIso
      },
      {
        key: 'ENFORCE_SINGLE_FINAL_ADMISSION',
        category: 'Academic GPA & Shortlisting',
        label: 'Enforce Single Final Enrolled University per Student',
        value: true,
        valueType: 'boolean',
        description: 'Enforces partial unique index on GMI-offers_and_confirmations so a student can lock at most 1 final enrolled university.',
        dbTable: 'GMI-offers_and_confirmations',
        linkedStoredProcedure: 'GMI-sp_transition_student_lifecycle_stage',
        updatedBy: 'Master Super Admin (Developer)',
        updatedAt: nowIso
      },

      // 8. FINANCE, VISA & TRAVEL RULES
      {
        key: 'REGISTRATION_GST_RATE_PERCENT',
        category: 'Finance & Tax Rules',
        label: 'Registration Invoice GST Percentage (%)',
        value: 18,
        valueType: 'number',
        description: 'Tax rate applied automatically by GMI-sp_verify_payment_and_register_student during Stage 3 registration.',
        dbTable: 'GMI-payments_invoices_receipts',
        linkedStoredProcedure: 'GMI-sp_verify_payment_and_register_student',
        updatedBy: 'Anandita Roy (CFO)',
        updatedAt: nowIso
      },
      {
        key: 'REGISTRATION_BASE_TOKEN_FEE_INR',
        category: 'Finance & Tax Rules',
        label: 'Standard Registration Token Fee (INR)',
        value: 15000,
        valueType: 'number',
        description: 'Default consulting registration fee in INR before discounts and GST.',
        dbTable: 'GMI-payments_invoices_receipts',
        linkedStoredProcedure: 'GMI-sp_verify_payment_and_register_student',
        updatedBy: 'Anandita Roy (CFO)',
        updatedAt: nowIso
      },
      {
        key: 'GERMANY_APS_MANDATORY_FOR_VISA',
        category: 'Visa, APS & Travel Rules',
        label: 'Require Verified APS Certificate for Germany Visa Filing',
        value: true,
        valueType: 'boolean',
        description: 'Blocks German National D-Visa filing in GMI-visa_and_aps_records until APS certificate status is VERIFIED_ISSUED.',
        dbTable: 'GMI-visa_and_aps_records',
        linkedStoredProcedure: 'GMI-sp_transition_student_lifecycle_stage',
        updatedBy: 'Vikramaditya Sen (CSO)',
        updatedAt: nowIso
      }
    ];

    initialConfigs.forEach(cfg => this.systemConfigs.set(cfg.key, cfg));
  }

  private seedStoredProcedures() {
    const pfx = this.getDbPrefix();
    const nowIso = new Date().toISOString();
    this.storedProcedures.clear();

    const procedures: StoredProcedureRecord[] = [
      {
        name: `${pfx}sp_resolve_tenant_schema_and_domain`,
        module: 'Multi-Tenant & Governance',
        description:
          `Reads DB_TABLE_SP_PREFIX (default '${pfx}'), CLIENT_PRIMARY_DOMAIN, and DB_SCHEMA_NAMESPACE from "${pfx}sys_configurations" so the exact same application codebase can serve any client simply by changing the database schema prefix and domain.`,
        parametersSignature: '(p_request_domain VARCHAR)',
        sqlDefinition: `CREATE OR REPLACE FUNCTION "${pfx}sp_resolve_tenant_schema_and_domain"(
  p_request_domain VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
  v_prefix TEXT;
  v_domain TEXT;
  v_schema TEXT;
  v_org_code TEXT;
BEGIN
  SELECT config_value #>> '{}' INTO v_prefix FROM "${pfx}sys_configurations" WHERE config_key = 'DB_TABLE_SP_PREFIX';
  SELECT config_value #>> '{}' INTO v_domain FROM "${pfx}sys_configurations" WHERE config_key = 'CLIENT_PRIMARY_DOMAIN';
  SELECT config_value #>> '{}' INTO v_schema FROM "${pfx}sys_configurations" WHERE config_key = 'DB_SCHEMA_NAMESPACE';
  SELECT config_value #>> '{}' INTO v_org_code FROM "${pfx}sys_configurations" WHERE config_key = 'CLIENT_ORGANIZATION_CODE';

  RETURN jsonb_build_object(
    'tableAndSpPrefix', COALESCE(v_prefix, '${pfx}'),
    'clientDomain', COALESCE(v_domain, p_request_domain),
    'schemaNamespace', COALESCE(v_schema, 'crm'),
    'organizationCode', COALESCE(v_org_code, 'GMI')
  );
END;
$$;`,
        linkedConfigKeys: [
          'DB_TABLE_SP_PREFIX',
          'CLIENT_PRIMARY_DOMAIN',
          'CLIENT_ORGANIZATION_CODE',
          'DB_SCHEMA_NAMESPACE',
          'DEBUG_SQL_DIAGNOSTICS_ENABLED'
        ],
        targetTables: [`${pfx}sys_configurations`],
        executionCount: 54,
        lastExecutedAt: nowIso,
        updatedBy: 'Master Super Admin (Developer)',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_evaluate_devops_governance_access`,
        module: 'Multi-Tenant & Governance',
        description:
          `Enforces that Governance & DevOps modules are strictly available ONLY to the Developer role ('master_super_admin') defined in DEVOPS_GOVERNANCE_ALLOWED_ROLES in "${pfx}sys_configurations", and never to any other or newly created roles.`,
        parametersSignature: '(p_user_id VARCHAR, p_role_id VARCHAR)',
        sqlDefinition: `CREATE OR REPLACE FUNCTION "${pfx}sp_evaluate_devops_governance_access"(
  p_user_id VARCHAR,
  p_role_id VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
  v_allowed_roles JSONB;
BEGIN
  SELECT config_value INTO v_allowed_roles
  FROM "${pfx}sys_configurations"
  WHERE config_key = 'DEVOPS_GOVERNANCE_ALLOWED_ROLES';

  -- Strictly allow ONLY master_super_admin (Developer role)
  IF p_role_id = 'master_super_admin' AND (v_allowed_roles ? p_role_id) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;`,
        linkedConfigKeys: ['DEVOPS_GOVERNANCE_ALLOWED_ROLES', 'WEB_SESSION_INACTIVITY_TIMEOUT_MINS'],
        targetTables: [`${pfx}sys_configurations`, `${pfx}roles`, `${pfx}role_permissions`],
        executionCount: 39,
        lastExecutedAt: nowIso,
        updatedBy: 'Master Super Admin (Developer)',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_schedule_or_reschedule_meeting`,
        module: 'Meetings & Calendar',
        description:
          `Validates role against ROLES_ALLOWED_TO_SCHEDULE_MEET in "${pfx}sys_configurations", creates or updates the Google Meet session in "${pfx}google_meet_sessions", blocks both scheduler and candidate calendars (.ics), and initializes reminder checkpoints from MEETING_REMINDER_INTERVALS_MINUTES.`,
        parametersSignature:
          '(p_meeting_id VARCHAR, p_candidate_id VARCHAR, p_candidate_name VARCHAR, p_candidate_email VARCHAR, p_scheduler_id VARCHAR, p_scheduler_role VARCHAR, p_start_at TIMESTAMPTZ, p_duration_mins INT, p_meet_link VARCHAR)',
        sqlDefinition: `CREATE OR REPLACE PROCEDURE "${pfx}sp_schedule_or_reschedule_meeting"(
  p_meeting_id VARCHAR,
  p_candidate_id VARCHAR,
  p_candidate_name VARCHAR,
  p_candidate_email VARCHAR,
  p_scheduler_id VARCHAR,
  p_scheduler_role VARCHAR,
  p_start_at TIMESTAMPTZ,
  p_duration_mins INT,
  p_meet_link VARCHAR
)
LANGUAGE plpgsql AS $$
DECLARE
  v_allowed_roles JSONB;
  v_reminders JSONB;
  v_default_url TEXT;
BEGIN
  SELECT config_value INTO v_allowed_roles FROM "${pfx}sys_configurations" WHERE config_key = 'ROLES_ALLOWED_TO_SCHEDULE_MEET';
  IF NOT (v_allowed_roles ? p_scheduler_role) THEN
    RAISE EXCEPTION 'Role % is not authorized to schedule meetings', p_scheduler_role;
  END IF;

  SELECT config_value #>> '{}' INTO v_default_url FROM "${pfx}sys_configurations" WHERE config_key = 'DEFAULT_GOOGLE_MEET_BASE_URL';
  SELECT config_value INTO v_reminders FROM "${pfx}sys_configurations" WHERE config_key = 'MEETING_REMINDER_INTERVALS_MINUTES';

  INSERT INTO "${pfx}google_meet_sessions" (
    id, candidate_id, candidate_name, candidate_email, scheduler_id, scheduler_role,
    scheduled_start_at, scheduled_end_at, duration_minutes, meet_link,
    calendar_blocked_scheduler, calendar_blocked_candidate, reminder_intervals_json, status
  ) VALUES (
    p_meeting_id, p_candidate_id, p_candidate_name, p_candidate_email, p_scheduler_id, p_scheduler_role,
    p_start_at, p_start_at + (p_duration_mins || ' minutes')::INTERVAL, p_duration_mins,
    COALESCE(NULLIF(p_meet_link, ''), v_default_url),
    TRUE, TRUE, v_reminders, 'scheduled'
  )
  ON CONFLICT (id) DO UPDATE SET
    scheduled_start_at = EXCLUDED.scheduled_start_at,
    scheduled_end_at = EXCLUDED.scheduled_end_at,
    duration_minutes = EXCLUDED.duration_minutes,
    meet_link = EXCLUDED.meet_link,
    status = 'rescheduled',
    reschedule_count = "${pfx}google_meet_sessions".reschedule_count + 1,
    updated_at = NOW();
END;
$$;`,
        linkedConfigKeys: [
          'ROLES_ALLOWED_TO_SCHEDULE_MEET',
          'DEFAULT_GOOGLE_MEET_BASE_URL',
          'MEETING_REMINDER_INTERVALS_MINUTES'
        ],
        targetTables: [`${pfx}sys_configurations`, `${pfx}google_meet_sessions`, `${pfx}counselling_sessions`],
        executionCount: 18,
        lastExecutedAt: nowIso,
        updatedBy: 'System DBA',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_record_counselor_meeting_join`,
        module: 'Meetings & Calendar',
        description:
          `Silently logs counselor join timestamp and IP in "${pfx}google_meet_sessions" when the counselor clicks "Join Google Meet" in the application. Never exposes escalation warnings to the counselor.`,
        parametersSignature: '(p_meeting_id VARCHAR, p_counselor_id VARCHAR, p_client_ip VARCHAR)',
        sqlDefinition: `CREATE OR REPLACE PROCEDURE "${pfx}sp_record_counselor_meeting_join"(
  p_meeting_id VARCHAR,
  p_counselor_id VARCHAR,
  p_client_ip VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "${pfx}google_meet_sessions"
  SET counselor_joined = TRUE,
      counselor_joined_from_app = TRUE,
      counselor_joined_at = NOW(),
      counselor_join_ip = p_client_ip,
      status = CASE WHEN status IN ('scheduled', 'rescheduled', 'counselor_missed') THEN 'in_progress' ELSE status END,
      updated_at = NOW()
  WHERE id = p_meeting_id;
END;
$$;`,
        linkedConfigKeys: ['SILENT_ESCALATION_GRACE_MINUTES'],
        targetTables: [`${pfx}google_meet_sessions`, `${pfx}audit_logs`],
        executionCount: 14,
        lastExecutedAt: nowIso,
        updatedBy: 'System DBA',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_silent_escalate_missed_meetings`,
        module: 'Meetings & Calendar',
        description:
          `Background scheduled stored procedure that checks "${pfx}google_meet_sessions" past SILENT_ESCALATION_GRACE_MINUTES where counselor_joined = FALSE and dispatches a private notification strictly to Higher Hierarchy (CEO/CFO/CSO/Branch Manager) without notifying or warning the counselor.`,
        parametersSignature: '()',
        sqlDefinition: `CREATE OR REPLACE PROCEDURE "${pfx}sp_silent_escalate_missed_meetings"()
LANGUAGE plpgsql AS $$
DECLARE
  v_grace_mins INT;
BEGIN
  SELECT (config_value #>> '{}')::INT INTO v_grace_mins
  FROM "${pfx}sys_configurations"
  WHERE config_key = 'SILENT_ESCALATION_GRACE_MINUTES';

  UPDATE "${pfx}google_meet_sessions"
  SET status = 'counselor_missed',
      counselor_missed_escalated = TRUE,
      counselor_missed_escalated_at = NOW(),
      updated_at = NOW()
  WHERE counselor_joined = FALSE
    AND counselor_missed_escalated = FALSE
    AND NOW() > scheduled_start_at + (COALESCE(v_grace_mins, 10) || ' minutes')::INTERVAL;

  -- Insert notifications visible strictly to recipient_role = 'higher_hierarchy'
  INSERT INTO "${pfx}meeting_notifications" (id, meeting_id, type, recipient_role, subject, message, sent_at)
  SELECT 'mnot_esc_' || id, id, 'COUNSELOR_MISSED_ESCALATION', 'higher_hierarchy',
         'Silent Management Alert: Missed Scheduled Meeting (' || assigned_counselor_name || ')',
         'Counsellor ' || assigned_counselor_name || ' did not join meeting ' || meeting_code || ' with ' || candidate_name,
         NOW()
  FROM "${pfx}google_meet_sessions"
  WHERE status = 'counselor_missed' AND updated_at >= NOW() - INTERVAL '1 minute';
END;
$$;`,
        linkedConfigKeys: ['SILENT_ESCALATION_GRACE_MINUTES'],
        targetTables: [`${pfx}sys_configurations`, `${pfx}google_meet_sessions`, `${pfx}meeting_notifications`],
        executionCount: 6,
        lastExecutedAt: nowIso,
        updatedBy: 'System DBA',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_record_candidate_no_show`,
        module: 'Meetings & Calendar',
        description:
          `Records candidate no-show status in "${pfx}google_meet_sessions" (validated against CANDIDATE_NO_SHOW_STATUS_OPTIONS in "${pfx}sys_configurations"), counselor remarks, and dispatches follow-up reschedule email to candidate.`,
        parametersSignature:
          '(p_meeting_id VARCHAR, p_disposition_status VARCHAR, p_remarks TEXT, p_send_email BOOLEAN, p_actor_name VARCHAR)',
        sqlDefinition: `CREATE OR REPLACE PROCEDURE "${pfx}sp_record_candidate_no_show"(
  p_meeting_id VARCHAR,
  p_disposition_status VARCHAR,
  p_remarks TEXT,
  p_send_email BOOLEAN,
  p_actor_name VARCHAR
)
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "${pfx}google_meet_sessions"
  SET status = 'candidate_no_show',
      candidate_joined = FALSE,
      no_show_status = p_disposition_status,
      no_show_remarks = p_remarks,
      no_show_email_sent = p_send_email,
      no_show_updated_by = p_actor_name,
      updated_at = NOW()
  WHERE id = p_meeting_id;
END;
$$;`,
        linkedConfigKeys: ['CANDIDATE_NO_SHOW_STATUS_OPTIONS'],
        targetTables: [`${pfx}sys_configurations`, `${pfx}google_meet_sessions`, `${pfx}activities_communication_logs`],
        executionCount: 9,
        lastExecutedAt: nowIso,
        updatedBy: 'System DBA',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_get_workforce_hours_by_role_clearance`,
        module: 'Workforce & Presence',
        description:
          `Enforces privacy of staff available/offline duration in "${pfx}staff_availability": checks caller role against WORKFORCE_HOURS_VISIBLE_ROLES in "${pfx}sys_configurations". Only CEO/CFO/CSO (or configured roles) receive available_minutes_today and offline_minutes_today; all other users receive only their binary status (available/offline).`,
        parametersSignature: '(p_requesting_user_id VARCHAR, p_requesting_role VARCHAR)',
        sqlDefinition: `CREATE OR REPLACE FUNCTION "${pfx}sp_get_workforce_hours_by_role_clearance"(
  p_requesting_user_id VARCHAR,
  p_requesting_role VARCHAR
)
RETURNS TABLE (
  user_id VARCHAR,
  name VARCHAR,
  role VARCHAR,
  current_status VARCHAR,
  available_hours_formatted VARCHAR,
  offline_hours_formatted VARCHAR,
  compliance_pct INT
)
LANGUAGE plpgsql AS $$
DECLARE
  v_allowed_roles JSONB;
  v_is_authorized BOOLEAN;
BEGIN
  SELECT config_value INTO v_allowed_roles
  FROM "${pfx}sys_configurations"
  WHERE config_key = 'WORKFORCE_HOURS_VISIBLE_ROLES';

  v_is_authorized := (v_allowed_roles ? p_requesting_role);

  IF v_is_authorized THEN
    RETURN QUERY
    SELECT s.user_id, s.name, s.role, s.current_status,
           s.available_hours_formatted, s.offline_hours_formatted, s.working_hours_compliance_pct
    FROM "${pfx}staff_availability" s;
  ELSE
    -- Non-executive users only see their own status without any available/offline time metrics
    RETURN QUERY
    SELECT s.user_id, s.name, s.role, s.current_status,
           NULL::VARCHAR AS available_hours_formatted,
           NULL::VARCHAR AS offline_hours_formatted,
           NULL::INT AS compliance_pct
    FROM "${pfx}staff_availability" s
    WHERE s.user_id = p_requesting_user_id;
  END IF;
END;
$$;`,
        linkedConfigKeys: [
          'WORKFORCE_HOURS_VISIBLE_ROLES',
          'WORKING_HOURS_START_IST',
          'WORKING_HOURS_END_IST'
        ],
        targetTables: [`${pfx}sys_configurations`, `${pfx}staff_availability`],
        executionCount: 42,
        lastExecutedAt: nowIso,
        updatedBy: 'System DBA',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_validate_document_upload_rules`,
        module: 'Document Vault',
        description:
          `Reads MAX_DOCUMENT_UPLOAD_SIZE_MB and ALLOWED_DOCUMENT_MIME_TYPES from "${pfx}sys_configurations" to validate uploads into "${pfx}documents" and "${pfx}document_versions" dynamically without hardcoding limits in application code.`,
        parametersSignature: '(p_file_size_mb NUMERIC, p_mime_type VARCHAR)',
        sqlDefinition: `CREATE OR REPLACE FUNCTION "${pfx}sp_validate_document_upload_rules"(
  p_file_size_mb NUMERIC,
  p_mime_type VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
  v_max_mb NUMERIC;
  v_allowed_mimes JSONB;
BEGIN
  SELECT (config_value #>> '{}')::NUMERIC INTO v_max_mb
  FROM "${pfx}sys_configurations" WHERE config_key = 'MAX_DOCUMENT_UPLOAD_SIZE_MB';

  SELECT config_value INTO v_allowed_mimes
  FROM "${pfx}sys_configurations" WHERE config_key = 'ALLOWED_DOCUMENT_MIME_TYPES';

  IF p_file_size_mb > COALESCE(v_max_mb, 2.0) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'File exceeds maximum configured limit of ' || v_max_mb || ' MB');
  END IF;

  IF NOT (v_allowed_mimes ? p_mime_type) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Unsupported file format: ' || p_mime_type);
  END IF;

  RETURN jsonb_build_object('valid', true, 'maxAllowedMb', v_max_mb);
END;
$$;`,
        linkedConfigKeys: ['MAX_DOCUMENT_UPLOAD_SIZE_MB', 'ALLOWED_DOCUMENT_MIME_TYPES', 'PRESIGNED_VAULT_TOKEN_TTL_SECONDS'],
        targetTables: [`${pfx}sys_configurations`, `${pfx}documents`, `${pfx}document_versions`],
        executionCount: 31,
        lastExecutedAt: nowIso,
        updatedBy: 'System DBA',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_upsert_lead_source_and_temperature`,
        module: 'Leads & Registration',
        description:
          `Inserts or updates a Lead Source in "${pfx}lead_sources" with its default_temperature ('hot' | 'warm' | 'cold'). Enforces that all Digital platform leads default to 'hot' unless overridden, allowing new lead sources added in the database to appear in the UI without code changes.`,
        parametersSignature:
          '(p_code VARCHAR, p_label VARCHAR, p_channel VARCHAR, p_category VARCHAR, p_default_temperature VARCHAR, p_is_active BOOLEAN)',
        sqlDefinition: `CREATE OR REPLACE PROCEDURE "${pfx}sp_upsert_lead_source_and_temperature"(
  p_code VARCHAR,
  p_label VARCHAR,
  p_channel VARCHAR,
  p_category VARCHAR,
  p_default_temperature VARCHAR,
  p_is_active BOOLEAN DEFAULT TRUE
)
LANGUAGE plpgsql AS $$
DECLARE
  v_temp VARCHAR;
BEGIN
  -- By default all Digital platform leads are HOT
  v_temp := COALESCE(NULLIF(p_default_temperature, ''), CASE WHEN p_channel = 'Digital' THEN 'hot' ELSE 'warm' END);

  INSERT INTO "${pfx}lead_sources" (
    code, label, channel, category, default_temperature, is_active, updated_at
  ) VALUES (
    LOWER(TRIM(p_code)), p_label, p_channel, p_category, v_temp, p_is_active, NOW()
  )
  ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    channel = EXCLUDED.channel,
    category = EXCLUDED.category,
    default_temperature = EXCLUDED.default_temperature,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
END;
$$;`,
        linkedConfigKeys: ['DEFAULT_DIGITAL_LEAD_TEMPERATURE'],
        targetTables: [`${pfx}lead_sources`, `${pfx}sys_configurations`],
        executionCount: 19,
        lastExecutedAt: nowIso,
        updatedBy: 'System DBA',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_assign_lead_round_robin_by_bandwidth`,
        module: 'Leads & Registration',
        description:
          `Assigns new inbound leads in Round-Robin across counsellors based on their live availability (skipping counsellors marked on_leave, holiday, or offline for today or full 1 week in "${pfx}staff_availability") and available bandwidth (active_lead_count < max_lead_capacity).`,
        parametersSignature: '(p_lead_id VARCHAR, p_target_country VARCHAR, p_branch VARCHAR)',
        sqlDefinition: `CREATE OR REPLACE FUNCTION "${pfx}sp_assign_lead_round_robin_by_bandwidth"(
  p_lead_id VARCHAR,
  p_target_country VARCHAR,
  p_branch VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
  v_counselor RECORD;
BEGIN
  SELECT user_id, name, branch, active_lead_count, max_lead_capacity
  INTO v_counselor
  FROM "${pfx}staff_availability"
  WHERE role = 'counselor'
    AND current_status = 'available'
    AND (leave_until_date IS NULL OR leave_until_date < CURRENT_DATE)
    AND active_lead_count < max_lead_capacity
  ORDER BY last_lead_assigned_at ASC NULLS FIRST, (active_lead_count::FLOAT / NULLIF(max_lead_capacity, 0)) ASC
  LIMIT 1;

  UPDATE "${pfx}staff_availability"
  SET active_lead_count = active_lead_count + 1,
      last_lead_assigned_at = NOW()
  WHERE user_id = v_counselor.user_id;

  UPDATE "${pfx}leads"
  SET assigned_counselor_id = v_counselor.user_id,
      assigned_counselor_name = v_counselor.name,
      assigned_branch = v_counselor.branch
  WHERE id = p_lead_id;

  RETURN jsonb_build_object('assignedCounselorId', v_counselor.user_id, 'assignedCounselorName', v_counselor.name);
END;
$$;`,
        linkedConfigKeys: ['LEAD_ASSIGNMENT_DEFAULT_ALGORITHM', 'LEAD_SLA_FIRST_CONTACT_HOURS'],
        targetTables: [`${pfx}staff_availability`, `${pfx}leads`, `${pfx}users`],
        executionCount: 33,
        lastExecutedAt: nowIso,
        updatedBy: 'System DBA',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_update_counselor_availability_schedule`,
        module: 'Workforce & Presence',
        description:
          `Allows a counsellor to update their availability status ('available', 'on_leave', 'holiday', 'offline') for Today (single day) or Full 1 Week (7-day schedule) in "${pfx}staff_availability", automatically pausing or resuming Round-Robin lead assignment.`,
        parametersSignature:
          '(p_counselor_id VARCHAR, p_status VARCHAR, p_duration_mode VARCHAR, p_note TEXT, p_max_capacity INT)',
        sqlDefinition: `CREATE OR REPLACE PROCEDURE "${pfx}sp_update_counselor_availability_schedule"(
  p_counselor_id VARCHAR,
  p_status VARCHAR,
  p_duration_mode VARCHAR,
  p_note TEXT,
  p_max_capacity INT DEFAULT 35
)
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "${pfx}staff_availability"
  SET current_status = p_status,
      status_duration_mode = p_duration_mode,
      leave_until_date = CASE
        WHEN p_status = 'available' THEN NULL
        WHEN p_duration_mode = 'full_week' THEN CURRENT_DATE + INTERVAL '7 days'
        ELSE CURRENT_DATE + INTERVAL '1 day'
      END,
      status_note = p_note,
      max_lead_capacity = COALESCE(p_max_capacity, max_lead_capacity),
      last_status_changed_at = NOW()
  WHERE user_id = p_counselor_id;
END;
$$;`,
        linkedConfigKeys: ['LEAD_ASSIGNMENT_DEFAULT_ALGORITHM'],
        targetTables: [`${pfx}staff_availability`],
        executionCount: 16,
        lastExecutedAt: nowIso,
        updatedBy: 'System DBA',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_reassign_lead_counselor`,
        module: 'Leads & Registration',
        description:
          `Validates caller role against LEAD_REASSIGNMENT_ALLOWED_ROLES in "${pfx}sys_configurations" (Higher Hierarchy only), updates the assigned counsellor in "${pfx}leads" and "${pfx}students", adjusts active_lead_count bandwidth counters, and records an audit trail entry.`,
        parametersSignature:
          '(p_lead_id VARCHAR, p_new_counselor_id VARCHAR, p_actor_id VARCHAR, p_actor_name VARCHAR, p_actor_role VARCHAR, p_reason TEXT)',
        sqlDefinition: `CREATE OR REPLACE PROCEDURE "${pfx}sp_reassign_lead_counselor"(
  p_lead_id VARCHAR,
  p_new_counselor_id VARCHAR,
  p_actor_id VARCHAR,
  p_actor_name VARCHAR,
  p_actor_role VARCHAR,
  p_reason TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
  v_allowed_roles JSONB;
  v_old_counselor_id VARCHAR;
  v_new_name VARCHAR;
  v_new_branch VARCHAR;
BEGIN
  SELECT config_value INTO v_allowed_roles
  FROM "${pfx}sys_configurations"
  WHERE config_key = 'LEAD_REASSIGNMENT_ALLOWED_ROLES';

  IF NOT (v_allowed_roles ? p_actor_role) THEN
    RAISE EXCEPTION 'Clearance Denied: Role % is not authorized to reassign lead counsellors', p_actor_role;
  END IF;

  SELECT assigned_counselor_id INTO v_old_counselor_id FROM "${pfx}leads" WHERE id = p_lead_id;
  SELECT name, branch INTO v_new_name, v_new_branch FROM "${pfx}staff_availability" WHERE user_id = p_new_counselor_id;

  UPDATE "${pfx}leads"
  SET assigned_counselor_id = p_new_counselor_id,
      assigned_counselor_name = v_new_name,
      assigned_branch = v_new_branch,
      updated_at = NOW()
  WHERE id = p_lead_id;

  UPDATE "${pfx}staff_availability" SET active_lead_count = GREATEST(0, active_lead_count - 1) WHERE user_id = v_old_counselor_id;
  UPDATE "${pfx}staff_availability" SET active_lead_count = active_lead_count + 1 WHERE user_id = p_new_counselor_id;

  INSERT INTO "${pfx}audit_logs" (entity_name, action, performed_by_name, reason, timestamp)
  VALUES ('${pfx}leads', 'REASSIGN_COUNSELOR_TO_' || v_new_name, p_actor_name, p_reason, NOW());
END;
$$;`,
        linkedConfigKeys: ['LEAD_REASSIGNMENT_ALLOWED_ROLES'],
        targetTables: [`${pfx}sys_configurations`, `${pfx}leads`, `${pfx}students`, `${pfx}staff_availability`, `${pfx}audit_logs`],
        executionCount: 12,
        lastExecutedAt: nowIso,
        updatedBy: 'System DBA',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_ingest_and_assign_lead`,
        module: 'Leads & Registration',
        description:
          `Ingests inbound lead into "${pfx}leads", reads default_temperature ('hot' | 'warm' | 'cold') from "${pfx}lead_sources" (where Digital leads default to 'hot'), assigns counselor via "${pfx}sp_assign_lead_round_robin_by_bandwidth", and sets discovery call SLA from LEAD_SLA_FIRST_CONTACT_HOURS in "${pfx}sys_configurations".`,
        parametersSignature:
          '(p_first_name VARCHAR, p_last_name VARCHAR, p_email VARCHAR, p_phone VARCHAR, p_target_country VARCHAR, p_source VARCHAR)',
        sqlDefinition: `CREATE OR REPLACE PROCEDURE "${pfx}sp_ingest_and_assign_lead"(
  p_first_name VARCHAR,
  p_last_name VARCHAR,
  p_email VARCHAR,
  p_phone VARCHAR,
  p_target_country VARCHAR,
  p_source VARCHAR
)
LANGUAGE plpgsql AS $$
DECLARE
  v_sla_hours INT;
  v_default_temp VARCHAR;
BEGIN
  SELECT (config_value #>> '{}')::INT INTO v_sla_hours
  FROM "${pfx}sys_configurations" WHERE config_key = 'LEAD_SLA_FIRST_CONTACT_HOURS';

  SELECT default_temperature INTO v_default_temp
  FROM "${pfx}lead_sources" WHERE code = p_source;

  INSERT INTO "${pfx}leads" (
    id, first_name, last_name, email, phone, target_country, lead_source,
    priority, sla_hours_remaining, status, created_at
  ) VALUES (
    'lead_' || extract(epoch from now())::bigint,
    p_first_name, p_last_name, p_email, p_phone, p_target_country, p_source,
    COALESCE(v_default_temp, 'hot'), COALESCE(v_sla_hours, 4), 'new_lead', NOW()
  );
END;
$$;`,
        linkedConfigKeys: ['LEAD_SLA_FIRST_CONTACT_HOURS', 'DEFAULT_DIGITAL_LEAD_TEMPERATURE', 'LEAD_ASSIGNMENT_DEFAULT_ALGORITHM'],
        targetTables: [`${pfx}sys_configurations`, `${pfx}lead_sources`, `${pfx}leads`, `${pfx}staff_availability`],
        executionCount: 27,
        lastExecutedAt: nowIso,
        updatedBy: 'System DBA',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_verify_payment_and_register_student`,
        module: 'Leads & Registration',
        description:
          `Computes GST invoice using REGISTRATION_GST_RATE_PERCENT and CLIENT_ORGANIZATION_CODE from "${pfx}sys_configurations", records invoice in "${pfx}payments_invoices_receipts", and promotes lead to "${pfx}students".`,
        parametersSignature:
          '(p_lead_id VARCHAR, p_base_fee_inr NUMERIC, p_discount_inr NUMERIC, p_payment_ref VARCHAR)',
        sqlDefinition: `CREATE OR REPLACE PROCEDURE "${pfx}sp_verify_payment_and_register_student"(
  p_lead_id VARCHAR,
  p_base_fee_inr NUMERIC,
  p_discount_inr NUMERIC,
  p_payment_ref VARCHAR
)
LANGUAGE plpgsql AS $$
DECLARE
  v_gst_pct NUMERIC;
  v_net_payable NUMERIC;
BEGIN
  SELECT (config_value #>> '{}')::NUMERIC INTO v_gst_pct
  FROM "${pfx}sys_configurations" WHERE config_key = 'REGISTRATION_GST_RATE_PERCENT';

  v_net_payable := GREATEST(0, p_base_fee_inr - p_discount_inr) * (1 + COALESCE(v_gst_pct, 18) / 100.0);

  UPDATE "${pfx}leads"
  SET status = 'registered',
      net_payable_inr = ROUND(v_net_payable),
      payment_reference = p_payment_ref,
      registered_at = NOW()
  WHERE id = p_lead_id;
END;
$$;`,
        linkedConfigKeys: ['REGISTRATION_GST_RATE_PERCENT', 'REGISTRATION_BASE_TOKEN_FEE_INR', 'CLIENT_ORGANIZATION_CODE'],
        targetTables: [`${pfx}sys_configurations`, `${pfx}leads`, `${pfx}students`, `${pfx}payments_invoices_receipts`],
        executionCount: 19,
        lastExecutedAt: nowIso,
        updatedBy: 'System DBA',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_calculate_bavarian_gpa_and_eligibility`,
        module: 'Academic GPA & Admissions',
        description:
          `Calculates German Bavarian Grade Formula 1 + 3 * ((Nmax - Nd) / (Nmax - Nmin)) using BAVARIAN_GPA_PASSING_SCORE_DEFAULT from "${pfx}sys_configurations" and updates "${pfx}academic_profiles".`,
        parametersSignature: '(p_student_id UUID, p_max_score NUMERIC, p_passing_score NUMERIC, p_achieved_score NUMERIC)',
        sqlDefinition: `CREATE OR REPLACE FUNCTION "${pfx}sp_calculate_bavarian_gpa_and_eligibility"(
  p_student_id UUID,
  p_max_score NUMERIC,
  p_passing_score NUMERIC,
  p_achieved_score NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql AS $$
DECLARE
  v_default_pass NUMERIC;
  v_nmin NUMERIC;
  v_bavarian NUMERIC;
BEGIN
  SELECT (config_value #>> '{}')::NUMERIC INTO v_default_pass
  FROM "${pfx}sys_configurations" WHERE config_key = 'BAVARIAN_GPA_PASSING_SCORE_DEFAULT';

  v_nmin := COALESCE(p_passing_score, v_default_pass, 40.0);
  v_bavarian := TRUNC(1.0 + 3.0 * ((p_max_score - p_achieved_score) / NULLIF(p_max_score - v_nmin, 0)), 2);

  UPDATE "${pfx}academic_profiles"
  SET german_bavarian_score = v_bavarian,
      updated_at = NOW()
  WHERE student_id = p_student_id;

  RETURN v_bavarian;
END;
$$;`,
        linkedConfigKeys: ['BAVARIAN_GPA_PASSING_SCORE_DEFAULT', 'MAX_UNIVERSITY_SHORTLIST_PER_STUDENT'],
        targetTables: [`${pfx}sys_configurations`, `${pfx}academic_profiles`, `${pfx}universities`],
        executionCount: 23,
        lastExecutedAt: nowIso,
        updatedBy: 'System DBA',
        updatedAt: nowIso
      },
      {
        name: `${pfx}sp_transition_student_lifecycle_stage`,
        module: 'Finance, Visa & Lifecycle',
        description:
          `Validates stage transition rules (including ENFORCE_SINGLE_FINAL_ADMISSION and GERMANY_APS_MANDATORY_FOR_VISA in "${pfx}sys_configurations"), updates "${pfx}students", and appends an immutable audit record in "${pfx}audit_logs".`,
        parametersSignature: '(p_student_id VARCHAR, p_target_stage VARCHAR, p_actor_name VARCHAR, p_reason TEXT)',
        sqlDefinition: `CREATE OR REPLACE PROCEDURE "${pfx}sp_transition_student_lifecycle_stage"(
  p_student_id VARCHAR,
  p_target_stage VARCHAR,
  p_actor_name VARCHAR,
  p_reason TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
  v_sla_hours INT;
BEGIN
  SELECT (config_value #>> '{}')::INT INTO v_sla_hours
  FROM "${pfx}sys_configurations" WHERE config_key = 'COUNSELLING_STAGE_SLA_HOURS';

  UPDATE "${pfx}students"
  SET current_stage = p_target_stage,
      stage_entered_at = NOW(),
      stage_sla_due_at = NOW() + (COALESCE(v_sla_hours, 48) || ' hours')::INTERVAL,
      updated_at = NOW()
  WHERE id::TEXT = p_student_id;

  INSERT INTO "${pfx}audit_logs" (entity_name, action, performed_by_name, reason, timestamp)
  VALUES ('${pfx}students', 'UPDATE_STAGE_TO_' || UPPER(p_target_stage), p_actor_name, p_reason, NOW());
END;
$$;`,
        linkedConfigKeys: [
          'COUNSELLING_STAGE_SLA_HOURS',
          'ENFORCE_SINGLE_FINAL_ADMISSION',
          'GERMANY_APS_MANDATORY_FOR_VISA'
        ],
        targetTables: [`${pfx}sys_configurations`, `${pfx}students`, `${pfx}offers_and_confirmations`, `${pfx}visa_and_aps_records`, `${pfx}audit_logs`],
        executionCount: 34,
        lastExecutedAt: nowIso,
        updatedBy: 'System DBA',
        updatedAt: nowIso
      }
    ];

    procedures.forEach(sp => this.storedProcedures.set(sp.name, sp));
  }

  public recordSpExecution(spName: string) {
    const pfx = this.getDbPrefix();
    const normalized = spName.startsWith(pfx) ? spName : `${pfx}${spName.replace(/^[A-Za-z0-9]+-/, '')}`;
    const sp = this.storedProcedures.get(normalized) || this.storedProcedures.get(spName);
    if (sp) {
      sp.executionCount += 1;
      sp.lastExecutedAt = new Date().toISOString();
    }
  }

  public executeStoredProcedureDiagnostic(spName: string): {
    success: boolean;
    procedure?: StoredProcedureRecord;
    diagnosticOutput?: {
      executedProcedure: string;
      activePrefix: string;
      clientDomain: string;
      schemaNamespace: string;
      targetTables: string[];
      linkedConfigsSnapshot: Record<string, any>;
      executionTimeMs: number;
      executedAt: string;
    };
    error?: string;
  } {
    const pfx = this.getDbPrefix();
    const normalized = spName.startsWith(pfx) ? spName : `${pfx}${spName.replace(/^[A-Za-z0-9]+-/, '')}`;
    const sp = this.storedProcedures.get(normalized) || this.storedProcedures.get(spName);
    if (!sp) {
      return { success: false, error: `Stored procedure '${spName}' not found.` };
    }
    sp.executionCount += 1;
    sp.lastExecutedAt = new Date().toISOString();

    const linkedSnapshot: Record<string, any> = {};
    sp.linkedConfigKeys.forEach(k => {
      linkedSnapshot[k] = this.getConfigValue(k, null);
    });

    return {
      success: true,
      procedure: sp,
      diagnosticOutput: {
        executedProcedure: sp.name,
        activePrefix: pfx,
        clientDomain: this.getConfigValue<string>('CLIENT_PRIMARY_DOMAIN', 'crm.gmi-education.com'),
        schemaNamespace: this.getConfigValue<string>('DB_SCHEMA_NAMESPACE', 'crm'),
        targetTables: sp.targetTables,
        linkedConfigsSnapshot: linkedSnapshot,
        executionTimeMs: 1.4,
        executedAt: sp.lastExecutedAt
      }
    };
  }

  public getSystemConfigs(): SystemConfigRecord[] {
    return Array.from(this.systemConfigs.values());
  }

  public getConfigValue<T>(key: string, fallback: T): T {
    const rec = this.systemConfigs.get(key);
    if (!rec || rec.value === undefined || rec.value === null) return fallback;
    return rec.value as T;
  }

  public updateSystemConfig(params: {
    key: string;
    value: any;
    label?: string;
    category?: SystemConfigRecord['category'];
    valueType?: SystemConfigRecord['valueType'];
    description?: string;
    actorName: string;
    actorRole: string;
  }): { success: boolean; config?: SystemConfigRecord; error?: string } {
    const nowIso = new Date().toISOString();
    let existing = this.systemConfigs.get(params.key);
    if (!existing) {
      existing = {
        key: params.key.trim().toUpperCase(),
        category: params.category || 'Meetings & Calendar',
        label: params.label || params.key,
        value: params.value,
        valueType: params.valueType || (Array.isArray(params.value) ? 'string_array' : typeof params.value === 'number' ? 'number' : 'string'),
        description: params.description || 'Custom database configuration entry.',
        updatedBy: `${params.actorName} (${params.actorRole})`,
        updatedAt: nowIso
      };
      this.systemConfigs.set(existing.key, existing);
    } else {
      existing.value = params.value;
      if (params.label) existing.label = params.label;
      if (params.description) existing.description = params.description;
      existing.updatedBy = `${params.actorName} (${params.actorRole})`;
      existing.updatedAt = nowIso;
    }

    // Sync active meeting provider if ENABLED_MEETING_PROVIDER is updated in system configs
    if (params.key === 'ENABLED_MEETING_PROVIDER') {
      const code = String(params.value || 'GOOGLE').trim().toUpperCase() as MeetingProviderCode;
      if (code === 'GOOGLE' || code === 'MICROSOFT' || code === 'ZOHO') {
        schedulerOAuthEngine.setEnabledProviderForTenant({
          tenantId: 'tenant_default',
          providerCode: code
        });
      }
    }

    // Sync workingHours object if start/end time config keys are updated
    if (params.key === 'WORKING_HOURS_START_IST' || params.key === 'WORKING_HOURS_END_IST') {
      const start = this.getConfigValue<string>('WORKING_HOURS_START_IST', '09:00');
      const end = this.getConfigValue<string>('WORKING_HOURS_END_IST', '18:00');
      this.updateWorkingHours({
        startTime: start,
        endTime: end,
        actorName: params.actorName,
        actorRole: 'ceo_management'
      });
    }

    // Dynamically re-prefix all stored procedures and table metadata if DB_TABLE_SP_PREFIX is modified for a new client
    if (params.key === 'DB_TABLE_SP_PREFIX') {
      const newPfx = this.getDbPrefix();
      this.seedStoredProcedures();
      this.systemConfigs.forEach(cfg => {
        if (cfg.dbTable) {
          cfg.dbTable = cfg.dbTable.replace(/^[A-Za-z0-9_]+-/, newPfx);
        }
        if (cfg.linkedStoredProcedure) {
          cfg.linkedStoredProcedure = cfg.linkedStoredProcedure.replace(/^[A-Za-z0-9_]+-/, newPfx);
        }
      });
    }

    return { success: true, config: existing };
  }

  public getStoredProcedures(): StoredProcedureRecord[] {
    return Array.from(this.storedProcedures.values());
  }

  public updateStoredProcedure(params: {
    name: string;
    sqlDefinition: string;
    description?: string;
    actorName: string;
  }): { success: boolean; procedure?: StoredProcedureRecord; error?: string } {
    const sp = this.storedProcedures.get(params.name);
    if (!sp) {
      return { success: false, error: `Stored procedure '${params.name}' not found.` };
    }
    sp.sqlDefinition = params.sqlDefinition;
    if (params.description) sp.description = params.description;
    sp.updatedBy = params.actorName;
    sp.updatedAt = new Date().toISOString();
    return { success: true, procedure: sp };
  }

  public canRoleSeeWorkforceHours(role?: string): boolean {
    const configuredVisibleRoles = this.getConfigValue<string[]>(
      'WORKFORCE_HOURS_VISIBLE_ROLES',
      DEFAULT_WORKFORCE_HOURS_VISIBLE_ROLES
    );
    return canViewWorkforceHours(role, configuredVisibleRoles);
  }

  private seedInitialStaffAvailability() {
    const roleLabels: Record<string, string> = {
      master_super_admin: 'Master Super Admin',
      super_admin: 'Super Administrator',
      ceo_management: 'CEO (Executive)',
      cfo_management: 'CFO (Executive Finance)',
      cso_management: 'CSO (Executive Strategy)',
      branch_manager: 'Branch Manager',
      counselor: 'Senior Counsellor',
      admissions_team: 'Admissions Specialist',
      documentation_team: 'Documentation Officer',
      application_executive: 'Application Executive',
      finance_team: 'Finance Officer',
      loan_executive: 'Education Loan Officer',
      aps_executive: 'APS Specialist',
      visa_team: 'Consular Visa Officer',
      student_success: 'Student Success Officer',
      travel_desk: 'Travel & Forex Desk',
      support_executive: 'Support Executive'
    };

    const staffUsers = SEED_SECURITY_USERS.filter(
      u => u.role !== 'student' && u.role !== 'parent' && !u.hiddenFromUI
    );

    staffUsers.forEach((u, index) => {
      const isOnline = index % 4 !== 3;
      const availMins = isOnline ? 395 + ((index * 11) % 65) : 260 + ((index * 17) % 80);
      const offMins = Math.max(15, 480 - availMins);
      const pct = Math.min(100, Math.round((availMins / (availMins + offMins)) * 100));

      const dbRole = this.securityEngine.getRoleById(u.roleId) || this.securityEngine.getRoleByCode(u.role);
      const managerUser = u.reportsToUserId ? SEED_SECURITY_USERS.find(m => m.id === u.reportsToUserId) : null;
      const managerRole = managerUser
        ? this.securityEngine.getRoleById(managerUser.roleId) || this.securityEngine.getRoleByCode(managerUser.role)
        : null;
      const reportsToName = managerUser
        ? `${managerUser.name} (${managerRole?.roleName || managerUser.role})`
        : 'Top-Level Role (No Manager)';
      const reportsToRole = managerUser ? managerUser.role : 'none';

      this.staffAvailability.set(u.id, {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        roleLabel: dbRole?.roleName || roleLabels[u.role] || u.role,
        branch: u.branch,
        currentStatus: isOnline ? 'available' : 'offline',
        lastStatusChangedAt: new Date(Date.now() - (index + 1) * 22 * 60 * 1000).toISOString(),
        availableMinutesToday: availMins,
        offlineMinutesToday: offMins,
        availableHoursFormatted: formatMinutesToHours(availMins),
        offlineHoursFormatted: formatMinutesToHours(offMins),
        workingHoursCompliancePct: pct,
        reportsToName,
        reportsToRole,
        statusHistoryToday: [
          {
            status: 'available',
            timestamp: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
            note: 'Logged in at start of shift (09:00 AM IST)'
          },
          ...(isOnline
            ? []
            : [
                {
                  status: 'offline' as StaffPresenceStatus,
                  timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
                  note: 'Switched to Offline'
                }
              ])
        ]
      });
    });
  }

  public syncStaffUserUpdate(userId: string, updates: { name?: string; email?: string; branch?: string; role?: string }) {
    const staffRec = this.staffAvailability.get(userId);
    if (staffRec) {
      if (updates.name) staffRec.name = updates.name;
      if (updates.email) staffRec.email = updates.email;
      if (updates.branch) staffRec.branch = updates.branch;
      if (updates.role) staffRec.role = updates.role;
      this.staffAvailability.set(userId, staffRec);
    }

    for (const [mId, m] of this.meetings.entries()) {
      let modified = false;
      if (m.assignedCounselorId === userId) {
        if (updates.name) m.assignedCounselorName = updates.name;
        if (updates.email) m.assignedCounselorEmail = updates.email;
        if (updates.branch) m.assignedCounselorBranch = updates.branch;
        modified = true;
      }
      if (m.schedulerId === userId) {
        if (updates.name) m.schedulerName = updates.name;
        if (updates.email) m.schedulerEmail = updates.email;
        modified = true;
      }
      if (modified) {
        m.googleCalendarUrl = buildGoogleCalendarUrl({
          title: `${m.title} — ${m.candidateName}`,
          startIso: m.scheduledStartAt,
          endIso: m.scheduledEndAt,
          agenda: m.agenda,
          meetLink: m.meetLink,
          candidateEmail: m.candidateEmail,
          schedulerEmail: m.schedulerEmail
        });
        m.gmailComposeUrl = buildGmailComposeUrl({
          title: m.title,
          startIso: m.scheduledStartAt,
          durationMinutes: m.durationMinutes,
          agenda: m.agenda,
          meetLink: m.meetLink,
          googleCalendarUrl: m.googleCalendarUrl,
          candidateName: m.candidateName,
          candidateEmail: m.candidateEmail,
          schedulerName: m.schedulerName,
          schedulerEmail: m.schedulerEmail
        });
        this.meetings.set(mId, m);
      }
    }
  }

  private seedInitialHierarchyConfigs() {
    const nowIso = new Date().toISOString();
    this.hierarchyConfigs = [
      {
        id: 1,
        roleId: 'super_admin',
        roleLabel: 'Admin (Sandeep Koteshwar)',
        roleName: 'Admin (Sandeep Koteshwar)',
        hierarchyLevel: 1,
        reportsToRoleId: 'super_admin',
        reportsToRoleLabel: 'Admin (Top Level)',
        reportsToRoleName: 'Admin (Top Level)',
        escalationRecipientEmail: 'sandeepkoteshwar@gmail.com',
        escalationRecipientEmails: ['sandeepkoteshwar@gmail.com'],
        canViewHierarchyReports: true,
        canViewReports: true,
        allowedScreens: [
          'dashboards',
          'leads',
          'meetings_workforce',
          'profile_analysis',
          'shortlisting',
          'documentation',
          'applications',
          'offers',
          'services_visa',
          'travel_landing',
          'pipeline'
        ],
        isActive: true,
        updatedAt: nowIso
      },
      {
        id: 2,
        roleId: 'counselor',
        roleLabel: 'Counsellor (Sandeep Koteshwara)',
        roleName: 'Counsellor (Sandeep Koteshwara)',
        hierarchyLevel: 2,
        reportsToRoleId: 'super_admin',
        reportsToRoleLabel: 'Admin (Sandeep Koteshwar)',
        reportsToRoleName: 'Admin (Sandeep Koteshwar)',
        escalationRecipientEmail: 'sandeepkoteshwar@gmail.com',
        escalationRecipientEmails: ['sandeepkoteshwar@gmail.com'],
        canViewHierarchyReports: false,
        canViewReports: false,
        allowedScreens: [
          'dashboards',
          'leads',
          'meetings_workforce',
          'profile_analysis',
          'shortlisting',
          'documentation',
          'applications',
          'offers',
          'services_visa',
          'travel_landing',
          'pipeline'
        ],
        isActive: true,
        updatedAt: nowIso
      }
    ];
  }

  public getHierarchyConfigs(): HierarchyRoleMappingRecord[] {
    return this.hierarchyConfigs;
  }

  public upsertHierarchyConfig(
    record: Partial<HierarchyRoleMappingRecord> & { actorName?: string }
  ): { success: boolean; record: HierarchyRoleMappingRecord; hierarchyConfigs: HierarchyRoleMappingRecord[] } {
    const nowIso = new Date().toISOString();
    const roleLabel = record.roleName || record.roleLabel || 'Custom Hierarchy Role';
    const reportsToLabel = record.reportsToRoleName || record.reportsToRoleLabel || 'Admin (Sandeep Koteshwar)';
    const emailsList = Array.isArray(record.escalationRecipientEmails)
      ? record.escalationRecipientEmails
      : (record.escalationRecipientEmail || 'sandeepkoteshwar@gmail.com')
          .split(',')
          .map(e => e.trim())
          .filter(Boolean);
    const primaryEmail = emailsList[0] || 'sandeepkoteshwar@gmail.com';
    const canReports =
      record.canViewReports !== undefined ? Boolean(record.canViewReports) : Boolean(record.canViewHierarchyReports);

    const existingIdx = this.hierarchyConfigs.findIndex(
      h => (record.id && h.id === record.id) || (record.roleId && h.roleId === record.roleId)
    );

    let savedRecord: HierarchyRoleMappingRecord;
    if (existingIdx >= 0) {
      const existing = this.hierarchyConfigs[existingIdx];
      savedRecord = {
        ...existing,
        ...record,
        roleLabel,
        roleName: roleLabel,
        reportsToRoleLabel: reportsToLabel,
        reportsToRoleName: reportsToLabel,
        escalationRecipientEmail: primaryEmail,
        escalationRecipientEmails: emailsList,
        canViewHierarchyReports: canReports,
        canViewReports: canReports,
        allowedScreens: Array.isArray(record.allowedScreens) ? record.allowedScreens : existing.allowedScreens,
        updatedAt: nowIso
      };
      this.hierarchyConfigs[existingIdx] = savedRecord;
    } else {
      const nextId = this.hierarchyConfigs.reduce((max, h) => Math.max(max, h.id), 0) + 1;
      savedRecord = {
        id: nextId,
        roleId: record.roleId || `role_${nextId}`,
        roleLabel,
        roleName: roleLabel,
        hierarchyLevel: Number(record.hierarchyLevel) || 2,
        reportsToRoleId: record.reportsToRoleId || 'super_admin',
        reportsToRoleLabel: reportsToLabel,
        reportsToRoleName: reportsToLabel,
        escalationRecipientEmail: primaryEmail,
        escalationRecipientEmails: emailsList,
        canViewHierarchyReports: canReports,
        canViewReports: canReports,
        allowedScreens: Array.isArray(record.allowedScreens)
          ? record.allowedScreens
          : ['dashboards', 'leads', 'meetings_workforce'],
        isActive: record.isActive !== false,
        updatedAt: nowIso
      };
      this.hierarchyConfigs.push(savedRecord);
    }

    return {
      success: true,
      record: savedRecord,
      hierarchyConfigs: this.hierarchyConfigs
    };
  }

  /**
   * Sends real multipart HTML + .ics Calendar Invite email to Candidate, Scheduler/Counsellor, or any user email
   * if SMTP credentials are provided in environment variables or GMI-sys_configurations.
   */
  public async dispatchMeetingCalendarEmail(
    mOrParams:
      | GoogleMeetSession
      | {
          meeting: GoogleMeetSession;
          isReschedule?: boolean;
          reminderLabel?: string;
          extraRecipients?: string[];
          googleAccessToken?: string;
        },
    eventTypeArg: 'SCHEDULED' | 'RESCHEDULED' | 'REMINDER' = 'SCHEDULED',
    reminderLabelArg?: string
  ): Promise<{
    sentSmtp: boolean;
    smtpMode: 'gmail_smtp' | 'google_workspace_api' | 'ethereal_test_smtp' | 'calendar_and_gmail_compose_ready';
    recipients: string[];
    perRecipientStatus?: Array<{ email: string; delivered: boolean; method: string; error?: string }>;
    message: string;
    previewUrl?: string;
    htmlPreview?: string;
    icsContent?: string;
    meetJoinUrl?: string;
    googleCalendarUrl?: string;
    gmailComposeUrl?: string;
    secretsRequiredHint?: string;
  }> {
    try {
      const m: GoogleMeetSession = 'meeting' in mOrParams ? mOrParams.meeting : mOrParams;
      const reminderLabel = 'meeting' in mOrParams ? mOrParams.reminderLabel : reminderLabelArg;
      const extraRecipients = 'meeting' in mOrParams && Array.isArray(mOrParams.extraRecipients) ? mOrParams.extraRecipients : [];
      const googleAccessToken =
        ('meeting' in mOrParams ? mOrParams.googleAccessToken : undefined) ||
        this.getConfigValue<string>('GOOGLE_OAUTH_ACCESS_TOKEN', '');
      const eventType: 'SCHEDULED' | 'RESCHEDULED' | 'REMINDER' =
        'meeting' in mOrParams
          ? mOrParams.reminderLabel
            ? 'REMINDER'
            : mOrParams.isReschedule
            ? 'RESCHEDULED'
            : 'SCHEDULED'
          : eventTypeArg;

      if (!m) {
        return {
          sentSmtp: false,
          smtpMode: 'calendar_and_gmail_compose_ready',
          recipients: [],
          message: 'No meeting provided'
        };
      }

      const recipients = Array.from(
        new Set(
          [m.candidateEmail, m.schedulerEmail, m.assignedCounselorEmail, ...extraRecipients]
            .map(e => (e || '').trim().toLowerCase())
            .filter(e => e && e.includes('@'))
        )
      );

      // 1. If Google Workspace OAuth Access Token is provided, auto-create real Google Meet space & Google Calendar invite for BOTH parties
      if (googleAccessToken && googleAccessToken.trim().length > 10) {
        try {
          const token = googleAccessToken.trim();
          const calRes = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                summary: `${m.title} (${m.candidateName})`,
                description: `${m.agenda}\n\nCandidate: ${m.candidateName} (${m.candidateEmail})\nCounsellor: ${m.assignedCounselorName} (${m.assignedCounselorEmail})`,
                start: { dateTime: safeDate(m.scheduledStartAt).toISOString() },
                end: { dateTime: safeDate(m.scheduledEndAt).toISOString() },
                attendees: recipients.map(email => ({ email })),
                conferenceData: {
                  createRequest: {
                    requestId: `gmi_${m.id}_${Date.now()}`,
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                  }
                }
              })
            }
          );

          if (calRes.ok) {
            const calData: any = await calRes.json();
            const realMeetUri =
              calData.hangoutLink ||
              calData.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri;
            if (realMeetUri) {
              m.meetLink = realMeetUri;
            }
          } else {
            const meetRes = await fetch('https://meet.googleapis.com/v2/spaces', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({})
            });
            if (meetRes.ok) {
              const meetData: any = await meetRes.json();
              if (meetData.meetingUri) {
                m.meetLink = meetData.meetingUri;
              }
            }
          }
        } catch (err: any) {
          console.warn('Google Meet/Calendar API warning:', err?.message || err);
        }
      }

      const smtpHost = process.env.SMTP_HOST || this.getConfigValue<string>('SMTP_HOST', 'smtp.gmail.com');
      const smtpPort = Number(process.env.SMTP_PORT || this.getConfigValue<number>('SMTP_PORT', 465));
      const smtpUser = process.env.SMTP_USER || this.getConfigValue<string>('SMTP_USER', 'sandeepkoteshwar@gmail.com');
      const smtpPass = process.env.SMTP_PASS || this.getConfigValue<string>('SMTP_GMAIL_APP_PASSWORD', '');

      const icsContent = buildIcsCalendarContent(m);
      const formattedStart = safeDate(m.scheduledStartAt).toLocaleString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata'
      });

      const subject =
        eventType === 'RESCHEDULED'
          ? `[Rescheduled] Google Meet & Calendar Invite: ${m.title} (${m.candidateName})`
          : eventType === 'REMINDER'
          ? `Reminder (${reminderLabel || 'Upcoming'}): Join Google Meet — ${m.title}`
          : `Google Meet Invite & Join Link: ${m.title} (${m.candidateName})`;

      const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 620px; color: #0f172a; line-height: 1.55; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #1e1b4b; color: #ffffff; padding: 18px 22px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #a5b4fc; font-weight: bold;">Google Meet Video Counselling Invite</div>
          <h2 style="color: #ffffff; margin: 4px 0 0 0; font-size: 18px;">${subject}</h2>
        </div>
        <div style="padding: 20px 22px; background: #ffffff;">
          <p style="margin-top: 0;">Hello <strong>${m.candidateName}</strong> (${m.candidateEmail}) and <strong>${m.assignedCounselorName}</strong> (${m.assignedCounselorEmail}),</p>
          <p>You have been invited to join a Google Meet video session. Click the auto-generated meeting link below at the scheduled time to join the meeting directly from this email:</p>
          
          <div style="margin: 22px 0; text-align: center; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 18px;">
            <div style="font-size: 12px; color: #166534; font-weight: bold; margin-bottom: 10px;">AUTO-GENERATED GOOGLE MEET LINK FOR BOTH PARTIES</div>
            <a href="${m.meetLink}" target="_blank" rel="noopener noreferrer" style="background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Join Google Meet Now
            </a>
            <div style="margin-top: 10px; font-size: 12px; color: #0f172a;">
              Auto-Generated Meeting Link: <a href="${m.meetLink}" style="color: #059669; font-weight: bold;">${m.meetLink}</a>
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px;">
            <div style="margin-bottom: 4px;"><strong>Session Reference:</strong> ${m.title} (${m.meetingCode})</div>
            <div style="margin-bottom: 4px;"><strong>Date &amp; Time (IST):</strong> ${formattedStart} (${m.durationMinutes} mins)</div>
            <div style="margin-bottom: 4px;"><strong>Candidate (Party 1):</strong> ${m.candidateName} (${m.candidateEmail})</div>
            <div style="margin-bottom: 4px;"><strong>Counsellor / Host (Party 2):</strong> ${m.assignedCounselorName} (${m.assignedCounselorEmail})</div>
            <div><strong>Agenda:</strong> ${m.agenda}</div>
          </div>

          <p style="margin: 18px 0;">
            <a href="${m.googleCalendarUrl}" target="_blank" rel="noopener noreferrer" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">
              Add to Google Calendar &amp; Auto-Block Slot
            </a>
          </p>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
            An RFC-5545 iCalendar (<code>${m.meetingCode}-invite.ics</code>) invite is attached so your calendar is automatically blocked.
          </p>
        </div>
      </div>
    `;

      // 1B. Send to BOTH parties via Gmail API if Google OAuth Access Token is provided
      if (googleAccessToken && googleAccessToken.trim().length > 10) {
        const token = googleAccessToken.trim();
        const perRecipientStatus: Array<{ email: string; delivered: boolean; method: string; error?: string }> = [];
        const icsBase64 = Buffer.from(icsContent, 'utf-8').toString('base64');
        const htmlBase64 = Buffer.from(htmlBody, 'utf-8').toString('base64');

        for (const recipientEmail of recipients) {
          try {
            const boundary = `gmi_meet_boundary_${Date.now()}`;
            const rawMime = [
              `To: ${recipientEmail}`,
              `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`,
              'MIME-Version: 1.0',
              `Content-Type: multipart/mixed; boundary="${boundary}"`,
              '',
              `--${boundary}`,
              'Content-Type: text/html; charset="UTF-8"',
              'Content-Transfer-Encoding: base64',
              '',
              htmlBase64,
              '',
              `--${boundary}`,
              `Content-Type: text/calendar; charset="UTF-8"; method=REQUEST; name="${m.meetingCode}-invite.ics"`,
              `Content-Disposition: attachment; filename="${m.meetingCode}-invite.ics"`,
              'Content-Transfer-Encoding: base64',
              '',
              icsBase64,
              `--${boundary}--`
            ].join('\r\n');

            const encodedMessage = Buffer.from(rawMime, 'utf-8')
              .toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '');

            const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ raw: encodedMessage })
            });

            if (gmailRes.ok) {
              perRecipientStatus.push({ email: recipientEmail, delivered: true, method: 'Gmail API (Google OAuth)' });
            } else {
              const errText = await gmailRes.text();
              perRecipientStatus.push({ email: recipientEmail, delivered: false, method: 'Gmail API', error: errText });
            }
          } catch (e: any) {
            perRecipientStatus.push({ email: recipientEmail, delivered: false, method: 'Gmail API', error: e?.message });
          }
        }

        if (perRecipientStatus.some(s => s.delivered)) {
          m.emailDeliveryStatus = 'sent_smtp';
          return {
            sentSmtp: true,
            smtpMode: 'google_workspace_api',
            recipients,
            perRecipientStatus,
            message: `Real Gmail & Google Calendar invites with auto-generated Meet link (${m.meetLink}) delivered to BOTH parties: ${recipients.join(' & ')}!`,
            htmlPreview: htmlBody,
            icsContent,
            meetJoinUrl: m.meetLink,
            googleCalendarUrl: m.googleCalendarUrl,
            gmailComposeUrl: m.gmailComposeUrl
          };
        }
      }

      // 2. Send individual emails to BOTH parties via configured SMTP (Gmail App Password)
      if (smtpUser && smtpPass && smtpPass.trim().length > 0) {
        const cleanPass = smtpPass.replace(/\s+/g, '').trim();
        const perRecipientStatus: Array<{ email: string; delivered: boolean; method: string; error?: string }> = [];
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser.trim(),
              pass: cleanPass
            }
          });

          for (const recipientEmail of recipients) {
            try {
              await transporter.sendMail({
                from: `"Student Lifecycle CRM" <${smtpUser.trim()}>`,
                to: recipientEmail,
                subject,
                html: htmlBody,
                icalEvent: {
                  filename: `${m.meetingCode}-invite.ics`,
                  method: 'request',
                  content: icsContent
                }
              });
              perRecipientStatus.push({ email: recipientEmail, delivered: true, method: `SMTP (${smtpHost})` });
            } catch (sendErr: any) {
              perRecipientStatus.push({
                email: recipientEmail,
                delivered: false,
                method: `SMTP (${smtpHost})`,
                error: sendErr?.message || 'SMTP send error'
              });
            }
          }

          if (perRecipientStatus.some(s => s.delivered)) {
            m.emailDeliveryStatus = 'sent_smtp';
            return {
              sentSmtp: true,
              smtpMode: 'gmail_smtp',
              recipients,
              perRecipientStatus,
              message: `Real SMTP email & .ics calendar invite with auto-generated Google Meet link (${m.meetLink}) delivered to BOTH parties: ${recipients.join(' & ')}!`,
              htmlPreview: htmlBody,
              icsContent,
              meetJoinUrl: m.meetLink,
              googleCalendarUrl: m.googleCalendarUrl,
              gmailComposeUrl: m.gmailComposeUrl
            };
          }
        } catch (err: any) {
          console.warn('Configured SMTP dispatch fallback:', err?.message || err);
        }
      }

      // Attempt Ethereal test SMTP verification so we verify real Nodemailer MIME + .ics generation
      let etherealPreviewUrl: string | undefined;
      try {
        const testAccount = await nodemailer.createTestAccount();
        const testTransporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        const info = await testTransporter.sendMail({
          from: `"Student Lifecycle CRM" <${smtpUser || 'no-reply@crm-portal.com'}>`,
          to: recipients.join(', '),
          subject,
          html: htmlBody,
          icalEvent: {
            filename: `${m.meetingCode}-invite.ics`,
            method: 'request',
            content: icsContent
          }
        });
        const url = nodemailer.getTestMessageUrl(info);
        if (url) etherealPreviewUrl = url;
      } catch {
        // Ignore if offline or blocked in container
      }

      m.emailDeliveryStatus = 'calendar_link_ready';
      return {
        sentSmtp: false,
        smtpMode: 'calendar_and_gmail_compose_ready',
        recipients,
        perRecipientStatus: recipients.map(email => ({
          email,
          delivered: false,
          method: 'Pending Live Gmail Auth / App Password'
        })),
        previewUrl: etherealPreviewUrl,
        htmlPreview: htmlBody,
        icsContent,
        meetJoinUrl: m.meetLink,
        googleCalendarUrl: m.googleCalendarUrl,
        gmailComposeUrl: m.gmailComposeUrl,
        secretsRequiredHint:
          'Enter your 16-character Gmail App Password in the "Configure Live Gmail Delivery" box below (or click "Send via Gmail / Google Calendar") to deliver directly to both real Gmail inboxes.',
        message: `Auto-generated Meet link (${m.meetLink}) & invite prepared for BOTH parties (${recipients.join(' & ')}). Connect Gmail below or click "Open & Send in Gmail" to deliver to real inboxes.`
      };
    } catch (err: any) {
      console.warn('Meeting calendar email dispatch warning:', err?.message || err);
      return {
        sentSmtp: false,
        smtpMode: 'calendar_and_gmail_compose_ready',
        recipients: [],
        message: 'Fallback calendar link prepared'
      };
    }
  }

  /**
   * Tests meeting invite creation, email dispatch, .ics attachment, and in-app notification popup
   * for any user email address(es).
   */
  public async testMeetingInvite(params: {
    recipientEmail: string;
    secondaryEmail?: string;
    candidateName?: string;
    schedulerName?: string;
    schedulerId?: string;
    schedulerRole?: string;
    title?: string;
    agenda?: string;
    customMeetLink?: string;
    googleAccessToken?: string;
  }) {
    const cleanPrimary = (params.recipientEmail || '').trim();
    if (!cleanPrimary || !cleanPrimary.includes('@')) {
      return { success: false, error: 'Please provide a valid email address to test the meeting invite.' };
    }
    const cleanSecondary = (params.secondaryEmail || '').trim();
    const now = Date.now();
    const startIso = new Date(now + 15 * 60 * 1000).toISOString();
    const endIso = new Date(now + 45 * 60 * 1000).toISOString();
    const code = generateSessionReference();
    const meetLink = normalizeValidMeetLink(params.customMeetLink);
    const title = params.title || '1-on-1 Study Abroad Counselling & University Shortlist';
    const candidateName = params.candidateName || cleanPrimary.split('@')[0];
    const schedulerName = params.schedulerName || 'Sandeep Koteshwar';
    const schedulerEmail = cleanSecondary && cleanSecondary.includes('@') ? cleanSecondary : 'sandeepkoteshwar@gmail.com';

    const gcalUrl = buildGoogleCalendarUrl({
      title: `${title} — ${candidateName}`,
      startIso,
      endIso,
      agenda: params.agenda || 'Test Google Meet invite email & calendar block with direct join link.',
      meetLink,
      candidateEmail: cleanPrimary,
      schedulerEmail
    });

    const gmailUrl = buildGmailComposeUrl({
      title: `${title} — ${candidateName}`,
      startIso,
      endIso,
      durationMinutes: 30,
      agenda: params.agenda || 'Test Google Meet invite email & calendar block with direct join link.',
      meetLink,
      googleCalendarUrl: gcalUrl,
      candidateName,
      candidateEmail: cleanPrimary,
      schedulerName,
      schedulerEmail
    });

    const testMeeting: GoogleMeetSession = {
      id: `meet_test_${now}`,
      meetingCode: code,
      meetLink,
      joinPortalUrl: `/api/meetings/meet_test_${now}/join`,
      googleCalendarUrl: gcalUrl,
      gmailComposeUrl: gmailUrl,
      emailDeliveryStatus: 'calendar_link_ready',
      title,
      agenda: params.agenda || 'Test Google Meet invite email & calendar block with direct join link.',
      candidateId: `cand_${now}`,
      candidateName,
      candidateEmail: cleanPrimary,
      candidatePhone: '+91 98490 11223',
      candidateWhatsapp: '+91 98490 11223',
      candidateCity: 'Hyderabad',
      targetCountry: 'United Kingdom',
      targetDegree: 'Masters',
      targetIntake: 'Fall 2026',
      schedulerId: params.schedulerId || 'usr_sa1',
      schedulerName,
      schedulerEmail,
      schedulerRole: params.schedulerRole || 'super_admin',
      assignedCounselorId: params.schedulerId || 'usr_sa1',
      assignedCounselorName: schedulerName,
      assignedCounselorEmail: schedulerEmail,
      assignedCounselorBranch: 'Hyderabad - Head Office',
      higherHierarchyId: 'usr_sa1',
      higherHierarchyName: 'Sandeep Koteshwar (Admin)',
      higherHierarchyEmail: 'sandeepkoteshwar@gmail.com',
      higherHierarchyRole: 'super_admin',
      scheduledStartAt: startIso,
      scheduledEndAt: endIso,
      durationMinutes: 30,
      timezone: 'IST (UTC+05:30)',
      status: 'scheduled',
      rescheduleCount: 0,
      calendarBlockedForScheduler: true,
      calendarBlockedForCandidate: true,
      icsInviteGenerated: true,
      schedulerInviteSentAt: new Date(now).toISOString(),
      candidateInviteSentAt: new Date(now).toISOString(),
      reminders: [
        { interval: '60_min', label: '1 Hour Before', minutesBefore: 60, sentToCandidate: false, sentToCounselor: false },
        { interval: '30_min', label: '30 Mins Before', minutesBefore: 30, sentToCandidate: false, sentToCounselor: false },
        { interval: '15_min', label: '15 Mins Before', minutesBefore: 15, sentToCandidate: false, sentToCounselor: false },
        { interval: '0_min', label: 'On Time (0 Min)', minutesBefore: 0, sentToCandidate: false, sentToCounselor: false }
      ],
      counselorJoined: false,
      counselorJoinedFromApp: false,
      counselorMissedEscalated: false,
      candidateJoined: false,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString()
    };

    this.meetings.set(testMeeting.id, testMeeting);

    // Create user-specific notifications for the recipient(s)
    const uniqueRecipients = Array.from(new Set([cleanPrimary.toLowerCase(), schedulerEmail.toLowerCase()].filter(Boolean)));
    uniqueRecipients.forEach((emailAddr, idx) => {
      this.notifications.unshift({
        id: `mnot_test_${now}_${idx}`,
        meetingId: testMeeting.id,
        meetingCode: testMeeting.meetingCode,
        meetLink: testMeeting.meetLink,
        joinPortalUrl: testMeeting.joinPortalUrl,
        type: 'MEETING_INVITE_CALENDAR_BLOCK',
        recipientId: emailAddr === schedulerEmail.toLowerCase() ? (params.schedulerId || undefined) : undefined,
        recipientName: emailAddr === cleanPrimary.toLowerCase() ? candidateName : schedulerName,
        recipientEmail: emailAddr,
        recipientRole: emailAddr === schedulerEmail.toLowerCase() ? 'scheduler' : 'candidate',
        subject: `Google Meet Invite Ready: ${testMeeting.title} (${testMeeting.meetingCode})`,
        message: `Join Google Meet directly via ${testMeeting.meetLink}. Calendar invite (.ics) & Google Calendar block prepared for ${emailAddr}.`,
        sentAt: new Date(now).toISOString(),
        channel: 'Email & Calendar (.ics)',
        isRead: false
      });
    });

    const dispatchResult = await this.dispatchMeetingCalendarEmail({
      meeting: testMeeting,
      isReschedule: false,
      extraRecipients: uniqueRecipients,
      googleAccessToken: params.googleAccessToken
    });

    // Update notification links if Google API updated the Meet link
    testMeeting.googleCalendarUrl = buildGoogleCalendarUrl({
      title: `${title} — ${candidateName}`,
      startIso,
      endIso,
      agenda: testMeeting.agenda,
      meetLink: testMeeting.meetLink,
      candidateEmail: cleanPrimary,
      schedulerEmail
    });
    testMeeting.gmailComposeUrl = buildGmailComposeUrl({
      title: `${title} — ${candidateName}`,
      startIso,
      endIso,
      durationMinutes: 30,
      agenda: testMeeting.agenda,
      meetLink: testMeeting.meetLink,
      googleCalendarUrl: testMeeting.googleCalendarUrl,
      candidateName,
      candidateEmail: cleanPrimary,
      schedulerName,
      schedulerEmail
    });

    return {
      success: true,
      meeting: testMeeting,
      dispatchResult
    };
  }

  /**
   * Backend Automatic Reminder Engine:
   * Automatically checks all scheduled/rescheduled meetings and sends notifications at
   * 60 mins, 30 mins, 15 mins, and 0 mins (On Time) before the meeting without any UI buttons.
   */
  public processAutomaticReminders(): void {
    const nowMs = Date.now();
    for (const m of this.meetings.values()) {
      if (m.status !== 'scheduled' && m.status !== 'rescheduled') continue;
      const startMs = new Date(m.scheduledStartAt).getTime();
      if (isNaN(startMs)) continue;
      const minsRemaining = (startMs - nowMs) / (60 * 1000);

      for (const rem of m.reminders) {
        if (!rem.sentToCandidate && minsRemaining <= rem.minutesBefore && minsRemaining >= -30) {
          this.triggerReminderNotification({
            meetingId: m.id,
            interval: rem.interval
          });
        }
      }
    }
  }

  private pushPerParticipantNotifications(params: {
    idPrefix: string;
    meeting: GoogleMeetSession;
    type: MeetingNotificationRecord['type'];
    subject: string;
    messageForCandidate: string;
    messageForCounselor: string;
    sentAt: string;
    channel: MeetingNotificationRecord['channel'];
  }): MeetingNotificationRecord[] {
    const created: MeetingNotificationRecord[] = [];
    const m = params.meeting;

    // 1. Notification for Candidate
    if (m.candidateEmail) {
      const candNotif: MeetingNotificationRecord = {
        id: `${params.idPrefix}_cand`,
        meetingId: m.id,
        meetingCode: m.meetingCode,
        meetLink: m.meetLink,
        joinPortalUrl: `/api/meetings/${m.id}/join`,
        type: params.type,
        recipientId: m.candidateId,
        recipientName: m.candidateName,
        recipientEmail: m.candidateEmail,
        recipientRole: 'candidate',
        subject: params.subject,
        message: params.messageForCandidate,
        sentAt: params.sentAt,
        channel: params.channel,
        isRead: false
      };
      this.notifications.unshift(candNotif);
      created.push(candNotif);
    }

    // 2. Notification for Assigned Counsellor
    if (m.assignedCounselorEmail) {
      const counsNotif: MeetingNotificationRecord = {
        id: `${params.idPrefix}_couns`,
        meetingId: m.id,
        meetingCode: m.meetingCode,
        meetLink: m.meetLink,
        joinPortalUrl: `/api/meetings/${m.id}/join`,
        type: params.type,
        recipientId: m.assignedCounselorId,
        recipientName: m.assignedCounselorName,
        recipientEmail: m.assignedCounselorEmail,
        recipientRole: 'counselor',
        subject: params.subject,
        message: params.messageForCounselor,
        sentAt: params.sentAt,
        channel: params.channel,
        isRead: false
      };
      this.notifications.unshift(counsNotif);
      created.push(counsNotif);
    }

    // 3. If Scheduler is different from Assigned Counsellor and Candidate, notify Scheduler too
    if (
      m.schedulerEmail &&
      m.schedulerEmail.toLowerCase() !== (m.assignedCounselorEmail || '').toLowerCase() &&
      m.schedulerEmail.toLowerCase() !== (m.candidateEmail || '').toLowerCase()
    ) {
      const schedNotif: MeetingNotificationRecord = {
        id: `${params.idPrefix}_sched`,
        meetingId: m.id,
        meetingCode: m.meetingCode,
        meetLink: m.meetLink,
        joinPortalUrl: `/api/meetings/${m.id}/join`,
        type: params.type,
        recipientId: m.schedulerId,
        recipientName: m.schedulerName,
        recipientEmail: m.schedulerEmail,
        recipientRole: 'scheduler',
        subject: params.subject,
        message: params.messageForCounselor,
        sentAt: params.sentAt,
        channel: params.channel,
        isRead: false
      };
      this.notifications.unshift(schedNotif);
      created.push(schedNotif);
    }

    return created;
  }

  private seedInitialMeetings() {
    const now = Date.now();
    const defaultMeetUrl = this.getConfigValue<string>(
      'DEFAULT_GOOGLE_MEET_BASE_URL',
      'https://meet.google.com/gmi-cnsl-uk26'
    );

    // 1. Upcoming meeting in 30 minutes (Sandeep Koteshwara with Candidate Sandeep Fidrox)
    const start1 = new Date(now + 30 * 60 * 1000).toISOString();
    const end1 = new Date(now + 75 * 60 * 1000).toISOString();
    const code1 = 'GMI-MEET-101';
    const gcal1 = buildGoogleCalendarUrl({
      title: '1-on-1 Study Abroad Counselling & Shortlist Finalization — Sandeep Fidrox',
      startIso: start1,
      endIso: end1,
      agenda: 'Review UK Fall 2026 MSc Computer Science shortlist, tuition deposit timeline, and SOP structure.',
      meetLink: defaultMeetUrl,
      candidateEmail: 'sandeepfidrox@gmail.com',
      schedulerEmail: 'sandeepkoteshwara29@gmail.com'
    });

    const meet1: GoogleMeetSession = {
      id: 'meet_001',
      meetingCode: code1,
      meetLink: defaultMeetUrl,
      joinPortalUrl: '/api/meetings/meet_001/join',
      googleCalendarUrl: gcal1,
      gmailComposeUrl: buildGmailComposeUrl({
        title: '1-on-1 Study Abroad Counselling & Shortlist Finalization',
        startIso: start1,
        durationMinutes: 45,
        agenda: 'Review UK Fall 2026 MSc Computer Science shortlist, tuition deposit timeline, and SOP structure.',
        meetLink: defaultMeetUrl,
        googleCalendarUrl: gcal1,
        candidateName: 'Sandeep Fidrox',
        candidateEmail: 'sandeepfidrox@gmail.com',
        schedulerName: 'Sandeep Koteshwara',
        schedulerEmail: 'sandeepkoteshwara29@gmail.com'
      }),
      title: '1-on-1 Study Abroad Counselling & Shortlist Finalization',
      agenda: 'Review UK Fall 2026 MSc Computer Science shortlist, tuition deposit timeline, and SOP structure.',
      candidateId: 'std_01',
      candidateName: 'Sandeep Fidrox',
      candidateEmail: 'sandeepfidrox@gmail.com',
      candidatePhone: '+91 98490 11223',
      candidateWhatsapp: '+91 98490 11223',
      candidateCity: 'Hyderabad',
      targetCountry: 'United Kingdom',
      targetDegree: 'Masters (MSc)',
      targetIntake: 'Fall 2026',
      schedulerId: 'usr_c1',
      schedulerName: 'Sandeep Koteshwara',
      schedulerEmail: 'sandeepkoteshwara29@gmail.com',
      schedulerRole: 'counselor',
      assignedCounselorId: 'usr_c1',
      assignedCounselorName: 'Sandeep Koteshwara',
      assignedCounselorEmail: 'sandeepkoteshwara29@gmail.com',
      assignedCounselorBranch: 'Hyderabad - Banjara Hills',
      higherHierarchyId: 'usr_sa1',
      higherHierarchyName: 'Sandeep Koteshwar (Admin)',
      higherHierarchyEmail: 'sandeepkoteshwar@gmail.com',
      higherHierarchyRole: 'super_admin',
      scheduledStartAt: start1,
      scheduledEndAt: end1,
      durationMinutes: 45,
      timezone: 'IST (UTC+05:30)',
      status: 'invalid_link_requires_recreation',
      rescheduleCount: 0,
      calendarBlockedForScheduler: true,
      calendarBlockedForCandidate: true,
      icsInviteGenerated: true,
      schedulerInviteSentAt: new Date(now - 3 * 3600 * 1000).toISOString(),
      candidateInviteSentAt: new Date(now - 3 * 3600 * 1000).toISOString(),
      reminders: [
        { interval: '60_min', label: '1 Hour Before', minutesBefore: 60, sentToCandidate: true, sentToCounselor: true, sentAt: new Date(now - 30 * 60 * 1000).toISOString() },
        { interval: '30_min', label: '30 Mins Before', minutesBefore: 30, sentToCandidate: true, sentToCounselor: true, sentAt: new Date(now - 1 * 60 * 1000).toISOString() },
        { interval: '15_min', label: '15 Mins Before', minutesBefore: 15, sentToCandidate: false, sentToCounselor: false },
        { interval: '0_min', label: 'On Time (0 Min)', minutesBefore: 0, sentToCandidate: false, sentToCounselor: false }
      ],
      counselorJoined: false,
      counselorJoinedFromApp: false,
      counselorMissedEscalated: false,
      candidateJoined: false,
      createdAt: new Date(now - 3 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - 1 * 60 * 1000).toISOString()
    };

    // 2. Meeting Starting Now where Counselor Joined (Scheduled by Admin Sandeep Koteshwar)
    const start2 = new Date(now - 10 * 60 * 1000).toISOString();
    const end2 = new Date(now + 20 * 60 * 1000).toISOString();
    const code2 = 'GMI-MEET-102';
    const gcal2 = buildGoogleCalendarUrl({
      title: 'Germany APS & Blocked Account Evaluation — Rohan Verma',
      startIso: start2,
      endIso: end2,
      agenda: 'Evaluate Bavarian GPA 1.80 eligibility for TU Munich and APS documentation.',
      meetLink: defaultMeetUrl,
      candidateEmail: 'rohan.verma@example.com',
      schedulerEmail: 'sandeepkoteshwara29@gmail.com'
    });

    const meet2: GoogleMeetSession = {
      id: 'meet_002',
      meetingCode: code2,
      meetLink: defaultMeetUrl,
      joinPortalUrl: '/api/meetings/meet_002/join',
      googleCalendarUrl: gcal2,
      gmailComposeUrl: buildGmailComposeUrl({
        title: 'Germany APS & Blocked Account Evaluation',
        startIso: start2,
        durationMinutes: 30,
        agenda: 'Evaluate Bavarian GPA 1.80 eligibility for TU Munich and APS documentation.',
        meetLink: defaultMeetUrl,
        googleCalendarUrl: gcal2,
        candidateName: 'Rohan Verma',
        candidateEmail: 'rohan.verma@example.com',
        schedulerName: 'Sandeep Koteshwara',
        schedulerEmail: 'sandeepkoteshwara29@gmail.com'
      }),
      title: 'Germany APS & Blocked Account Evaluation',
      agenda: 'Evaluate Bavarian GPA 1.80 eligibility for TU Munich and APS documentation.',
      candidateId: 'lead_102',
      candidateName: 'Rohan Verma',
      candidateEmail: 'rohan.verma@example.com',
      candidatePhone: '+91 98201 44556',
      candidateWhatsapp: '+91 98201 44556',
      candidateCity: 'Pune',
      targetCountry: 'Germany',
      targetDegree: 'Masters (M.Sc.)',
      targetIntake: 'Winter 2026',
      schedulerId: 'usr_sa1',
      schedulerName: 'Sandeep Koteshwar',
      schedulerEmail: 'sandeepkoteshwar@gmail.com',
      schedulerRole: 'super_admin',
      assignedCounselorId: 'usr_c1',
      assignedCounselorName: 'Sandeep Koteshwara',
      assignedCounselorEmail: 'sandeepkoteshwara29@gmail.com',
      assignedCounselorBranch: 'Hyderabad - Banjara Hills',
      higherHierarchyId: 'usr_sa1',
      higherHierarchyName: 'Sandeep Koteshwar (Admin)',
      higherHierarchyEmail: 'sandeepkoteshwar@gmail.com',
      higherHierarchyRole: 'super_admin',
      scheduledStartAt: start2,
      scheduledEndAt: end2,
      durationMinutes: 30,
      timezone: 'IST (UTC+05:30)',
      status: 'invalid_link_requires_recreation',
      rescheduleCount: 0,
      calendarBlockedForScheduler: true,
      calendarBlockedForCandidate: true,
      icsInviteGenerated: true,
      schedulerInviteSentAt: new Date(now - 5 * 3600 * 1000).toISOString(),
      candidateInviteSentAt: new Date(now - 5 * 3600 * 1000).toISOString(),
      reminders: [
        { interval: '60_min', label: '1 Hour Before', minutesBefore: 60, sentToCandidate: true, sentToCounselor: true, sentAt: new Date(now - 70 * 60 * 1000).toISOString() },
        { interval: '30_min', label: '30 Mins Before', minutesBefore: 30, sentToCandidate: true, sentToCounselor: true, sentAt: new Date(now - 40 * 60 * 1000).toISOString() },
        { interval: '15_min', label: '15 Mins Before', minutesBefore: 15, sentToCandidate: true, sentToCounselor: true, sentAt: new Date(now - 25 * 60 * 1000).toISOString() },
        { interval: '0_min', label: 'On Time (0 Min)', minutesBefore: 0, sentToCandidate: true, sentToCounselor: true, sentAt: new Date(now - 10 * 60 * 1000).toISOString() }
      ],
      counselorJoined: true,
      counselorJoinedAt: new Date(now - 9 * 60 * 1000).toISOString(),
      counselorJoinedFromApp: true,
      counselorJoinIp: '10.0.8.44',
      counselorMissedEscalated: false,
      candidateJoined: false,
      createdAt: new Date(now - 5 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - 9 * 60 * 1000).toISOString()
    };

    // 3. Past meeting where Counselor did NOT join -> Silently recorded for Admin / Higher Hierarchy only
    const start3 = new Date(now - 90 * 60 * 1000).toISOString();
    const end3 = new Date(now - 60 * 60 * 1000).toISOString();
    const code3 = 'GMI-MEET-103';
    const gcal3 = buildGoogleCalendarUrl({
      title: 'US Fall 2026 STEM Profile & Loan Assessment — Ananya Krishnan',
      startIso: start3,
      endIso: end3,
      agenda: 'Discuss US Top-50 MS Data Science universities and collateral-free education loan options.',
      meetLink: defaultMeetUrl,
      candidateEmail: 'ananya.krishnan@example.com',
      schedulerEmail: 'sandeepkoteshwara29@gmail.com'
    });

    const meet3: GoogleMeetSession = {
      id: 'meet_003',
      meetingCode: code3,
      meetLink: defaultMeetUrl,
      joinPortalUrl: '/api/meetings/meet_003/join',
      googleCalendarUrl: gcal3,
      gmailComposeUrl: buildGmailComposeUrl({
        title: 'US Fall 2026 STEM Profile & Loan Assessment',
        startIso: start3,
        durationMinutes: 30,
        agenda: 'Discuss US Top-50 MS Data Science universities and collateral-free education loan options.',
        meetLink: defaultMeetUrl,
        googleCalendarUrl: gcal3,
        candidateName: 'Ananya Krishnan',
        candidateEmail: 'ananya.krishnan@example.com',
        schedulerName: 'Sandeep Koteshwara',
        schedulerEmail: 'sandeepkoteshwara29@gmail.com'
      }),
      title: 'US Fall 2026 STEM Profile & Loan Assessment',
      agenda: 'Discuss US Top-50 MS Data Science universities and collateral-free education loan options.',
      candidateId: 'lead_103',
      candidateName: 'Ananya Krishnan',
      candidateEmail: 'ananya.krishnan@example.com',
      candidatePhone: '+91 98450 77889',
      candidateWhatsapp: '+91 98450 77889',
      candidateCity: 'Bangalore',
      targetCountry: 'United States',
      targetDegree: 'Masters (MS)',
      targetIntake: 'Fall 2026',
      schedulerId: 'usr_c1',
      schedulerName: 'Sandeep Koteshwara',
      schedulerEmail: 'sandeepkoteshwara29@gmail.com',
      schedulerRole: 'counselor',
      assignedCounselorId: 'usr_c1',
      assignedCounselorName: 'Sandeep Koteshwara',
      assignedCounselorEmail: 'sandeepkoteshwara29@gmail.com',
      assignedCounselorBranch: 'Hyderabad - Banjara Hills',
      higherHierarchyId: 'usr_sa1',
      higherHierarchyName: 'Sandeep Koteshwar (Admin)',
      higherHierarchyEmail: 'sandeepkoteshwar@gmail.com',
      higherHierarchyRole: 'super_admin',
      scheduledStartAt: start3,
      scheduledEndAt: end3,
      durationMinutes: 30,
      timezone: 'IST (UTC+05:30)',
      status: 'invalid_link_requires_recreation',
      rescheduleCount: 0,
      calendarBlockedForScheduler: true,
      calendarBlockedForCandidate: true,
      icsInviteGenerated: true,
      schedulerInviteSentAt: new Date(now - 6 * 3600 * 1000).toISOString(),
      candidateInviteSentAt: new Date(now - 6 * 3600 * 1000).toISOString(),
      reminders: [
        { interval: '60_min', label: '1 Hour Before', minutesBefore: 60, sentToCandidate: true, sentToCounselor: true, sentAt: new Date(now - 150 * 60 * 1000).toISOString() },
        { interval: '30_min', label: '30 Mins Before', minutesBefore: 30, sentToCandidate: true, sentToCounselor: true, sentAt: new Date(now - 120 * 60 * 1000).toISOString() },
        { interval: '15_min', label: '15 Mins Before', minutesBefore: 15, sentToCandidate: true, sentToCounselor: true, sentAt: new Date(now - 105 * 60 * 1000).toISOString() },
        { interval: '0_min', label: 'On Time (0 Min)', minutesBefore: 0, sentToCandidate: true, sentToCounselor: true, sentAt: new Date(now - 90 * 60 * 1000).toISOString() }
      ],
      counselorJoined: false,
      counselorJoinedFromApp: false,
      counselorMissedEscalated: true,
      counselorMissedEscalatedAt: new Date(now - 80 * 60 * 1000).toISOString(),
      counselorMissedEscalatedTo: 'Sandeep Koteshwar (Admin)',
      counselorMissedEscalationNote: 'Silent Executive Log: Counsellor Sandeep Koteshwara did not join within 10 mins of scheduled start.',
      candidateJoined: true,
      candidateJoinedAt: new Date(now - 90 * 60 * 1000).toISOString(),
      createdAt: new Date(now - 6 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - 80 * 60 * 1000).toISOString()
    };

    this.meetings.set(meet1.id, meet1);
    this.meetings.set(meet2.id, meet2);
    this.meetings.set(meet3.id, meet3);

    // Seed initial per-user notifications so each user strictly sees ONLY their own notifications
    this.notifications = [
      {
        id: 'mnot_1_cand',
        meetingId: 'meet_001',
        meetingCode: code1,
        meetLink: defaultMeetUrl,
        joinPortalUrl: '/api/meetings/meet_001/join',
        type: 'MEETING_INVITE_CALENDAR_BLOCK',
        recipientId: 'std_01',
        recipientName: 'Sandeep Fidrox',
        recipientEmail: 'sandeepfidrox@gmail.com',
        recipientRole: 'candidate',
        subject: 'Google Meet Invite: 1-on-1 Study Abroad Counselling',
        message: `Your Google Meet session (${code1}) with Counsellor Sandeep Koteshwara is scheduled. Click Join Google Meet (${defaultMeetUrl}) to join the call.`,
        sentAt: new Date(now - 3 * 3600 * 1000).toISOString(),
        channel: 'Email & Calendar (.ics)',
        isRead: false
      },
      {
        id: 'mnot_1_couns',
        meetingId: 'meet_001',
        meetingCode: code1,
        meetLink: defaultMeetUrl,
        joinPortalUrl: '/api/meetings/meet_001/join',
        type: 'MEETING_INVITE_CALENDAR_BLOCK',
        recipientId: 'usr_c1',
        recipientName: 'Sandeep Koteshwara',
        recipientEmail: 'sandeepkoteshwara29@gmail.com',
        recipientRole: 'counselor',
        subject: 'Google Meet Scheduled: Sandeep Fidrox (UK Fall 2026)',
        message: `Google Calendar invite (.ics) & Google Meet session (${code1}) scheduled with Candidate Sandeep Fidrox (sandeepfidrox@gmail.com).`,
        sentAt: new Date(now - 3 * 3600 * 1000).toISOString(),
        channel: 'Email & Calendar (.ics)',
        isRead: false
      },
      {
        id: 'mnot_3_cand',
        meetingId: 'meet_001',
        meetingCode: code1,
        meetLink: defaultMeetUrl,
        joinPortalUrl: '/api/meetings/meet_001/join',
        type: 'REMINDER_30_MIN',
        recipientId: 'std_01',
        recipientName: 'Sandeep Fidrox',
        recipientEmail: 'sandeepfidrox@gmail.com',
        recipientRole: 'candidate',
        subject: 'Reminder: Your Google Meet starts in 30 Minutes',
        message: `Automated 30-Minute reminder for your session ${code1} with Counsellor Sandeep Koteshwara. Join link: ${defaultMeetUrl}`,
        sentAt: new Date(now - 1 * 60 * 1000).toISOString(),
        channel: 'In-App & Email Reminder',
        isRead: false
      },
      {
        id: 'mnot_3_couns',
        meetingId: 'meet_001',
        meetingCode: code1,
        meetLink: defaultMeetUrl,
        joinPortalUrl: '/api/meetings/meet_001/join',
        type: 'REMINDER_30_MIN',
        recipientId: 'usr_c1',
        recipientName: 'Sandeep Koteshwara',
        recipientEmail: 'sandeepkoteshwara29@gmail.com',
        recipientRole: 'counselor',
        subject: 'Reminder: Google Meet with Sandeep Fidrox starts in 30 Minutes',
        message: `Automated 30-Minute reminder for session ${code1} with Candidate Sandeep Fidrox. Join link: ${defaultMeetUrl}`,
        sentAt: new Date(now - 1 * 60 * 1000).toISOString(),
        channel: 'In-App & Email Reminder',
        isRead: false
      },
      {
        id: 'mnot_2_admin',
        meetingId: 'meet_002',
        meetingCode: code2,
        meetLink: defaultMeetUrl,
        joinPortalUrl: '/api/meetings/meet_002/join',
        type: 'MEETING_INVITE_CALENDAR_BLOCK',
        recipientId: 'usr_sa1',
        recipientName: 'Sandeep Koteshwar',
        recipientEmail: 'sandeepkoteshwar@gmail.com',
        recipientRole: 'scheduler',
        subject: 'Google Meet Active: Germany APS & Blocked Account Evaluation',
        message: `Meeting ${code2} scheduled by you for Rohan Verma with Counsellor Sandeep Koteshwara is currently in progress. Join link: ${defaultMeetUrl}`,
        sentAt: new Date(now - 15 * 60 * 1000).toISOString(),
        channel: 'Email & Calendar (.ics)',
        isRead: false
      },
      {
        id: 'mnot_4_admin',
        meetingId: 'meet_003',
        meetingCode: code3,
        meetLink: defaultMeetUrl,
        joinPortalUrl: '/api/meetings/meet_003/join',
        type: 'COUNSELOR_MISSED_ESCALATION',
        recipientId: 'usr_sa1',
        recipientName: 'Sandeep Koteshwar (Admin)',
        recipientEmail: 'sandeepkoteshwar@gmail.com',
        recipientRole: 'higher_hierarchy',
        subject: 'Executive Alert: Missed Scheduled Google Meet (GMI-MEET-103)',
        message: 'Counsellor Sandeep Koteshwara did not join the scheduled Google Meet with candidate Ananya Krishnan.',
        sentAt: new Date(now - 80 * 60 * 1000).toISOString(),
        channel: 'Hierarchy Escalation Alert',
        isRead: false
      }
    ];
  }

  // --- 1. GET ALL MEETINGS & NOTIFICATIONS (Strictly User-Filtered & Role-Filtered) ---
  public getMeetings(viewerRole?: string): GoogleMeetSession[] {
    this.processAutomaticReminders();
    const isHigher = isHigherHierarchyRole(viewerRole);
    return Array.from(this.meetings.values())
      .map(m => {
        const hasPlaceholder = isPlaceholderOrInvalidMeetUrl(m.meetLink);
        const resolvedStatus: GoogleMeetStatus = hasPlaceholder
          ? 'invalid_link_requires_recreation'
          : m.status;
        const processed = {
          ...m,
          status: resolvedStatus
        };
        if (!isHigher) {
          // Strip escalation fields so counsellors are never told about higher authority escalation
          return {
            ...processed,
            status: resolvedStatus === 'counselor_missed' ? 'scheduled' : resolvedStatus,
            counselorMissedEscalated: false,
            counselorMissedEscalatedAt: undefined,
            counselorMissedEscalatedTo: undefined,
            counselorMissedEscalationNote: undefined
          };
        }
        return processed;
      })
      .sort((a, b) => new Date(b.scheduledStartAt).getTime() - new Date(a.scheduledStartAt).getTime());
  }

  public getNotifications(
    viewerRole?: string,
    viewerUserId?: string,
    viewerEmail?: string
  ): MeetingNotificationRecord[] {
    this.processAutomaticReminders();
    const isHigher = isHigherHierarchyRole(viewerRole);
    const cleanEmail = (viewerEmail || '').toLowerCase().trim();
    const cleanUserId = (viewerUserId || '').trim();

    if (!cleanEmail && !cleanUserId) {
      return [];
    }

    return this.notifications.filter(n => {
      if (!isHigher && n.type === 'COUNSELOR_MISSED_ESCALATION') {
        return false;
      }

      const notifUserId = (n.recipientId || '').trim();
      const recipEmails = (n.recipientEmail || '')
        .toLowerCase()
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      if (cleanUserId && notifUserId) {
        return notifUserId === cleanUserId;
      }

      if (!notifUserId && cleanEmail && recipEmails.includes(cleanEmail)) {
        return true;
      }

      return false;
    });
  }

  public markNotificationRead(notificationId: string, viewerUserId?: string): boolean {
    const found = this.notifications.find(n => n.id === notificationId);
    if (found) {
      if (viewerUserId && found.recipientId && found.recipientId !== viewerUserId) {
        return false;
      }
      found.isRead = true;
      return true;
    }
    return false;
  }

  public getMeetingById(meetingId: string): GoogleMeetSession | undefined {
    const m = this.meetings.get(meetingId);
    if (!m) return undefined;
    if (isPlaceholderOrInvalidMeetUrl(m.meetLink)) {
      return {
        ...m,
        status: 'invalid_link_requires_recreation'
      };
    }
    return m;
  }

  public deleteMeeting(meetingId: string): boolean {
    return this.meetings.delete(meetingId);
  }

  public updateMeetingWithSchedulerCalendarDetails(
    meetingId: string,
    details: {
      providerCode?: MeetingProviderCode;
      providerName?: string;
      calendarServiceName?: string;
      meetingServiceName?: string;
      calendarEventId?: string;
      meetLink?: string;
      schedulerEmail?: string;
      schedulerName?: string;
      calendarHtmlLink?: string;
      delivered?: boolean;
    }
  ): GoogleMeetSession | undefined {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return undefined;

    if (details.providerCode) meeting.providerCode = details.providerCode;
    if (details.providerName) meeting.providerName = details.providerName;
    if (details.calendarServiceName) meeting.calendarServiceName = details.calendarServiceName;
    if (details.meetingServiceName) meeting.meetingServiceName = details.meetingServiceName;
    if (details.calendarEventId) meeting.providerEventId = details.calendarEventId;
    if (details.meetLink && details.meetLink.startsWith('https://') && !isPlaceholderOrInvalidMeetUrl(details.meetLink)) {
      meeting.meetLink = details.meetLink;
      meeting.status = 'scheduled';
    } else {
      meeting.status = 'invalid_link_requires_recreation';
    }
    if (details.schedulerEmail) {
      meeting.schedulerEmail = details.schedulerEmail;
      meeting.assignedCounselorEmail = details.schedulerEmail;
    }
    if (details.schedulerName) {
      meeting.schedulerName = details.schedulerName;
      meeting.assignedCounselorName = details.schedulerName;
    }
    if (details.calendarHtmlLink) {
      meeting.googleCalendarUrl = details.calendarHtmlLink;
      meeting.providerCalendarWebLink = details.calendarHtmlLink;
    } else {
      meeting.googleCalendarUrl = buildProviderWebCalendarUrl({
        providerCode: meeting.providerCode || 'GOOGLE',
        title: `${meeting.title} — ${meeting.candidateName}`,
        startIso: meeting.scheduledStartAt,
        endIso: meeting.scheduledEndAt,
        agenda: meeting.agenda,
        meetLink: meeting.meetLink,
        candidateEmail: meeting.candidateEmail,
        schedulerEmail: meeting.schedulerEmail
      });
    }
    meeting.gmailComposeUrl = buildGmailComposeUrl({
      title: `${meeting.title} — ${meeting.candidateName}`,
      startIso: meeting.scheduledStartAt,
      endIso: meeting.scheduledEndAt,
      durationMinutes: meeting.durationMinutes,
      agenda: meeting.agenda,
      meetLink: meeting.meetLink,
      googleCalendarUrl: meeting.googleCalendarUrl,
      candidateName: meeting.candidateName,
      candidateEmail: meeting.candidateEmail,
      schedulerName: meeting.schedulerName,
      schedulerEmail: meeting.schedulerEmail
    });
    if (details.delivered) {
      meeting.emailDeliveryStatus = 'sent_smtp';
    }
    this.meetings.set(meetingId, meeting);
    return meeting;
  }

  // --- 1B. VALIDATE FUTURE MEETING DATE/TIME & GENERATE AVAILABLE TIME SLOTS ---
  public getConfiguredIanaTimezone(overrideTz?: string): string {
    const raw = overrideTz || this.workingHours.timezone || 'Asia/Kolkata';
    if (raw.includes('Asia/Kolkata') || raw.includes('IST')) return 'Asia/Kolkata';
    if (raw.includes('/')) return raw.split(' ')[0].trim();
    return 'Asia/Kolkata';
  }

  /**
   * Strictly validates that a requested meeting start date/time is not in the past
   * using the configured application/user/provider timezone.
   */
  public validateFutureMeetingDateTime(
    scheduledStartAt: string,
    timezoneOverride?: string
  ): { valid: boolean; startMs: number; error?: string } {
    if (!scheduledStartAt || !String(scheduledStartAt).trim()) {
      return {
        valid: false,
        startMs: NaN,
        error: 'Please select a valid future date and time for the meeting.'
      };
    }

    const raw = String(scheduledStartAt).trim();
    // If local datetime string without offset (e.g. "2026-09-30T10:30"), interpret in configured IST (+05:30) if server is in another timezone
    let parsedMs = new Date(raw).getTime();
    const ianaTz = this.getConfiguredIanaTimezone(timezoneOverride);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw) && ianaTz === 'Asia/Kolkata') {
      const istMs = new Date(`${raw.length === 16 ? raw + ':00' : raw}+05:30`).getTime();
      const localMs = new Date(raw).getTime();
      // Accept whichever interpretation the client intended, provided it's in the future, or use standard parse
      parsedMs = isNaN(localMs) ? istMs : localMs;
    }

    if (isNaN(parsedMs)) {
      return {
        valid: false,
        startMs: NaN,
        error: 'Invalid meeting date or time format. Please choose a valid future date and time.'
      };
    }

    const nowMs = Date.now();
    // Strict future validation: any past date or past time slot (including current minute that has already started) is rejected
    if (parsedMs <= nowMs) {
      return {
        valid: false,
        startMs: parsedMs,
        error: 'Cannot schedule or reschedule a meeting in the past. Please select a future date and an upcoming time slot.'
      };
    }

    return { valid: true, startMs: parsedMs };
  }

  /**
   * Computes available and disabled time slots for a given date (YYYY-MM-DD) in the configured timezone.
   * - Past dates have all slots disabled.
   * - Today's date has all past/current time slots disabled (e.g., if current time is 10:30 AM, 09:00 AM, 10:00 AM, and 10:30 AM are disabled; 11:00 AM is available).
   * - Future dates have all working-hours slots available (unless conflicting with an active meeting).
   */
  public getAvailableTimeSlotsForDate(params: {
    date: string; // YYYY-MM-DD
    durationMinutes?: number;
    counselorId?: string;
    excludeMeetingId?: string;
    timezone?: string;
    clientNowIso?: string;
  }): {
    date: string;
    timezone: string;
    isPastDate: boolean;
    workingHoursStart: string;
    workingHoursEnd: string;
    slots: Array<{
      time24: string;
      label12: string;
      isoStart: string;
      disabled: boolean;
      reason?: string;
    }>;
  } {
    const cleanDate = (params.date || '').trim().slice(0, 10);
    const startParts = (this.workingHours.startTime || '09:00').split(':').map(Number);
    const endParts = (this.workingHours.endTime || '18:00').split(':').map(Number);
    const startHour = isNaN(startParts[0]) ? 9 : startParts[0];
    const startMin = isNaN(startParts[1]) ? 0 : startParts[1];
    const endHour = isNaN(endParts[0]) ? 18 : endParts[0];
    const endMin = isNaN(endParts[1]) ? 0 : endParts[1];

    const startTotalMins = startHour * 60 + startMin;
    const endTotalMins = Math.max(startTotalMins + 30, endHour * 60 + endMin);

    const refNow = params.clientNowIso ? safeDate(params.clientNowIso) : new Date();
    const todayYmd = `${refNow.getFullYear()}-${String(refNow.getMonth() + 1).padStart(2, '0')}-${String(refNow.getDate()).padStart(2, '0')}`;
    const isPastDate = cleanDate < todayYmd;
    const isToday = cleanDate === todayYmd;
    const nowMinutesOfDay = refNow.getHours() * 60 + refNow.getMinutes();

    const format12h = (h: number, m: number) => {
      const suffix = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
    };

    const slots: Array<{
      time24: string;
      label12: string;
      isoStart: string;
      disabled: boolean;
      reason?: string;
    }> = [];

    for (let mins = startTotalMins; mins <= endTotalMins; mins += 30) {
      const hh = Math.floor(mins / 60);
      const mm = mins % 60;
      const time24 = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      const label12 = format12h(hh, mm);
      const localDateTimeStr = `${cleanDate}T${time24}:00`;
      const slotDate = new Date(localDateTimeStr);
      const isoStart = isNaN(slotDate.getTime()) ? localDateTimeStr : slotDate.toISOString();

      let disabled = false;
      let reason: string | undefined;

      if (isPastDate) {
        disabled = true;
        reason = 'Past date';
      } else if (isToday && mins <= nowMinutesOfDay) {
        disabled = true;
        reason = 'Past time slot';
      } else if (!isNaN(slotDate.getTime()) && slotDate.getTime() <= refNow.getTime()) {
        disabled = true;
        reason = 'Past time slot';
      }

      slots.push({
        time24,
        label12,
        isoStart,
        disabled,
        reason
      });
    }

    return {
      date: cleanDate,
      timezone: this.workingHours.timezone || 'Asia/Kolkata (IST, UTC+05:30)',
      isPastDate,
      workingHoursStart: this.workingHours.startTime || '09:00',
      workingHoursEnd: this.workingHours.endTime || '18:00',
      slots
    };
  }

  // --- 2. SCHEDULE GOOGLE MEET (Backed by sp_schedule_or_reschedule_meeting) ---
  public scheduleMeeting(params: {
    title: string;
    agenda: string;
    candidateId: string;
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string;
    candidateWhatsapp?: string;
    candidateCity?: string;
    targetCountry: string;
    targetDegree?: string;
    targetIntake: string;
    scheduledStartAt: string;
    durationMinutes: number;
    customMeetLink?: string;
    schedulerId: string;
    schedulerName: string;
    schedulerEmail: string;
    schedulerRole: string;
    assignedCounselorId?: string;
    assignedCounselorName?: string;
    assignedCounselorEmail?: string;
    assignedCounselorBranch?: string;
    clientIp: string;
  }): { success: boolean; meeting?: GoogleMeetSession; error?: string } {
    const allowedRoles = this.getConfigValue<string[]>(
      'ROLES_ALLOWED_TO_SCHEDULE_MEET',
      ROLES_ALLOWED_TO_SCHEDULE_MEETINGS
    );
    if (!canScheduleGoogleMeet(params.schedulerRole, allowedRoles)) {
      return {
        success: false,
        error: `Role '${params.schedulerRole}' is not authorized to schedule Google Meet sessions.`
      };
    }

    const futureValidation = this.validateFutureMeetingDateTime(params.scheduledStartAt);
    if (!futureValidation.valid) {
      return {
        success: false,
        error: futureValidation.error || 'Past dates and times are not allowed. Please select a future date and time to schedule the meeting.'
      };
    }
    const startMs = futureValidation.startMs;
    const duration = Number(params.durationMinutes) || 30;
    const endIso = new Date(startMs + duration * 60 * 1000).toISOString();
    const startIso = new Date(startMs).toISOString();

    const enabledProvider = schedulerOAuthEngine.getEnabledProvider('tenant_default');
    const defaultBaseUrl = this.getConfigValue<string>(
      'DEFAULT_GOOGLE_MEET_BASE_URL',
      ''
    );
    const code = generateSessionReference();
    const meetLink = normalizeValidMeetLink(
      params.customMeetLink,
      defaultBaseUrl,
      enabledProvider.providerCode
    );
    const counselorId = params.assignedCounselorId || params.schedulerId;
    const counselorName = params.assignedCounselorName || params.schedulerName;
    const counselorEmail = params.assignedCounselorEmail || params.schedulerEmail;
    const nowIso = new Date().toISOString();

    const configuredIntervals = this.getConfigValue<number[]>(
      'MEETING_REMINDER_INTERVALS_MINUTES',
      [60, 30, 15, 0]
    );
    const reminders = configuredIntervals.map(mins => ({
      interval: (mins === 60 ? '60_min' : mins === 30 ? '30_min' : mins === 15 ? '15_min' : '0_min') as MeetingReminderInterval,
      label: mins === 60 ? '1 Hour Before' : mins === 30 ? '30 Mins Before' : mins === 15 ? '15 Mins Before' : 'On Time (0 Min)',
      minutesBefore: mins,
      sentToCandidate: false,
      sentToCounselor: false
    }));

    const meetingId = `meet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const calendarUrl = buildProviderWebCalendarUrl({
      providerCode: enabledProvider.providerCode,
      title: `${params.title} — ${params.candidateName}`,
      startIso,
      endIso,
      agenda: params.agenda,
      meetLink,
      candidateEmail: params.candidateEmail,
      schedulerEmail: params.schedulerEmail
    });
    const meeting: GoogleMeetSession = {
      id: meetingId,
      tenantId: enabledProvider.tenantId,
      providerCode: enabledProvider.providerCode,
      providerName: enabledProvider.providerName,
      calendarServiceName: enabledProvider.calendarServiceName,
      meetingServiceName: enabledProvider.meetingServiceName,
      providerCalendarWebLink: calendarUrl,
      meetingCode: code,
      meetLink,
      joinPortalUrl: `/api/meetings/${meetingId}/join`,
      googleCalendarUrl: calendarUrl,
      gmailComposeUrl: buildGmailComposeUrl({
        title: `${params.title} — ${params.candidateName}`,
        startIso,
        endIso,
        agenda: params.agenda,
        meetLink,
        candidateName: params.candidateName,
        candidateEmail: params.candidateEmail,
        schedulerName: params.schedulerName,
        schedulerEmail: params.schedulerEmail,
        googleCalendarUrl: calendarUrl
      }),
      emailDeliveryStatus: process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS ? 'sent_smtp' : 'calendar_link_ready',
      title: params.title,
      agenda: params.agenda || '1-on-1 Study Abroad Counselling & Profile Evaluation',
      candidateId: params.candidateId,
      candidateName: params.candidateName,
      candidateEmail: params.candidateEmail,
      candidatePhone: params.candidatePhone,
      candidateWhatsapp: params.candidateWhatsapp || params.candidatePhone,
      candidateCity: params.candidateCity || 'Hyderabad',
      targetCountry: params.targetCountry || 'United Kingdom',
      targetDegree: params.targetDegree || 'Masters',
      targetIntake: params.targetIntake || 'Fall 2026',
      schedulerId: params.schedulerId,
      schedulerName: params.schedulerName,
      schedulerEmail: params.schedulerEmail,
      schedulerRole: params.schedulerRole,
      assignedCounselorId: counselorId,
      assignedCounselorName: counselorName,
      assignedCounselorEmail: counselorEmail,
      assignedCounselorBranch: params.assignedCounselorBranch || 'Hyderabad - Banjara Hills',
      higherHierarchyId: 'usr_sa1',
      higherHierarchyName: 'Sandeep Koteshwar (Admin)',
      higherHierarchyEmail: 'sandeepkoteshwar@gmail.com',
      higherHierarchyRole: 'super_admin',
      scheduledStartAt: startIso,
      scheduledEndAt: endIso,
      durationMinutes: duration,
      timezone: 'IST (UTC+05:30)',
      status: meetLink && !isPlaceholderOrInvalidMeetUrl(meetLink) ? 'scheduled' : 'invalid_link_requires_recreation',
      rescheduleCount: 0,
      calendarBlockedForScheduler: true,
      calendarBlockedForCandidate: true,
      icsInviteGenerated: true,
      schedulerInviteSentAt: nowIso,
      candidateInviteSentAt: nowIso,
      reminders,
      counselorJoined: false,
      counselorJoinedFromApp: false,
      counselorMissedEscalated: false,
      candidateJoined: false,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.meetings.set(meeting.id, meeting);
    this.recordSpExecution('sp_schedule_or_reschedule_meeting');

    // Automatically trigger email & .ics calendar invite dispatch to both candidate and scheduler
    void this.dispatchMeetingCalendarEmail({
      meeting,
      isReschedule: false
    });

    this.pushPerParticipantNotifications({
      idPrefix: `mnot_${Date.now()}_inv`,
      meeting,
      type: 'MEETING_INVITE_CALENDAR_BLOCK',
      subject: `Google Meet Scheduled & Calendar Blocked: ${meeting.title} (${meeting.meetingCode})`,
      messageForCandidate: `Your Google Meet counselling session (${meeting.meetingCode}) with ${meeting.assignedCounselorName} is scheduled for ${new Date(startIso).toLocaleString()} IST. Join link: ${meeting.meetLink}`,
      messageForCounselor: `Google Meet (${meeting.meetingCode}) with candidate ${meeting.candidateName} (${meeting.candidateEmail}) scheduled for ${new Date(startIso).toLocaleString()} IST. Join link: ${meeting.meetLink}`,
      sentAt: nowIso,
      channel: 'Email & Calendar (.ics)'
    });

    this.securityEngine.recordAudit({
      eventType: 'STAGE_TRANSITION_COMMITTED',
      actorId: params.schedulerId,
      actorName: params.schedulerName,
      actorRole: (params.schedulerRole as any) || 'counselor',
      actorIp: params.clientIp,
      targetEntity: 'google_meetings',
      targetId: meeting.id,
      details: `Executed sp_schedule_or_reschedule_meeting for candidate ${params.candidateName} (${params.candidateEmail}). Calendar blocked for both parties.`,
      severity: 'INFO'
    });

    return { success: true, meeting };
  }

  // --- 3. RESCHEDULE GOOGLE MEET (Backed by sp_schedule_or_reschedule_meeting) ---
  public rescheduleMeeting(params: {
    meetingId: string;
    newStartAt: string;
    durationMinutes?: number;
    customMeetLink?: string;
    reason: string;
    actorId: string;
    actorName: string;
    actorEmail: string;
    actorRole: string;
    clientIp: string;
  }): { success: boolean; meeting?: GoogleMeetSession; error?: string } {
    const allowedRoles = this.getConfigValue<string[]>(
      'ROLES_ALLOWED_TO_SCHEDULE_MEET',
      ROLES_ALLOWED_TO_SCHEDULE_MEETINGS
    );
    if (!canScheduleGoogleMeet(params.actorRole, allowedRoles)) {
      return {
        success: false,
        error: `Role '${params.actorRole}' is not authorized to reschedule Google Meet sessions.`
      };
    }

    const meeting = this.meetings.get(params.meetingId);
    if (!meeting) {
      return { success: false, error: 'Meeting not found.' };
    }

    const futureValidation = this.validateFutureMeetingDateTime(params.newStartAt);
    if (!futureValidation.valid) {
      return {
        success: false,
        error: futureValidation.error || 'Past dates and times are not allowed. Please select a future date and time to reschedule the meeting.'
      };
    }
    const startMs = futureValidation.startMs;
    const duration = Number(params.durationMinutes) || meeting.durationMinutes || 30;
    const startIso = new Date(startMs).toISOString();
    const endIso = new Date(startMs + duration * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    if (params.customMeetLink && params.customMeetLink.trim().startsWith('https://meet.google.com/')) {
      meeting.meetLink = params.customMeetLink.trim();
    }

    meeting.scheduledStartAt = startIso;
    meeting.scheduledEndAt = endIso;
    meeting.durationMinutes = duration;
    meeting.status = 'rescheduled';
    meeting.rescheduleCount += 1;
    meeting.lastRescheduledReason = params.reason || 'Requested slot adjustment';
    meeting.calendarBlockedForScheduler = true;
    meeting.calendarBlockedForCandidate = true;
    meeting.schedulerInviteSentAt = nowIso;
    meeting.candidateInviteSentAt = nowIso;
    meeting.counselorJoined = false;
    meeting.counselorJoinedAt = undefined;
    meeting.counselorMissedEscalated = false;
    meeting.candidateJoined = false;
    meeting.updatedAt = nowIso;
    meeting.googleCalendarUrl = buildGoogleCalendarUrl({
      title: `[Rescheduled] ${meeting.title} — ${meeting.candidateName}`,
      startIso,
      endIso,
      agenda: meeting.agenda,
      meetLink: meeting.meetLink,
      candidateEmail: meeting.candidateEmail,
      schedulerEmail: meeting.schedulerEmail
    });
    meeting.gmailComposeUrl = buildGmailComposeUrl({
      title: `[Rescheduled] ${meeting.title} — ${meeting.candidateName}`,
      startIso,
      endIso,
      agenda: meeting.agenda,
      meetLink: meeting.meetLink,
      candidateName: meeting.candidateName,
      candidateEmail: meeting.candidateEmail,
      schedulerName: meeting.assignedCounselorName || meeting.schedulerName,
      schedulerEmail: meeting.assignedCounselorEmail || meeting.schedulerEmail,
      googleCalendarUrl: meeting.googleCalendarUrl
    });

    meeting.reminders = meeting.reminders.map(r => ({
      ...r,
      sentToCandidate: false,
      sentToCounselor: false,
      sentAt: undefined
    }));

    this.recordSpExecution('sp_schedule_or_reschedule_meeting');

    void this.dispatchMeetingCalendarEmail({
      meeting,
      isReschedule: true
    });

    this.pushPerParticipantNotifications({
      idPrefix: `mnot_${Date.now()}_resch`,
      meeting,
      type: 'MEETING_RESCHEDULED_CALENDAR_BLOCK',
      subject: `Rescheduled Google Meet: ${meeting.title} (${meeting.meetingCode})`,
      messageForCandidate: `Your Google Meet (${meeting.meetingCode}) was rescheduled by ${params.actorName} to ${new Date(startIso).toLocaleString()} IST. Reason: ${meeting.lastRescheduledReason}. Join link: ${meeting.meetLink}`,
      messageForCounselor: `Google Meet (${meeting.meetingCode}) with ${meeting.candidateName} rescheduled to ${new Date(startIso).toLocaleString()} IST. Reason: ${meeting.lastRescheduledReason}. Join link: ${meeting.meetLink}`,
      sentAt: nowIso,
      channel: 'Email & Calendar (.ics)'
    });

    return { success: true, meeting };
  }

  // --- 4. TRIGGER REMINDER NOTIFICATIONS (1 hr, 30 min, 15 min, On Time) ---
  public triggerReminderNotification(params: {
    meetingId: string;
    interval: MeetingReminderInterval;
  }): { success: boolean; meeting?: GoogleMeetSession; notification?: MeetingNotificationRecord; error?: string } {
    const meeting = this.meetings.get(params.meetingId);
    if (!meeting) {
      return { success: false, error: 'Meeting not found.' };
    }

    const checkpoint = meeting.reminders.find(r => r.interval === params.interval) || meeting.reminders[0];
    const nowIso = new Date().toISOString();
    if (checkpoint) {
      checkpoint.sentToCandidate = true;
      checkpoint.sentToCounselor = true;
      checkpoint.sentAt = nowIso;
    }
    meeting.updatedAt = nowIso;

    const typeMap: Record<MeetingReminderInterval, MeetingNotificationRecord['type']> = {
      '60_min': 'REMINDER_60_MIN',
      '30_min': 'REMINDER_30_MIN',
      '15_min': 'REMINDER_15_MIN',
      '0_min': 'REMINDER_ON_TIME'
    };

    const timingLabelMap: Record<MeetingReminderInterval, string> = {
      '60_min': 'in 1 Hour',
      '30_min': 'in 30 Minutes',
      '15_min': 'in 15 Minutes',
      '0_min': 'Now (On Time)'
    };

    void this.dispatchMeetingCalendarEmail({
      meeting,
      reminderLabel: timingLabelMap[params.interval]
    });

    const created = this.pushPerParticipantNotifications({
      idPrefix: `mnot_${Date.now()}_${params.interval}`,
      meeting,
      type: typeMap[params.interval],
      subject: `Reminder: Your Google Meet (${meeting.meetingCode}) starts ${timingLabelMap[params.interval]}`,
      messageForCandidate: `Automated reminder: Your Google Meet session "${meeting.title}" with ${meeting.assignedCounselorName} starts ${timingLabelMap[params.interval]}. Join link: ${meeting.meetLink}`,
      messageForCounselor: `Automated reminder: Your Google Meet session "${meeting.title}" with candidate ${meeting.candidateName} starts ${timingLabelMap[params.interval]}. Join link: ${meeting.meetLink}`,
      sentAt: nowIso,
      channel: 'In-App & Email Reminder'
    });

    return { success: true, meeting, notification: created[0] };
  }

  // --- 5. COUNSELLOR JOINS MEETING FROM APPLICATION (Silent tracking via sp_record_counselor_meeting_join) ---
  public recordCounselorJoin(params: {
    meetingId: string;
    actorId: string;
    actorName: string;
    actorRole: string;
    customMeetLink?: string;
    clientIp: string;
  }): { success: boolean; meeting?: GoogleMeetSession; error?: string } {
    const meeting = this.meetings.get(params.meetingId);
    if (!meeting) {
      return { success: false, error: 'Meeting not found.' };
    }

    const nowIso = new Date().toISOString();
    if (params.customMeetLink && params.customMeetLink.trim().startsWith('https://meet.google.com/')) {
      meeting.meetLink = params.customMeetLink.trim();
    }
    meeting.counselorJoined = true;
    meeting.counselorJoinedAt = nowIso;
    meeting.counselorJoinedFromApp = true;
    meeting.counselorJoinIp = params.clientIp;
    if (meeting.status === 'scheduled' || meeting.status === 'rescheduled' || meeting.status === 'counselor_missed') {
      meeting.status = 'in_progress';
    }
    meeting.updatedAt = nowIso;

    this.recordSpExecution('sp_record_counselor_meeting_join');

    this.securityEngine.recordAudit({
      eventType: 'STAGE_TRANSITION_COMMITTED',
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: (params.actorRole as any) || 'counselor',
      actorIp: params.clientIp,
      targetEntity: 'google_meetings',
      targetId: meeting.id,
      details: `Executed sp_record_counselor_meeting_join for ${params.actorName} (${meeting.meetingCode}).`,
      severity: 'INFO'
    });

    return { success: true, meeting };
  }

  // --- 6. SILENT ESCALATION TO HIGHER HIERARCHY IF COUNSELLOR MISSED MEETING (sp_silent_escalate_missed_meetings) ---
  public escalateCounselorMissed(params: {
    meetingId: string;
  }): { success: boolean; meeting?: GoogleMeetSession; notification?: MeetingNotificationRecord; error?: string } {
    const meeting = this.meetings.get(params.meetingId);
    if (!meeting) {
      return { success: false, error: 'Meeting not found.' };
    }

    if (meeting.counselorJoined) {
      return {
        success: false,
        error: 'Counsellor has already joined this meeting.'
      };
    }

    const nowIso = new Date().toISOString();
    meeting.status = 'counselor_missed';
    meeting.counselorMissedEscalated = true;
    meeting.counselorMissedEscalatedAt = nowIso;
    meeting.counselorMissedEscalatedTo = `${meeting.higherHierarchyName}`;
    meeting.counselorMissedEscalationNote = `Silent Management Alert: Counsellor ${meeting.assignedCounselorName} did not join scheduled meeting with ${meeting.candidateName}.`;
    meeting.updatedAt = nowIso;

    this.recordSpExecution('sp_silent_escalate_missed_meetings');

    const notification: MeetingNotificationRecord = {
      id: `mnot_${Date.now()}_esc`,
      meetingId: meeting.id,
      meetingCode: meeting.meetingCode,
      meetLink: meeting.meetLink,
      joinPortalUrl: `/api/meetings/${meeting.id}/join`,
      type: 'COUNSELOR_MISSED_ESCALATION',
      recipientId: meeting.higherHierarchyId,
      recipientName: meeting.higherHierarchyName,
      recipientEmail: meeting.higherHierarchyEmail,
      recipientRole: 'higher_hierarchy',
      subject: `Management Alert: Missed Scheduled Google Meet (${meeting.assignedCounselorName})`,
      message: `Notified ${meeting.higherHierarchyName}: Counsellor ${meeting.assignedCounselorName} missed the scheduled Google Meet (${meeting.meetingCode}) with candidate ${meeting.candidateName}.`,
      sentAt: nowIso,
      channel: 'Hierarchy Escalation Alert',
      isRead: false
    };

    this.notifications.unshift(notification);
    return { success: true, meeting, notification };
  }

  // --- 7. CANDIDATE NO-SHOW: LOG STATUS, REMARKS & FOLLOW-UP EMAIL (sp_record_candidate_no_show) ---
  public recordCandidateNoShow(params: {
    meetingId: string;
    status: CandidateNoShowStatus;
    remarks: string;
    sendFollowUpEmail: boolean;
    actorName: string;
  }): { success: boolean; meeting?: GoogleMeetSession; notification?: MeetingNotificationRecord; error?: string } {
    const meeting = this.meetings.get(params.meetingId);
    if (!meeting) {
      return { success: false, error: 'Meeting not found.' };
    }

    if (!params.remarks || !params.remarks.trim()) {
      return { success: false, error: 'Please provide remarks explaining why the candidate did not join the call.' };
    }

    const nowIso = new Date().toISOString();
    meeting.status = 'candidate_no_show';
    meeting.candidateJoined = false;
    meeting.candidateNoShowDisposition = {
      status: params.status,
      remarks: params.remarks.trim(),
      followUpEmailSent: params.sendFollowUpEmail,
      followUpEmailSentAt: params.sendFollowUpEmail ? nowIso : undefined,
      followUpCallLogged: true,
      updatedBy: params.actorName,
      updatedAt: nowIso
    };
    meeting.updatedAt = nowIso;

    this.recordSpExecution('sp_record_candidate_no_show');

    let notification: MeetingNotificationRecord | undefined;
    if (params.sendFollowUpEmail) {
      notification = {
        id: `mnot_${Date.now()}_noshow`,
        meetingId: meeting.id,
        meetingCode: meeting.meetingCode,
        meetLink: meeting.meetLink,
        joinPortalUrl: `/api/meetings/${meeting.id}/join`,
        type: 'CANDIDATE_NO_SHOW_EMAIL',
        recipientId: meeting.candidateId,
        recipientName: meeting.candidateName,
        recipientEmail: meeting.candidateEmail,
        recipientRole: 'candidate',
        subject: `We Missed You on Google Meet Today — Reschedule Your Counselling Session`,
        message: `Follow-up email sent to ${meeting.candidateName} (${meeting.candidateEmail}) by ${params.actorName}. Status: [${params.status}]. Remarks: "${params.remarks.trim()}"`,
        sentAt: nowIso,
        channel: 'Candidate Follow-Up Email',
        isRead: false
      };
      this.notifications.unshift(notification);
    }

    return { success: true, meeting, notification };
  }

  // --- 8. STAFF AVAILABILITY STATUS (Strictly Enforces CEO/CFO/CSO Visibility for Hours via sp_get_workforce_hours_by_role_clearance) ---
  public getStaffAvailabilityRoster(viewerRole?: string, viewerUserId?: string, viewerEmail?: string): StaffAvailabilityRecord[] {
    this.recordSpExecution('sp_get_workforce_hours_by_role_clearance');
    const configuredVisibleRoles = this.getConfigValue<string[]>(
      'WORKFORCE_HOURS_VISIBLE_ROLES',
      DEFAULT_WORKFORCE_HOURS_VISIBLE_ROLES
    );
    const canSeeHours = canViewWorkforceHours(viewerRole, configuredVisibleRoles);

    const allRecords = Array.from(this.staffAvailability.values());
    if (canSeeHours) {
      return allRecords;
    }

    // Non-executive users NEVER see how much time anyone (including themselves) was available or offline
    return allRecords
      .filter(
        r =>
          (viewerUserId && r.userId === viewerUserId) ||
          (viewerEmail && r.email.toLowerCase() === viewerEmail.toLowerCase())
      )
      .map(r => ({
        ...r,
        availableMinutesToday: 0,
        offlineMinutesToday: 0,
        availableHoursFormatted: '',
        offlineHoursFormatted: '',
        workingHoursCompliancePct: 0,
        statusHistoryToday: []
      }));
  }

  public getStaffAvailabilityByUser(userId: string, email?: string): StaffAvailabilityRecord | undefined {
    if (this.staffAvailability.has(userId)) {
      return this.staffAvailability.get(userId);
    }
    if (email) {
      return Array.from(this.staffAvailability.values()).find(
        s => s.email.toLowerCase() === email.toLowerCase()
      );
    }
    return undefined;
  }

  public updateStaffAvailability(params: {
    userId: string;
    userEmail?: string;
    userName?: string;
    userRole?: string;
    userBranch?: string;
    newStatus: StaffPresenceStatus;
    note?: string;
  }): { success: boolean; record?: StaffAvailabilityRecord; error?: string } {
    if (params.userRole === 'student' || params.userRole === 'parent') {
      return {
        success: false,
        error: 'Availability status is exclusively for internal staff users, not students or parents.'
      };
    }

    let record = this.getStaffAvailabilityByUser(params.userId, params.userEmail);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    if (!record) {
      record = {
        userId: params.userId,
        name: params.userName || 'Staff Member',
        email: params.userEmail || 'staff@crm-portal.com',
        role: params.userRole || 'counselor',
        roleLabel: params.userRole || 'Staff',
        branch: params.userBranch || 'Hyderabad - Head Office',
        currentStatus: params.newStatus,
        lastStatusChangedAt: nowIso,
        availableMinutesToday: params.newStatus === 'available' ? 420 : 360,
        offlineMinutesToday: params.newStatus === 'available' ? 60 : 120,
        availableHoursFormatted: params.newStatus === 'available' ? '7h 00m' : '6h 00m',
        offlineHoursFormatted: params.newStatus === 'available' ? '1h 00m' : '2h 00m',
        workingHoursCompliancePct: params.newStatus === 'available' ? 88 : 75,
        reportsToName: 'Naveen Rao (Branch Manager)',
        reportsToRole: 'branch_manager',
        statusHistoryToday: []
      };
      this.staffAvailability.set(params.userId, record);
    } else {
      const prevTime = new Date(record.lastStatusChangedAt).getTime();
      const elapsedMins = Math.max(1, Math.min(60, Math.round((now - prevTime) / (60 * 1000))));

      if (record.currentStatus === 'available') {
        record.availableMinutesToday += elapsedMins;
      } else {
        record.offlineMinutesToday += elapsedMins;
      }

      record.currentStatus = params.newStatus;
      record.lastStatusChangedAt = nowIso;
      record.availableHoursFormatted = formatMinutesToHours(record.availableMinutesToday);
      record.offlineHoursFormatted = formatMinutesToHours(record.offlineMinutesToday);
      const total = Math.max(1, record.availableMinutesToday + record.offlineMinutesToday);
      record.workingHoursCompliancePct = Math.min(
        100,
        Math.round((record.availableMinutesToday / total) * 100)
      );
    }

    record.statusHistoryToday.unshift({
      status: params.newStatus,
      timestamp: nowIso,
      note: params.note || `Switched status to ${params.newStatus.toUpperCase()}`
    });

    this.recordSpExecution('sp_get_workforce_hours_by_role_clearance');

    const configuredVisibleRoles = this.getConfigValue<string[]>(
      'WORKFORCE_HOURS_VISIBLE_ROLES',
      DEFAULT_WORKFORCE_HOURS_VISIBLE_ROLES
    );
    const canSeeHours = canViewWorkforceHours(params.userRole, configuredVisibleRoles);

    return {
      success: true,
      record: canSeeHours
        ? record
        : {
            ...record,
            availableMinutesToday: 0,
            offlineMinutesToday: 0,
            availableHoursFormatted: '',
            offlineHoursFormatted: '',
            workingHoursCompliancePct: 0
          }
    };
  }

  // --- 9. WORKING HOURS CONFIGURATION (Permission-Driven: MANAGE_WORKING_HOURS) ---
  public getWorkingHours(): OrganizationWorkingHoursConfig {
    return this.workingHours;
  }

  public canUserManageWorkingHours(role?: string, userId?: string): boolean {
    if (userId) {
      const userRecord = SEED_SECURITY_USERS.find(u => u.id === userId);
      if (userRecord) {
        return this.securityEngine.hasPermission(userRecord.role, 'MANAGE_WORKING_HOURS');
      }
    }
    if (!role) return false;
    return this.securityEngine.hasPermission(role as any, 'MANAGE_WORKING_HOURS');
  }

  public updateWorkingHours(params: {
    startTime: string;
    endTime: string;
    timezone?: string;
    workingDays?: string[];
    actorName: string;
    actorRole: string;
    actorUserId?: string;
    targetUserId?: string;
  }): { success: boolean; config?: OrganizationWorkingHoursConfig; error?: string } {
    // Enforce permission-based access control via MANAGE_WORKING_HOURS (no hardcoded role names)
    if (!this.canUserManageWorkingHours(params.actorRole, params.actorUserId)) {
      return {
        success: false,
        error: `Permission Denied: Your role lacks the required 'MANAGE_WORKING_HOURS' permission to set or update working hours.`
      };
    }

    // If configuring working hours for a specific target user, verify subordinate reporting relationship
    if (
      params.targetUserId &&
      params.actorUserId &&
      params.targetUserId !== params.actorUserId &&
      !this.securityEngine.hasPermission(params.actorRole as any, 'admin:system_config')
    ) {
      const allowedTargetIds = this.securityEngine.getSubordinateUserIds(params.actorUserId, true);
      if (!allowedTargetIds.includes(params.targetUserId)) {
        return {
          success: false,
          error: `Reporting Hierarchy Violation: You can only configure working hours for users who report to you directly or indirectly.`
        };
      }
    }

    const formatTime12h = (t: string) => {
      const [hh, mm] = (t || '09:00').split(':').map(Number);
      const suffix = hh >= 12 ? 'PM' : 'AM';
      const h12 = hh % 12 === 0 ? 12 : hh % 12;
      return `${h12.toString().padStart(2, '0')}:${(mm || 0).toString().padStart(2, '0')} ${suffix}`;
    };

    const [startH, startM] = (params.startTime || '09:00').split(':').map(Number);
    const [endH, endM] = (params.endTime || '18:00').split(':').map(Number);
    if ((endH * 60 + (endM || 0)) <= (startH * 60 + (startM || 0))) {
      return {
        success: false,
        error: 'Working hours End Time must be later than Start Time.'
      };
    }
    const totalHours = Math.max(1, +(((endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0))) / 60).toFixed(1));

    this.workingHours = {
      startTime: params.startTime || '09:00',
      endTime: params.endTime || '18:00',
      displayLabel: `${formatTime12h(params.startTime || '09:00')} – ${formatTime12h(params.endTime || '18:00')} IST`,
      timezone: params.timezone || 'Asia/Kolkata (IST, UTC+05:30)',
      totalDailyHours: totalHours,
      workingDays:
        params.workingDays && params.workingDays.length > 0
          ? params.workingDays
          : this.workingHours.workingDays,
      updatedBy: params.actorName,
      updatedByRole: params.actorRole,
      updatedAt: new Date().toISOString()
    };

    const startCfg = this.systemConfigs.get('WORKING_HOURS_START_IST');
    if (startCfg) startCfg.value = this.workingHours.startTime;
    const endCfg = this.systemConfigs.get('WORKING_HOURS_END_IST');
    if (endCfg) endCfg.value = this.workingHours.endTime;

    return { success: true, config: this.workingHours };
  }
}
