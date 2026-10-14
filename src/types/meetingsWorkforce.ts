/**
 * Multi-Provider Meeting Scheduling (Google Workspace, Microsoft 365, Zoho),
 * Attendance Tracking, Hierarchy Escalation, Candidate No-Show Follow-Up,
 * and Staff Working Hours / Availability Types
 */

import { DEFAULT_ROLE_PERMISSIONS, BusinessRole, PermissionAction } from './security.ts';

export type MeetingProviderCode = 'GOOGLE' | 'MICROSOFT' | 'ZOHO';

export interface MeetingProviderConfiguration {
  id: number;
  tenantId: string;
  providerName: string; // 'Google' | 'Microsoft' | 'Zoho'
  providerCode: MeetingProviderCode;
  calendarServiceName: string; // 'Google Calendar' | 'Microsoft Calendar' | 'Zoho Calendar'
  meetingServiceName: string;  // 'Google Meet' | 'Microsoft Teams' | 'Zoho Meeting'
  connectButtonLabel: string;  // 'Connect Google Calendar' | 'Connect Microsoft Calendar' | 'Connect Zoho Calendar'
  connectedStatusLabel: string; // 'Google Calendar' | 'Microsoft Calendar' | 'Zoho Calendar'
  isEnabled: boolean;
  isDefault: boolean;
  clientId?: string;
  /**
   * Provider-specific tenant/directory identifier (e.g. Microsoft Entra Tenant ID or 'common').
   * Note: ClientSecret is strictly server-side encrypted at rest (AES-256-GCM) and NEVER returned to the frontend.
   */
  providerTenantId?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  redirectUri?: string;
  scopes?: string[];
  additionalConfiguration?: {
    zohoRegion?: 'IN' | 'US' | 'EU' | 'AU';
    zohoSoid?: string;
    allowSharedSchedulerFallback?: boolean;
    [key: string]: any;
  };
  hasClientId?: boolean;
  hasClientSecret?: boolean;
  clientSecretMasked?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserMeetingProviderAuthStatus {
  tenantId: string;
  crmUserId: string;
  crmUserEmail?: string;
  providerCode: MeetingProviderCode;
  providerName: string;
  calendarServiceName: string;
  meetingServiceName: string;
  connectButtonLabel: string;
  connectedStatusLabel: string;
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'EXPIRED';
  isConnected: boolean;
  connectedEmail?: string;
  connectedName?: string;
  connectedAt?: string;
  lastUsedAt?: string;
  hasRefreshToken?: boolean;
  grantedScopes?: string[];
}

export type MeetingReminderInterval = '60_min' | '30_min' | '15_min' | '0_min';

export interface MeetingReminderCheckpoint {
  interval: MeetingReminderInterval;
  label: string; // '1 Hour Before', '30 Mins Before', '15 Mins Before', 'On Time (0 Min)'
  minutesBefore: number;
  sentToCandidate: boolean;
  sentToCounselor: boolean;
  sentAt?: string;
}

export type CandidateNoShowStatus =
  | 'Reschedule Requested'
  | 'Switched Off / Unreachable'
  | 'Candidate Busy - Call Back Later'
  | 'Technical / Network Issue'
  | 'Not Interested / Dropped';

export interface CandidateNoShowDisposition {
  status: CandidateNoShowStatus;
  remarks: string;
  followUpEmailSent: boolean;
  followUpEmailSentAt?: string;
  followUpCallLogged: boolean;
  updatedBy: string;
  updatedAt: string;
}

export type GoogleMeetStatus =
  | 'scheduled'
  | 'rescheduled'
  | 'in_progress'
  | 'completed'
  | 'counselor_missed'
  | 'candidate_no_show'
  | 'cancelled'
  | 'invalid_link_requires_recreation';

export interface GoogleMeetSession {
  id: string;
  tenantId?: string;
  providerCode?: MeetingProviderCode;
  providerName?: string;
  calendarServiceName?: string;
  meetingServiceName?: string;
  providerEventId?: string;
  providerCalendarWebLink?: string;
  meetingCode: string;
  meetLink: string;
  joinPortalUrl?: string;
  googleCalendarUrl: string;
  gmailComposeUrl?: string;
  emailDeliveryStatus?: 'sent_smtp' | 'calendar_link_ready';
  title: string;
  agenda: string;

  // Candidate Details
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateWhatsapp: string;
  candidateCity?: string;
  targetCountry: string;
  targetDegree?: string;
  targetIntake: string;

