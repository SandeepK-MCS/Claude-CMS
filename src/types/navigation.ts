export interface NavItem {
  id: string;
  label: string;
  description: string;
  category: 'overview' | 'counselling' | 'admissions' | 'consular' | 'devops';
  icon: string;
  allowedRoles: string[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboards",
    label: "Dashboards & Overview",
    description: "Role-tailored metrics, pipeline funnels, and exportable audit reports",
    category: "overview",
    icon: "LayoutDashboard",
    allowedRoles: ["master_super_admin", "super_admin", "branch_manager", "counselor", "processing_officer", "visa_officer", "finance_officer", "student"]
  },
  {
    id: "journey",
    label: "Study Abroad Journey & S-Curve",
    description: "Track student progress milestones, S-Curve velocity, and multi-tier counselling lifecycle",
    category: "overview",
    icon: "TrendingUp",
    allowedRoles: ["master_super_admin", "super_admin", "branch_manager", "counselor", "student"]
  },
  {
    id: "leads",
    label: "Leads & Inquiries",
    description: "Lead capture, first call log, and registration conversion",
    category: "counselling",
    icon: "UserPlus",
    allowedRoles: ["master_super_admin", "super_admin", "branch_manager", "counselor", "finance_officer"]
  },
  {
    id: "meetings_workforce",
    label: "Meetings & Call Hub",
    description: "Schedule and manage counselling sessions",
    category: "counselling",
    icon: "PlayCircle",
    allowedRoles: ["master_super_admin", "super_admin", "branch_manager", "counselor", "processing_officer", "visa_officer", "finance_officer"]
  },
  {
    id: "profile_analysis",
    label: "Profile & GPA Analysis",
    description: "Bavarian GPA calculator, aptitude score evaluation, and country eligibility",
    category: "counselling",
    icon: "GraduationCap",
    allowedRoles: ["master_super_admin", "super_admin", "counselor", "processing_officer"]
  },
  {
    id: "shortlisting",
    label: "University Shortlisting",
    description: "Ambitious, Moderate, Safe program selection and admissions criteria",
    category: "counselling",
    icon: "Building2",
    allowedRoles: ["master_super_admin", "super_admin", "branch_manager", "counselor", "processing_officer", "student"]
  },
  {
    id: "documentation",
    label: "Document Vault",
    description: "Student document checklists, compliance audits, and verification status",
    category: "admissions",
    icon: "FileCheck",
    allowedRoles: ["master_super_admin", "super_admin", "counselor", "processing_officer", "visa_officer", "student"]
  },
  {
    id: "applications",
    label: "University Applications",
    description: "Direct overseas university submissions, SOP/LOR review, and portal IDs",
    category: "admissions",
    icon: "Briefcase",
    allowedRoles: ["master_super_admin", "super_admin", "branch_manager", "processing_officer", "student"]
  },
  {
    id: "offers",
    label: "Offer Desk & Deposits",
    description: "Conditional & unconditional admission letters, tuition deposits, and decision lock",
    category: "admissions",
    icon: "Award",
    allowedRoles: ["master_super_admin", "super_admin", "processing_officer", "finance_officer", "student"]
  },
  {
    id: "services_visa",
    label: "Visa & Services Desk",
    description: "VFS/Consulate appointment booking, mock interview grading, and visa tracking",
    category: "consular",
    icon: "Plane",
    allowedRoles: ["master_super_admin", "super_admin", "branch_manager", "visa_officer", "student"]
  },
  {
    id: "travel_landing",
    label: "Travel & Post-Landing",
    description: "Flight ticketing, forex card disbursement, airport pickup, and accommodation",
    category: "consular",
    icon: "Compass",
    allowedRoles: ["master_super_admin", "super_admin", "visa_officer", "finance_officer", "student"]
  },
  {
    id: "pipeline",
    label: "Student 360° Directory",
    description: "13-stage lifecycle board, search directory, and student 360° inspector",
    category: "overview",
    icon: "Users",
    allowedRoles: ["master_super_admin", "super_admin", "branch_manager", "counselor", "processing_officer", "visa_officer", "finance_officer"]
  },
  {
    id: "master_data",
    label: "Master Updates",
    description: "Roles, Permissions, Users, Reporting Structure, Working Hours Configuration & Catalogs",
    category: "overview",
    icon: "Building2",
    allowedRoles: ["master_super_admin", "super_admin", "branch_manager"]
  },
  {
    id: "database",
    label: "Database Architecture & Pool",
    description: "PostgreSQL GMI- prefixed schema, stored procedures, live connection pool, and vendor migration engine",
    category: "devops",
    icon: "Database",
    allowedRoles: ["master_super_admin"]
  },
  {
    id: "security",
    label: "Security & Access Control",
    description: "RBAC matrix, simulated cyber attack drills, HMAC vault, and audit ledger",
    category: "devops",
    icon: "Shield",
    allowedRoles: ["master_super_admin"]
  },
  {
    id: "test_suite",
    label: "System Compliance Test Suite",
    description: "16 synthetic test scenarios covering Bavarian GPA, IDOR protection, and SLA escalations",
    category: "devops",
    icon: "PlayCircle",
    allowedRoles: ["master_super_admin"]
  },
  {
    id: "architecture",
    label: "System Blueprint & Schemas",
    description: "Entity relationships, dual-mode state machines, and API sequence diagrams",
    category: "devops",
    icon: "Layers",
    allowedRoles: ["master_super_admin"]
  },
  {
    id: "roadmap",
    label: "Production Audit & Roadmap",
    description: "SOC2/GDPR compliance checklist, SLA configuration, and architectural milestones",
    category: "devops",
    icon: "FileCheck",
    allowedRoles: ["master_super_admin"]
  }
];

export function isTabAllowed(tabId: string, role: string, sessionRole?: string, sessionEmail?: string): boolean {
  const item = NAV_ITEMS.find((i) => i.id === tabId);
  if (!item) return false;
  const normalizedEmail = (sessionEmail || "").toLowerCase().trim();
  const isDeveloperEmail =
    !sessionEmail ||
    normalizedEmail === "dev.master@crm.internal" ||
    normalizedEmail === "developer@crm-portal.com" ||
    normalizedEmail === "master_developer";
  const isDeveloperOnly = role === "master_super_admin" && sessionRole === "master_super_admin" && isDeveloperEmail;

  if (item.category === "devops") {
    return isDeveloperOnly;
  }
  if (role === "super_admin" || isDeveloperOnly || sessionRole === "super_admin") {
    return true;
  }
  return item.allowedRoles.includes(role);
}

export function getDefaultTabForRole(role: string): string {
  switch (role) {
    case "master_super_admin":
      return "dashboards";
    case "visa_officer":
      return "services_visa";
    case "counselor":
      return "leads";
    case "processing_officer":
      return "applications";
    case "finance_officer":
      return "dashboards";
    case "student":
      return "journey";
    case "branch_manager":
    case "super_admin":
    default:
      return "dashboards";
  }
}
