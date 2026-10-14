/**
 * Student Lifecycle CRM - Security & Access Control Domain Types
 * 
 * Enterprise RBAC, Permission Matrix, Cryptographic Vault Tokens,
 * Sensitive PII Protection, and Immutable Audit Logging.
 */

export type BusinessRole = 
  | 'master_super_admin'
  | 'super_admin'
  | 'ceo_management'
  | 'cfo_management'
  | 'cso_management'
  | 'branch_manager'
  | 'counselor'
  | 'admissions_team'
  | 'documentation_team'
  | 'application_executive'
  | 'finance_team'
  | 'loan_executive'
  | 'aps_executive'
  | 'visa_team'
  | 'student_success'
  | 'travel_desk'
  | 'support_executive'
  | 'student'
  | 'parent';

export interface BusinessRoleMetadata {
  id: BusinessRole;
  title: string;
  department: string;
  description: string;
  clearanceLevel: 'Executive' | 'Management' | 'Operational' | 'External';
  defaultBranch?: string;
  color: string;
}

export const BUSINESS_ROLES_CATALOG: BusinessRoleMetadata[] = [
  {
    id: 'master_super_admin',
    title: 'Master Super Admin (Developer)',
    department: 'DevOps, Architecture & Platform Engineering',
    description: 'Highest platform authority for developer testing, Governance & DevOps suites, low-level database management, and synthetic regression workflows.',
    clearanceLevel: 'Executive',
    color: 'emerald'
  },
  {
    id: 'super_admin',
    title: 'Super Administrator',
    department: 'IT & Information Security',
    description: 'Full administrative control, global branch oversight, role configuration, and audit access.',
    clearanceLevel: 'Executive',
    color: 'red'
  },
  {
    id: 'ceo_management',
    title: 'CEO / Management',
    department: 'Executive Leadership',
    description: 'Strategic pipeline visibility, working hours governance, conversion analytics, and cross-branch reporting.',
    clearanceLevel: 'Executive',
    color: 'purple'
  },
  {
    id: 'cfo_management',
    title: 'CFO (Chief Financial Officer)',
    department: 'Executive Finance & Treasury',
    description: 'Global financial oversight, working hours configuration, Google Meet scheduling, and fee reconciliation.',
    clearanceLevel: 'Executive',
    color: 'emerald'
  },
  {
    id: 'cso_management',
    title: 'CSO (Chief Strategy / Sales Officer)',
    department: 'Executive Strategy & Sales',
    description: 'National sales & counseling SLA oversight, working hours configuration, Google Meet scheduling, and counselor attendance escalation.',
    clearanceLevel: 'Executive',
    color: 'indigo'
  },
  {
    id: 'branch_manager',
    title: 'Branch Operations Manager',
    department: 'Regional Branch Operations',
    description: 'Supervises branch counselors, receives missed meeting escalations, monitors staff availability hours, and schedules Google Meets.',
    clearanceLevel: 'Management',
    color: 'amber'
  },
  {
    id: 'counselor',
    title: 'Counsellor',
    department: 'Student Counselling',
    description: 'Inquiry conversion, student profile evaluation, shortlisting, and local branch caseload ownership.',
    clearanceLevel: 'Operational',
    color: 'blue'
  },
  {
    id: 'admissions_team',
    title: 'Admissions Team',
    department: 'University Admissions',
    description: 'Application portfolio evaluation, entry requirements validation, and admission offer liaison.',
    clearanceLevel: 'Operational',
    color: 'indigo'
  },
  {
    id: 'documentation_team',
    title: 'Documentation Team',
    department: 'Verification & Compliance',
    description: 'Academic transcript auditing, notary coordination, SOP/LOR checks, and document approval/rejection.',
    clearanceLevel: 'Operational',
    color: 'violet'
  },
  {
    id: 'application_executive',
    title: 'Application Executive',
    department: 'Admissions Operations',
    description: 'Direct portal submissions to overseas universities, waiver applications, and tracking reference IDs.',
    clearanceLevel: 'Operational',
    color: 'cyan'
  },
  {
    id: 'finance_team',
    title: 'Finance Team',
    department: 'Accounts & Billing',
    description: 'Token fee invoicing, GST compliance, consulting fee tracking, refund processing, and audit reconciliation.',
    clearanceLevel: 'Operational',
    color: 'emerald'
  },
  {
    id: 'loan_executive',
    title: 'Loan Executive',
    department: 'Financial Services',
    description: 'Education loan processing with partner banks (HDFC Credila, SBI, Prodigy), sanction letter collection.',
    clearanceLevel: 'Operational',
    color: 'teal'
  },
  {
    id: 'aps_executive',
    title: 'APS Executive',
    department: 'German Academic Evaluation',
    description: 'German APS certificate verification, Professor verification liaison, and India APS token tracking.',
    clearanceLevel: 'Operational',
    color: 'amber'
  },
  {
    id: 'visa_team',
    title: 'Visa Team',
    department: 'Immigration & Compliance',
    description: 'Embassy file preparation, VFS biometric slots, financial documentation verification, and mock interviews.',
    clearanceLevel: 'Operational',
    color: 'rose'
  },
  {
    id: 'student_success',
    title: 'Student Success Team',
    department: 'Student Experience',
    description: 'Post-acceptance mentoring, university pre-registration, milestone adherence, and onboarding support.',
    clearanceLevel: 'Operational',
    color: 'sky'
  },
  {
    id: 'travel_desk',
    title: 'Travel Desk',
    department: 'Logistics & Forex',
    description: 'Flight ticketing, student forex cards, international SIM cards, overseas insurance, and housing.',
    clearanceLevel: 'Operational',
    color: 'orange'
  },
  {
    id: 'support_executive',
    title: 'Support Executive',
    department: 'Client Support',
    description: 'Escalation ticket management, query resolution, student complaints, and emergency helpline.',
    clearanceLevel: 'Operational',
    color: 'slate'
  },
  {
    id: 'student',
    title: 'Student',
    department: 'Applicant (Self-Service)',
    description: 'Authenticated student self-service portal. Strictly isolated to their own master record.',
    clearanceLevel: 'External',
    color: 'emerald'
  },
  {
    id: 'parent',
    title: 'Parent / Sponsor',
    department: 'Family / Sponsor (Gated)',
    description: 'Restricted, read-only portal view enabled strictly when student explicitly authorises parental access.',
    clearanceLevel: 'External',
    color: 'pink'
  }
];