  // Scheduler Details (Counselor or above: CEO, CFO, CSO, Branch Manager, Super Admin)
  schedulerId: string;
  schedulerName: string;
  schedulerEmail: string;
  schedulerRole: string;

  // Assigned Counselor Details
  assignedCounselorId: string;
  assignedCounselorName: string;
  assignedCounselorEmail: string;
  assignedCounselorBranch: string;

  // Higher Hierarchy Escalation Contact
  higherHierarchyId: string;
  higherHierarchyName: string;
  higherHierarchyEmail: string;
  higherHierarchyRole: string;

  // Timing & Calendar Blocking
  scheduledStartAt: string; // ISO
  scheduledEndAt: string;   // ISO
  durationMinutes: number;
  timezone: string;
  status: GoogleMeetStatus;
  rescheduleCount: number;
  lastRescheduledReason?: string;

  // Calendar & Email Invite Verification
  calendarBlockedForScheduler: boolean;
  calendarBlockedForCandidate: boolean;
  icsInviteGenerated: boolean;
  schedulerInviteSentAt: string;
  candidateInviteSentAt: string;

  // 4-Stage Automated Reminder Notifications (1 hr, 30 min, 15 min, On Time)
  reminders: MeetingReminderCheckpoint[];

  // Counselor Join Verification (Must join from application button)
  counselorJoined: boolean;
  counselorJoinedAt?: string;
  counselorJoinedFromApp: boolean;
  counselorJoinIp?: string;

  // Escalation if Counselor Misses Meeting
  counselorMissedEscalated: boolean;
  counselorMissedEscalatedAt?: string;
  counselorMissedEscalatedTo?: string;
  counselorMissedEscalationNote?: string;

  // Candidate Join & No-Show Disposition
  candidateJoined: boolean;
  candidateJoinedAt?: string;
  candidateNoShowDisposition?: CandidateNoShowDisposition;

