/**
 * Student Lifecycle CRM - Analytics, Dashboards, Reporting & Notification Types
 * Primary Source of Truth for Role-Based Dashboards, Metric Calculations,
 * Audit-friendly Reporting, and Multi-channel Notification Architecture.
 */

import { LifecycleStage, UserRole } from './crm';
import { BusinessRole } from './security';

// ===========================================================================
// 1. DASHBOARD DOMAIN TYPES (11 ROLES)
// ===========================================================================

export type DashboardRole = 
  | 'ceo_management'
  | 'counselor'
  | 'admissions'
  | 'documentation'
  | 'application_team'
  | 'finance'
  | 'visa_team'
  | 'operations'
  | 'travel_desk'
  | 'student_success'
  | 'student_portal';

export interface DashboardRoleInfo {
  role: DashboardRole;
  title: string;
  department: string;
  permittedBusinessRoles: BusinessRole[];
  description: string;
  badgeColor: string;
}

export const DASHBOARD_ROLES_CATALOG: DashboardRoleInfo[] = [
  {
    role: 'ceo_management',
    title: 'CEO & Executive Management',
    department: 'Executive Leadership',
    permittedBusinessRoles: ['super_admin', 'ceo_management'],
    description: 'Macro funnel conversion rates, branch revenue, destination country share, and staff performance.',
    badgeColor: 'purple'
  },
  {
    role: 'counselor',
    title: 'Student Counsellor',
    department: 'Counselling & Acquisition',
    permittedBusinessRoles: ['super_admin', 'counselor', 'ceo_management'],
    description: 'Assigned active leads, hot inquiries, callback queue, student onboarding conversion, and daily meetings.',
    badgeColor: 'blue'
  },
  {
    role: 'admissions',
    title: 'Admissions Desk',
    department: 'University Admissions',
    permittedBusinessRoles: ['super_admin', 'admissions_team', 'ceo_management'],
    description: 'Shortlist evaluations, university entry qualifications, conditional offers, and CAS/I-20 clearance.',
    badgeColor: 'indigo'
  },
  {
    role: 'documentation',
    title: 'Documentation Team',
    department: 'Documentation & Compliance',
    permittedBusinessRoles: ['super_admin', 'documentation_team', 'aps_executive', 'ceo_management'],
    description: 'Document vault verification backlog, German APS credential status, and automated upload reminder logs.',
    badgeColor: 'violet'
  },
  {
    role: 'application_team',
    title: 'Application Operations Team',
    department: 'Application Processing',
    permittedBusinessRoles: ['super_admin', 'application_executive', 'admissions_team', 'ceo_management'],
    description: 'Portal submissions, prerequisite checklists, SOP/LOR turnaround, application fee waivers, and portal tracking.',
    badgeColor: 'rose'
  },
  {
    role: 'finance',
    title: 'Finance & Accounts',
    department: 'Financial Operations',
    permittedBusinessRoles: ['super_admin', 'finance_team', 'loan_executive', 'ceo_management'],
    description: 'Registration fee collections, university tuition deposits, forex card load volumes, and education loan sanctions.',
    badgeColor: 'emerald'
  },
  {
    role: 'visa_team',
    title: 'Visa & Consular Team',
    department: 'Visa Operations',
    permittedBusinessRoles: ['super_admin', 'visa_team', 'ceo_management'],
    description: 'Consulate appointment slots, mock interview scoring, biometric tracking, visa approval rates, and stamp verification.',
    badgeColor: 'teal'
  },
  {
    role: 'operations',
    title: 'Branch Operations & SLA Management',
    department: 'Operations & Quality Control',
    permittedBusinessRoles: ['super_admin', 'ceo_management'],
    description: 'End-to-end SLA breaches, bottleneck analysis, staff caseload capacity, and overdue stage escalations.',
    badgeColor: 'amber'
  },
  {
    role: 'travel_desk',
    title: 'Travel Desk & Ticketing',
    department: 'Travel & Logistics',
    permittedBusinessRoles: ['super_admin', 'travel_desk', 'ceo_management'],
    description: 'Pre-departure clearance gates, flight option comparisons, verified payment PNR issuance, and airport pickups.',
    badgeColor: 'sky'
  },
  {
    role: 'student_success',
    title: 'Student Success & Post-Landing',
    department: 'Post-Landing Services',
    permittedBusinessRoles: ['super_admin', 'student_success', 'support_executive', 'ceo_management'],
    description: '9 post-landing service milestones, arrival confirmations, housing support, emergency tickets, and feedback rating.',
    badgeColor: 'fuchsia'
  },
  {
    role: 'student_portal',
    title: 'Student & Parent Portal',
    department: 'Student Self-Service',
    permittedBusinessRoles: ['super_admin', 'student', 'parent', 'counselor'],
    description: 'Personal application status, uploaded documents, visa milestone progress, flight e-tickets, and emergency helpdesk.',
    badgeColor: 'emerald'
  }
];