export type PermissionAction =
  // Student Master Profile
  | 'students:read_all'
  | 'students:read_assigned'
  | 'students:read_branch'
  | 'students:read_own'
  | 'students:create'
  | 'students:edit_personal'
  | 'students:transition_stage'
  | 'students:assign_staff'
  
  // Sensitive PII
  | 'sensitive_pii:view_passport'
  | 'sensitive_pii:view_aadhaar_pan'
  | 'sensitive_pii:view_financials'
  
  // Documents & Vault
  | 'documents:upload'
  | 'documents:verify'
  | 'documents:reject'
  | 'documents:download_academic'
  | 'documents:download_financial'
  | 'documents:download_vault_presigned'
  
  // Applications & Offers
  | 'applications:create'
  | 'applications:submit'
  | 'applications:update_status'
  | 'applications:confirm_offer'
  
  // Financials & Loans
  | 'financials:view_invoices'
  | 'financials:create_invoice'
  | 'financials:record_payment'
  | 'financials:refund'
  | 'financials:manage_loans'
  
  // APS & Visa
  | 'visa_aps:manage_aps'
  | 'visa_aps:manage_visa'
  | 'visa_aps:conduct_mock_interview'
  
  // Travel & Value Added Services
  | 'travel:manage_logistics'
  | 'travel:forex_sim'
  
  // System Administration & Audit
  | 'audit:read'
  | 'audit:export'
  | 'admin:manage_roles'
  | 'admin:system_config'

  // Workforce, Working Hours & Hierarchy Permissions
  | 'MANAGE_WORKING_HOURS'
  | 'VIEW_TEAM_AVAILABILITY'
  | 'MANAGE_ASSIGNMENT_RULES'
  | 'VIEW_SUBORDINATE_DATA'
  | 'REASSIGN_LEADS'
  | 'MANAGE_USERS'
  | 'MANAGE_ROLES';