  createdAt: string;
  updatedAt: string;
}

export interface MeetingNotificationRecord {
  id: string;
  meetingId: string;
  meetingCode?: string;
  meetLink?: string;
  joinPortalUrl?: string;
  type:
    | 'MEETING_INVITE_CALENDAR_BLOCK'
    | 'MEETING_RESCHEDULED_CALENDAR_BLOCK'
    | 'REMINDER_60_MIN'
    | 'REMINDER_30_MIN'
    | 'REMINDER_15_MIN'
    | 'REMINDER_ON_TIME'
    | 'COUNSELOR_MISSED_ESCALATION'
    | 'CANDIDATE_NO_SHOW_EMAIL';
  recipientId?: string;
  recipientName: string;
  recipientEmail: string;
  recipientRole: 'candidate' | 'counselor' | 'higher_hierarchy' | 'scheduler';
  subject: string;
  message: string;
  sentAt: string;
  isRead?: boolean;
  channel: 'Email & Calendar (.ics)' | 'In-App & Email Reminder' | 'Hierarchy Escalation Alert' | 'Candidate Follow-Up Email';
}

export type StaffPresenceStatus = 'available' | 'offline';

export interface StaffStatusTransitionLog {
  status: StaffPresenceStatus;
  timestamp: string;
  note?: string;
}

export interface StaffAvailabilityRecord {
  userId: string;
  staffUserId?: string;
  name: string;
  staffName?: string;
  email: string;
  role: string;
  staffRole?: string;
  roleLabel: string;
  branch: string;
  currentStatus: StaffPresenceStatus;
  lastStatusChangedAt: string;
  availableMinutesToday: number;
  offlineMinutesToday: number;
  availableHoursFormatted: string;
  offlineHoursFormatted: string;
  workingHoursCompliancePct: number;
  reportsToName: string;
  reportsToRole: string;
  statusHistoryToday: StaffStatusTransitionLog[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: string[];
  slotDurationMinutes?: number;
  bufferMinutes?: number;
  timezone?: string;
}

export interface OrganizationWorkingHoursConfig {
  startTime: string;     // Default "09:00"
  endTime: string;       // Default "18:00"
  displayLabel?: string; // Default "09:00 AM – 06:00 PM IST"
  timezone: string;      // Default "Asia/Kolkata (IST, UTC+05:30)"
  totalDailyHours?: number; // Default 9
  workingDays: string[];
  updatedBy: string;
  updatedByRole?: string;
  updatedAt: string;
}

export type WorkingHoursConfiguration = OrganizationWorkingHoursConfig;

export const ROLES_ALLOWED_TO_SCHEDULE_MEETINGS: string[] = [
  'counselor',
  'branch_manager',
  'ceo_management',
  'cfo_management',
  'cso_management',
  'super_admin',
  'master_super_admin',
  'admissions_team',
  'processing_officer',
  'visa_team',
  'visa_officer'
];

export const ROLES_ALLOWED_TO_CONFIGURE_WORKING_HOURS: string[] = Object.entries(DEFAULT_ROLE_PERMISSIONS)
  .filter(([, perms]) => perms.includes('MANAGE_WORKING_HOURS'))
  .map(([role]) => role);

export interface HierarchyRoleMappingRecord {
  id: number;
  roleId: string;
  roleLabel: string;
  roleName?: string;
  hierarchyLevel: number;
  reportsToRoleId: string;
  reportsToRoleLabel: string;
  reportsToRoleName?: string;
  escalationRecipientEmail: string;
  escalationRecipientEmails?: string[];
  canViewHierarchyReports: boolean;
  canViewReports?: boolean;
  allowedScreens: string[];
  isActive: boolean;
  updatedAt: string;
}

export const DEFAULT_WORKFORCE_HOURS_VISIBLE_ROLES: string[] = [
  'ceo_management',
  'cfo_management',
  'cso_management',
  'super_admin',
  'master_super_admin'
];

export const HIGHER_HIERARCHY_ROLES: string[] = [
  'branch_manager',
  'ceo_management',
  'cfo_management',
  'cso_management',
  'super_admin',
  'master_super_admin'
];

export interface SystemConfigRecord {
  key: string;
  category:
    | 'Multi-Tenant Schema & Domain'
    | 'Governance & Role Security'
    | 'Workforce & Privacy'
    | 'Meetings & Calendar'
    | 'Document Vault & Upload Limits'
    | 'Lead & SLA Governance'
    | 'Academic GPA & Shortlisting'
    | 'Finance & Tax Rules'
    | 'Visa, APS & Travel Rules';
  label: string;
  value: any;
  valueType: 'string' | 'number' | 'boolean' | 'string_array' | 'number_array';
  description: string;
  dbTable?: string;
  linkedStoredProcedure?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface StoredProcedureRecord {
  name: string;
  module:
    | 'Multi-Tenant & Governance'
    | 'Meetings & Calendar'
    | 'Workforce & Presence'
    | 'Leads & Registration'
    | 'Academic GPA & Admissions'
    | 'Document Vault'
    | 'Finance, Visa & Lifecycle';
  description: string;
  parametersSignature: string;
  sqlDefinition: string;
  linkedConfigKeys: string[];
  targetTables: string[];
  executionCount: number;
  lastExecutedAt: string;
  updatedBy: string;
  updatedAt: string;
}

export function canScheduleGoogleMeet(role?: string, allowedRoles?: string[]): boolean {
  if (!role) return false;
  const list = allowedRoles && allowedRoles.length > 0 ? allowedRoles : ROLES_ALLOWED_TO_SCHEDULE_MEETINGS;
  return list.includes(role);
}

export function canConfigureWorkingHours(
  roleOrPermissions?: string | PermissionAction[],
  explicitPermissions?: PermissionAction[]
): boolean {
  if (Array.isArray(roleOrPermissions)) {
    return roleOrPermissions.includes('MANAGE_WORKING_HOURS');
  }
  if (Array.isArray(explicitPermissions)) {
    return explicitPermissions.includes('MANAGE_WORKING_HOURS');
  }
  if (!roleOrPermissions) return false;
  const rolePerms = DEFAULT_ROLE_PERMISSIONS[roleOrPermissions as BusinessRole] || [];
  return rolePerms.includes('MANAGE_WORKING_HOURS');
}

export function canViewWorkforceHours(role?: string, configuredAllowedRoles?: string[]): boolean {
  if (!role) return false;
  const list =
    configuredAllowedRoles && configuredAllowedRoles.length > 0
      ? configuredAllowedRoles
      : DEFAULT_WORKFORCE_HOURS_VISIBLE_ROLES;
  return list.includes(role);
}

export function isHigherHierarchyRole(role?: string): boolean {
  if (!role) return false;
  return HIGHER_HIERARCHY_ROLES.includes(role);
}