// ===========================================================================
// 2. METRICS & ANALYTICS DOMAIN TYPES
// ===========================================================================

export interface GlobalMetricsSummary {
  totalLeads: number;
  hotLeads: number;
  activeStudents: number;
  registeredStudents: number;
  applicationsSubmitted: number;
  offersReceived: number;
  visaApprovedCount: number;
  visaPendingCount: number;
  visaRejectedCount: number;
  studentsDeparted: number;
  studentsLanded: number;
  
  // Funnel Conversion Rates
  conversionRates: {
    leadToCounsellingPct: number;
    counsellingToRegistrationPct: number;
    registrationToApplicationPct: number;
    applicationToOfferPct: number;
    offerToVisaPct: number;
    visaToDeparturePct: number;
    overallLeadToDeparturePct: number;
  };

  // Pending & Overdue Tasks
  tasksSummary: {
    totalPendingTasks: number;
    overdueTasksCount: number;
    criticalSlaBreaches: number;
  };

  // Document & Service Progress
  documentCompletionPct: number;
  serviceProgressPct: number;

  // Financial Tracking
  financialTracking: {
    totalRegistrationFeesInr: number;
    totalTuitionDepositsInr: number;
    totalFlightPaymentsInr: number;
    totalForexDisbursedInr: number;
    totalRevenueRecognizedInr: number;
    pendingReceiptsCount: number;
  };

  // Country & Intake Distribution
  countryBreakdown: Record<string, number>;
  intakeBreakdown: Record<string, number>;
  stageBreakdown: Record<string, number>;
  
  // Team Performance
  teamPerformance: TeamMemberPerformance[];
}

export interface TeamMemberPerformance {
  userId: string;
  name: string;
  role: string;
  branch: string;
  assignedCount: number;
  completedCount: number;
  conversionRatePct: number;
  slaAdherencePct: number;
  ratingScore: number;
}

// Role Specific Dashboard Data Payloads
export interface RoleDashboardData {
  role: DashboardRole;
  generatedAt: string;
  userClearance: string;
  metrics: Record<string, any>;
  kpis: Array<{
    id: string;
    label: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon: string;
  }>;
  alerts: Array<{
    id: string;
    level: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    timestamp: string;
    entityId?: string;
    actionLabel?: string;
  }>;
  roleSpecificData: any;
}

// ===========================================================================
// 3. REPORTING & AUDIT EXPORT TYPES
// ===========================================================================

export interface ReportFilterCriteria {
  dateRangePreset: 'all' | 'last_7_days' | 'last_30_days' | 'this_quarter' | 'year_to_date' | 'custom';
  startDate?: string;
  endDate?: string;
  countries?: string[];
  intakeSeasons?: string[];
  staffUserIds?: string[];
  branches?: string[];
  stages?: LifecycleStage[];
  statusFilter?: string;
}