export interface DatabaseRoleRecord {
  roleId: number;
  roleName: string;
  roleCode: BusinessRole;
  roleLevel: number;
  parentRoleId: number | null;
  department: string;
  description: string;
  isActive: boolean;
  createdDate: string;
  updatedDate: string;
  permissions: PermissionAction[];
}

export interface UserReportingHierarchyNode {
  userId: string;
  userName: string;
  email: string;
  roleId: number;
  roleCode: BusinessRole;
  roleName: string;
  roleLevel?: number;
  parentRoleId: number | null;
  reportsToUserId: string | null;
  reportsToUserName?: string | null;
  reportsToRoleName?: string | null;
  branch: string;
  isActive: boolean;
  createdDate: string;
  updatedDate: string;
  directSubordinateIds: string[];
  allSubordinateIds: string[];
}

export interface PermissionDefinition {
  action: PermissionAction;
  category: 'Students' | 'PII & Identity' | 'Document Vault' | 'Applications' | 'Financials' | 'Visa & APS' | 'Logistics' | 'Audit & Admin' | 'Workforce & Hierarchy';
  label: string;
  description: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

export const PERMISSIONS_CATALOG: PermissionDefinition[] = [
  // Workforce & Hierarchy
  { action: 'MANAGE_WORKING_HOURS', category: 'Workforce & Hierarchy', label: 'Manage Working Hours & Availability', description: 'Set working hours, update shift timings, configure working days, and manage staff availability.', riskLevel: 'High' },
  { action: 'VIEW_TEAM_AVAILABILITY', category: 'Workforce & Hierarchy', label: 'View Team Counsellor Availability', description: 'View availability, bandwidth, and 7-day schedules of reporting team members and counsellors.', riskLevel: 'Medium' },
  { action: 'MANAGE_ASSIGNMENT_RULES', category: 'Workforce & Hierarchy', label: 'Manage Assignment Rules & Routing', description: 'View and configure backend lead assignment rules, round-robin algorithms, and routing logic.', riskLevel: 'High' },
  { action: 'VIEW_SUBORDINATE_DATA', category: 'Workforce & Hierarchy', label: 'View Subordinate Team Data', description: 'Access leads, students, and meetings of direct and indirect reporting staff.', riskLevel: 'Medium' },
  { action: 'REASSIGN_LEADS', category: 'Workforce & Hierarchy', label: 'Reassign Leads & Counsellors', description: 'Reassign leads and student profiles across counsellors in the reporting hierarchy.', riskLevel: 'High' },
  { action: 'MANAGE_ROLES', category: 'Workforce & Hierarchy', label: 'Manage Role Hierarchy & Permissions', description: 'Configure database roles, ParentRoleId relationships, and role permissions.', riskLevel: 'Critical' },
  { action: 'MANAGE_USERS', category: 'Workforce & Hierarchy', label: 'Manage Users & Reporting Structure', description: 'Create/edit user accounts and assign ReportsToUserId reporting managers.', riskLevel: 'Critical' },

  // Students
  { action: 'students:read_all', category: 'Students', label: 'View All Students (Global)', description: 'Unrestricted read across all national branches and counselors.', riskLevel: 'High' },
  { action: 'students:read_branch', category: 'Students', label: 'View Branch Students', description: 'Read student records belonging to assigned branch office.', riskLevel: 'Medium' },
  { action: 'students:read_assigned', category: 'Students', label: 'View Assigned Caseload', description: 'Read records explicitly assigned to counselor/officer ID.', riskLevel: 'Low' },
  { action: 'students:read_own', category: 'Students', label: 'View Own Student Profile', description: 'Student self-service access to own master file.', riskLevel: 'Low' },
  { action: 'students:create', category: 'Students', label: 'Create Student / Lead', description: 'Register new inquiries and student master profiles.', riskLevel: 'Medium' },
  { action: 'students:edit_personal', category: 'Students', label: 'Edit Personal & Contact Info', description: 'Update addresses, names, and contact channels.', riskLevel: 'Medium' },
  { action: 'students:transition_stage', category: 'Students', label: 'Progress Lifecycle Stage', description: 'Approve student movement between 13 lifecycle milestones.', riskLevel: 'High' },
  { action: 'students:assign_staff', category: 'Students', label: 'Reassign Staff & Caseload', description: 'Reassign student to different counselor or processing officer.', riskLevel: 'High' },

  // PII
  { action: 'sensitive_pii:view_passport', category: 'PII & Identity', label: 'View Unmasked Passport Number', description: 'Decrypt and display raw passport number (otherwise J****892).', riskLevel: 'High' },
  { action: 'sensitive_pii:view_aadhaar_pan', category: 'PII & Identity', label: 'View Unmasked Aadhaar & PAN', description: 'Decrypt and display raw government tax and identity numbers.', riskLevel: 'Critical' },
  { action: 'sensitive_pii:view_financials', category: 'PII & Identity', label: 'View Student Bank & Sponsor Details', description: 'Access confidential sponsor financial statements and ITRs.', riskLevel: 'High' },

  // Document Vault
  { action: 'documents:upload', category: 'Document Vault', label: 'Upload Documents to Vault', description: 'Upload raw PDFs and scans to encrypted storage.', riskLevel: 'Low' },
  { action: 'documents:verify', category: 'Document Vault', label: 'Verify & Approve Documents', description: 'Mark submitted credentials as verified compliance assets.', riskLevel: 'Medium' },
  { action: 'documents:reject', category: 'Document Vault', label: 'Reject Documents with Notes', description: 'Flag substandard or unreadable files for resubmission.', riskLevel: 'Low' },
  { action: 'documents:download_academic', category: 'Document Vault', label: 'Download Academic Transcripts', description: 'Generate short-lived token to download degrees and marks sheets.', riskLevel: 'Medium' },
  { action: 'documents:download_financial', category: 'Document Vault', label: 'Download Financial & Bank Docs', description: 'Generate token for sponsor bank statements & sanction letters.', riskLevel: 'High' },
  { action: 'documents:download_vault_presigned', category: 'Document Vault', label: 'Generate Presigned Vault Download', description: 'Issue 60-second temporary signed token for object streaming.', riskLevel: 'Medium' },

  // Applications
  { action: 'applications:create', category: 'Applications', label: 'Create University Application', description: 'Draft ambitious/moderate/safe university application files.', riskLevel: 'Medium' },
  { action: 'applications:submit', category: 'Applications', label: 'Submit Overseas Application', description: 'File completed dossier to partner university application portal.', riskLevel: 'High' },
  { action: 'applications:update_status', category: 'Applications', label: 'Update Application Status', description: 'Record offer, interview request, or rejection from university.', riskLevel: 'Medium' },
  { action: 'applications:confirm_offer', category: 'Applications', label: 'Confirm Final Admission', description: 'Enforce single final enrolled university admission record.', riskLevel: 'High' },

  // Financials
  { action: 'financials:view_invoices', category: 'Financials', label: 'View Invoices & Receipts', description: 'Inspect token fee invoices, GST tax invoices, and receipts.', riskLevel: 'Medium' },
  { action: 'financials:create_invoice', category: 'Financials', label: 'Generate Fee Invoice', description: 'Issue formal GST consulting and registration fee invoice.', riskLevel: 'High' },
  { action: 'financials:record_payment', category: 'Financials', label: 'Record Received Payment', description: 'Log NEFT/UPI/Gateway payment receipt with reference number.', riskLevel: 'High' },
  { action: 'financials:refund', category: 'Financials', label: 'Authorize Fee Refund', description: 'Process registration deposit refund under cancellation terms.', riskLevel: 'Critical' },
  { action: 'financials:manage_loans', category: 'Financials', label: 'Manage Education Loans', description: 'Liaise with HDFC Credila/SBI, update loan sanction amounts.', riskLevel: 'Medium' },

  // Visa & APS
  { action: 'visa_aps:manage_aps', category: 'Visa & APS', label: 'Manage Germany APS Certificate', description: 'Track Germany APS verification tokens and academic checks.', riskLevel: 'Medium' },
  { action: 'visa_aps:manage_visa', category: 'Visa & APS', label: 'Manage Visa File & Embassy Slot', description: 'Compile CAS/I-20 visa dossier and book VFS biometrics.', riskLevel: 'High' },
  { action: 'visa_aps:conduct_mock_interview', category: 'Visa & APS', label: 'Conduct Visa Mock Interview', description: 'Evaluate mock interview performance and record feedback.', riskLevel: 'Low' },

  // Logistics
  { action: 'travel:manage_logistics', category: 'Logistics', label: 'Manage Flight & Housing', description: 'Coordinate flight itineraries, student housing, and airport pickup.', riskLevel: 'Medium' },
  { action: 'travel:forex_sim', category: 'Logistics', label: 'Issue Forex & SIM Card', description: 'Distribute student international debit cards and UK/EU SIM cards.', riskLevel: 'Low' },

  // Audit & Admin
  { action: 'audit:read', category: 'Audit & Admin', label: 'Inspect Immutable Audit Trail', description: 'Query chronological log of staff actions, PII views, and logins.', riskLevel: 'High' },
  { action: 'audit:export', category: 'Audit & Admin', label: 'Export Audit Log for Compliance', description: 'Export tamper-evident audit evidence for DPDP Act 2023.', riskLevel: 'Critical' },
  { action: 'admin:manage_roles', category: 'Audit & Admin', label: 'Configure RBAC & Staff Accounts', description: 'Create staff users, assign roles, and modify permissions.', riskLevel: 'Critical' },
  { action: 'admin:system_config', category: 'Audit & Admin', label: 'System Configuration', description: 'Manage branch directories, SLA thresholds, and integrations.', riskLevel: 'Critical' }
];

/**
 * Confirmed Default Role-Permission Matrix (Precise Baseline)
 * Note: MANAGE_WORKING_HOURS, VIEW_TEAM_AVAILABILITY, and MANAGE_ASSIGNMENT_RULES are strictly granted
 * only to higher-level management/admin roles, NEVER to Counsellor or lower-level operational/external roles.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<BusinessRole, PermissionAction[]> = {
  master_super_admin: [
    'MANAGE_WORKING_HOURS', 'VIEW_TEAM_AVAILABILITY', 'MANAGE_ASSIGNMENT_RULES', 'VIEW_SUBORDINATE_DATA', 'REASSIGN_LEADS', 'MANAGE_USERS', 'MANAGE_ROLES',
    'students:read_all', 'students:read_branch', 'students:read_assigned', 'students:create',
    'students:edit_personal', 'students:transition_stage', 'students:assign_staff',
    'sensitive_pii:view_passport', 'sensitive_pii:view_aadhaar_pan', 'sensitive_pii:view_financials',
    'documents:upload', 'documents:verify', 'documents:reject', 'documents:download_academic',
    'documents:download_financial', 'documents:download_vault_presigned',
    'applications:create', 'applications:submit', 'applications:update_status', 'applications:confirm_offer',
    'financials:view_invoices', 'financials:create_invoice', 'financials:record_payment', 'financials:refund', 'financials:manage_loans',
    'visa_aps:manage_aps', 'visa_aps:manage_visa', 'visa_aps:conduct_mock_interview',
    'travel:manage_logistics', 'travel:forex_sim',
    'audit:read', 'audit:export', 'admin:manage_roles', 'admin:system_config'
  ],

  super_admin: [
    'MANAGE_WORKING_HOURS', 'VIEW_TEAM_AVAILABILITY', 'MANAGE_ASSIGNMENT_RULES', 'VIEW_SUBORDINATE_DATA', 'REASSIGN_LEADS', 'MANAGE_USERS', 'MANAGE_ROLES',
    'students:read_all', 'students:read_branch', 'students:read_assigned', 'students:create',
    'students:edit_personal', 'students:transition_stage', 'students:assign_staff',
    'sensitive_pii:view_passport', 'sensitive_pii:view_aadhaar_pan', 'sensitive_pii:view_financials',
    'documents:upload', 'documents:verify', 'documents:reject', 'documents:download_academic',
    'documents:download_financial', 'documents:download_vault_presigned',
    'applications:create', 'applications:submit', 'applications:update_status', 'applications:confirm_offer',
    'financials:view_invoices', 'financials:create_invoice', 'financials:record_payment', 'financials:refund', 'financials:manage_loans',
    'visa_aps:manage_aps', 'visa_aps:manage_visa', 'visa_aps:conduct_mock_interview',
    'travel:manage_logistics', 'travel:forex_sim',
    'audit:read', 'audit:export', 'admin:manage_roles', 'admin:system_config'
  ],

  ceo_management: [
    'MANAGE_WORKING_HOURS', 'VIEW_TEAM_AVAILABILITY', 'MANAGE_ASSIGNMENT_RULES', 'VIEW_SUBORDINATE_DATA', 'REASSIGN_LEADS', 'MANAGE_USERS', 'MANAGE_ROLES',
    'students:read_all', 'students:read_branch', 'students:create',
    'sensitive_pii:view_passport', 'sensitive_pii:view_financials',
    'documents:download_academic', 'documents:download_financial', 'documents:download_vault_presigned',
    'applications:update_status', 'financials:view_invoices',
    'audit:read', 'audit:export', 'admin:system_config'
  ],

  cfo_management: [
    'MANAGE_WORKING_HOURS', 'VIEW_TEAM_AVAILABILITY', 'MANAGE_ASSIGNMENT_RULES', 'VIEW_SUBORDINATE_DATA', 'REASSIGN_LEADS',
    'students:read_all', 'students:read_branch',
    'sensitive_pii:view_financials',
    'documents:download_financial', 'documents:download_vault_presigned',
    'financials:view_invoices', 'financials:create_invoice', 'financials:record_payment', 'financials:refund', 'financials:manage_loans',
    'audit:read', 'audit:export', 'admin:system_config'
  ],

  cso_management: [
    'MANAGE_WORKING_HOURS', 'VIEW_TEAM_AVAILABILITY', 'MANAGE_ASSIGNMENT_RULES', 'VIEW_SUBORDINATE_DATA', 'REASSIGN_LEADS',
    'students:read_all', 'students:read_branch', 'students:create', 'students:transition_stage', 'students:assign_staff',
    'sensitive_pii:view_passport',
    'documents:download_academic', 'documents:download_vault_presigned',
    'applications:create', 'applications:update_status',
    'audit:read', 'admin:system_config'
  ],

  branch_manager: [
    'MANAGE_WORKING_HOURS', 'VIEW_TEAM_AVAILABILITY', 'MANAGE_ASSIGNMENT_RULES', 'VIEW_SUBORDINATE_DATA', 'REASSIGN_LEADS',
    'students:read_all', 'students:read_branch', 'students:read_assigned', 'students:create',
    'students:edit_personal', 'students:transition_stage', 'students:assign_staff',
    'sensitive_pii:view_passport',
    'documents:upload', 'documents:download_academic', 'documents:download_vault_presigned',
    'applications:create', 'applications:submit', 'applications:update_status', 'applications:confirm_offer',
    'financials:view_invoices', 'audit:read'
  ],

  counselor: [
    'students:read_assigned', 'students:create',
    'students:edit_personal', 'students:transition_stage',
    'sensitive_pii:view_passport',
    'documents:upload', 'documents:download_academic', 'documents:download_vault_presigned',
    'applications:create', 'applications:confirm_offer',
    'financials:view_invoices'
  ],

  admissions_team: [
    'students:read_all', 'students:read_assigned', 'students:transition_stage',
    'sensitive_pii:view_passport',
    'documents:download_academic', 'documents:download_vault_presigned',
    'applications:create', 'applications:submit', 'applications:update_status', 'applications:confirm_offer'
  ],

  documentation_team: [
    'students:read_assigned', 'students:read_branch',
    'sensitive_pii:view_passport', 'sensitive_pii:view_aadhaar_pan',
    'documents:upload', 'documents:verify', 'documents:reject',
    'documents:download_academic', 'documents:download_financial', 'documents:download_vault_presigned'
  ],

  application_executive: [
    'students:read_assigned',
    'sensitive_pii:view_passport',
    'documents:download_academic', 'documents:download_vault_presigned',
    'applications:submit', 'applications:update_status'
  ],

  finance_team: [
    'students:read_all',
    'sensitive_pii:view_financials',
    'documents:download_financial', 'documents:download_vault_presigned',
    'financials:view_invoices', 'financials:create_invoice', 'financials:record_payment', 'financials:refund'
  ],

  loan_executive: [
    'students:read_assigned',
    'sensitive_pii:view_financials', 'sensitive_pii:view_aadhaar_pan',
    'documents:upload', 'documents:download_financial', 'documents:download_vault_presigned',
    'financials:view_invoices', 'financials:manage_loans'
  ],

  aps_executive: [
    'students:read_assigned',
    'sensitive_pii:view_passport',
    'documents:download_academic', 'documents:download_vault_presigned',
    'visa_aps:manage_aps'
  ],

  visa_team: [
    'students:read_assigned', 'students:transition_stage',
    'sensitive_pii:view_passport', 'sensitive_pii:view_financials',
    'documents:download_academic', 'documents:download_financial', 'documents:download_vault_presigned',
    'visa_aps:manage_visa', 'visa_aps:conduct_mock_interview'
  ],

  student_success: [
    'students:read_assigned', 'students:transition_stage',
    'documents:download_academic', 'documents:download_vault_presigned',
    'travel:manage_logistics'
  ],

  travel_desk: [
    'students:read_assigned',
    'sensitive_pii:view_passport',
    'travel:manage_logistics', 'travel:forex_sim'
  ],

  support_executive: [
    'students:read_assigned',
    'documents:upload'
  ],

  student: [
    'students:read_own',
    'documents:upload',
    'documents:download_academic', 'documents:download_vault_presigned'
  ],

  parent: [
    'students:read_own',
    'financials:view_invoices',
    'documents:download_academic', 'documents:download_vault_presigned'
  ]
};

export interface AuthenticatedUserSession {
  userId: string;
  name: string;
  email: string;
  role: BusinessRole;
  roleId?: number;
  reportsToUserId?: string | null;
  permissions?: PermissionAction[];
  branch: string;
  token: string;
  studentId?: string; // If role is student or parent
  parentEmail?: string;
  portalAccessAuthorized?: boolean; // For parent role
  issuedAt: string;
  expiresAt: string;
  clientType?: 'mobile' | 'web';
  isFirstLogin?: boolean;
  lastActivityAt?: string;
}

export function sessionHasPermission(
  session: AuthenticatedUserSession | null | undefined,
  permission: PermissionAction,
  roleFallback?: string
): boolean {
  if (session?.permissions && Array.isArray(session.permissions)) {
    return session.permissions.includes(permission);
  }
  const roleKey = (session?.role || roleFallback) as BusinessRole | undefined;
  if (roleKey && DEFAULT_ROLE_PERMISSIONS[roleKey]) {
    return DEFAULT_ROLE_PERMISSIONS[roleKey].includes(permission);
  }
  return false;
}

export interface SecurityAuditRecord {
  id: string;
  timestamp: string;
  eventType: 
    | 'AUTH_LOGIN_SUCCESS'
    | 'AUTH_LOGIN_FAILURE'
    | 'AUTH_LOGOUT'
    | 'PASSWORD_RESET_REQUESTED'
    | 'PASSWORD_RESET_COMPLETED'
    | 'PERMISSION_MODIFIED'
    | 'DOCUMENT_UPLOADED'
    | 'DOCUMENT_VERIFIED'
    | 'DOCUMENT_REJECTED'
    | 'DOCUMENT_DOWNLOAD_TOKEN_ISSUED'
    | 'DOCUMENT_DOWNLOADED'
    | 'STAGE_TRANSITION_COMMITTED'
    | 'FINANCIAL_INVOICE_CREATED'
    | 'FINANCIAL_PAYMENT_RECORDED'
    | 'SENSITIVE_PII_ACCESSED'
    | 'SECURITY_ACCESS_DENIED'
    | 'HORIZONTAL_ESCALATION_BLOCKED'
    | 'VERTICAL_ESCALATION_BLOCKED'
    | 'IDOR_PREVENTED'
    | 'LEAD_INGESTED'
    | 'LEAD_ESCALATED'
    | 'LEAD_MERGED'
    | 'LEAD_LOST'
    | 'COUNSELLING_COMPLETED'
    | 'PAYMENT_VERIFICATION_FAILED'
    | 'STUDENT_REGISTERED'
    | 'DOCUMENT_STATUS_UPDATED'
    | 'DOCUMENT_WAIVED'
    | 'DOCUMENT_REUPLOADED'
    | 'DOCUMENT_REMINDER_SENT'
    | 'DOCUMENT_REMINDER_ESCALATED'
    | 'PROFILE_ANALYSIS_EVALUATED'
    | 'PROFILE_ANALYSIS_APPROVED'
    | 'SERVICE_TRIGGERED'
    | 'SERVICE_TRIGGER_DUPLICATE_PREVENTED'
    | 'DATABASE_CONNECTION_UPDATED'
    | 'DATABASE_CONNECTION_MIGRATED'
    | 'SYSTEM_BRANDING_UPDATED';
  actorId: string;
  actorName: string;
  actorRole: BusinessRole;
  actorIp: string;
  targetEntity: string;
  targetId?: string;
  details: string;
  severity: 'INFO' | 'WARN' | 'SECURITY_VIOLATION' | 'CRITICAL';
}

export interface PresignedVaultDownloadToken {
  token: string;
  documentId: string;
  documentName: string;
  studentId: string;
  issuedToUserId: string;
  issuedToRole: BusinessRole;
  expiresAt: string;
  isUsed: boolean;
  downloadUrl: string;
}

export interface SecurityTestScenarioResult {
  id: string;
  name: string;
  category: 
    | 'Authentication' 
    | 'Horizontal Escalation' 
    | 'Vertical Escalation' 
    | 'IDOR & Cross-Student' 
    | 'Server-Side Validation' 
    | 'Sensitive Data Leakage' 
    | 'Session Invalidation' 
    | 'Audit Immutability';
  endpointTested: string;
  httpMethod: string;
  simulatedRole: BusinessRole;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  evidence: string;
  remediation: string;
}

export interface SecurityChecklistControl {
  id: string;
  domain: 'Authentication' | 'Access Control' | 'Sensitive Data' | 'Audit Trails' | 'Infrastructure & Ops';
  controlName: string;
  standardRequirement: string;
  implementationType: 'Application Code (Verified)' | 'Cloud / Infrastructure (External)' | 'Manual Governance';
  status: 'VERIFIED_IN_CODE' | 'REQUIRES_INFRASTRUCTURE' | 'REQUIRES_MANUAL_AUDIT';
  details: string;
}

/**
 * PII Masking Utilities
 */
export function maskPassport(passport?: string): string {
  if (!passport || passport.length < 4) return '••••••••';
  return `${passport.slice(0, 1)}••••${passport.slice(-3)}`;
}

export function maskAadhaar(aadhaar?: string): string {
  if (!aadhaar) return 'XXXX-XXXX-XXXX';
  const clean = aadhaar.replace(/\s+/g, '');
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

export function maskPan(pan?: string): string {
  if (!pan || pan.length < 5) return 'XXXXX••••X';
  return `${pan.slice(0, 2)}•••${pan.slice(-2)}`;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '••••••••••';
  return `${phone.slice(0, 3)} •••• ••${phone.slice(-2)}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '••••@••••.com';
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}••••@${domain}`;
}