export type ReportType = 
  | 'student_lifecycle_master'
  | 'lead_conversion_funnel'
  | 'application_and_offers'
  | 'visa_operations_audit'
  | 'financial_reconciliation'
  | 'sla_and_overdue_tasks'
  | 'travel_and_post_landing';

export interface ReportDefinition {
  id: ReportType;
  title: string;
  category: 'Strategic' | 'Operational' | 'Financial' | 'Compliance';
  description: string;
  allowedRoles: BusinessRole[];
  exportFormats: ('csv' | 'json' | 'audit_pdf')[];
}

export interface GeneratedReportResult {
  reportId: string;
  reportType: ReportType;
  title: string;
  generatedAt: string;
  generatedBy: {
    userId: string;
    name: string;
    role: string;
  };
  filtersApplied: ReportFilterCriteria;
  totalRecords: number;
  summaryStatistics: Record<string, any>;
  columns: Array<{ key: string; label: string; type: 'string' | 'number' | 'date' | 'currency' | 'status' }>;
  records: Record<string, any>[];
  auditChecksum: string;
}

// ===========================================================================
// 4. NOTIFICATION FRAMEWORK TYPES
// ===========================================================================

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent_sla';

export type NotificationDeliveryStatus = 
  | 'queued'
  | 'dispatched'
  | 'delivered'
  | 'read'
  | 'failed';

export interface NotificationTemplate {
  id: string;
  name: string;
  eventType: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  subjectTemplate?: string;
  bodyTemplate: string;
  whatsappTemplateName?: string;
  whatsappNamespace?: string;
  whatsappLanguageCode?: string;
  requiredVariables: string[];
  cooldownWindowMinutes: number; // For duplicate suppression
}

export interface NotificationDispatchPayload {
  recipientId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientRole: BusinessRole | 'student' | 'parent';
  templateId: string;
  channel: NotificationChannel;
  variables: Record<string, string | number>;
  referenceEntity?: {
    type: 'student' | 'lead' | 'application' | 'offer' | 'visa' | 'ticket' | 'payment';
    id: string;
    refNo?: string;
  };
  scheduledFor?: string;
  bypassDuplicateCheck?: boolean;
}

export interface NotificationRecord {
  id: string;
  dispatchFingerprint: string; // Hash of recipient + template + entityId + time window
  recipientId: string;
  recipientName: string;
  recipientDestination: string; // email, phone, or user_id
  recipientRole: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  subject?: string;
  content: string;
  templateId: string;
  entityReference?: {
    type: string;
    id: string;
    refNo?: string;
  };
  status: NotificationDeliveryStatus;
  retryCount: number;
  maxRetries: number;
  deliveryAttempts: Array<{
    attemptNumber: number;
    timestamp: string;
    gatewayResponse: string;
    success: boolean;
    errorCode?: string;
  }>;
  createdAt: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  readAt?: string;
  isReadInApp?: boolean;
  isRead?: boolean;
  bodyPreview?: string;
  meetLink?: string;
  joinPortalUrl?: string;
  sentAt?: string;
  failureReason?: string;
  meta?: Record<string, any>;
}

// WhatsApp Specific Delivery Payload (Meta Cloud API architecture)
export interface WhatsAppCloudApiPayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string; // E.164 format
  type: 'template' | 'text';
  template?: {
    name: string;
    language: { code: string };
    components: Array<{
      type: 'header' | 'body' | 'button';
      sub_type?: string;
      parameters: Array<{
        type: 'text' | 'currency' | 'date_time';
        text?: string;
      }>;
    }>;
  };
  text?: {
    preview_url: boolean;
    body: string;
  };
}

// Test Runner Result
export interface AnalyticsTestResult {
  id: string;
  name: string;
  category: 'Authorization' | 'Reporting' | 'Notifications' | 'Deduplication' | 'SLA Alerts';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
}
