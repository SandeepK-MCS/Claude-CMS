export interface BrandingConfig {
  appName: string;
  tagline: string;
  shortTag: string;
  legalName: string;
  supportEmail: string;
  helpline: string;
  accentTheme: string;
  logoUrl: string;
  logoIcon: string;
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  appName: "Student Lifecycle CRM",
  tagline: "Student Lifecycle & Admissions Portal",
  shortTag: "Enterprise Suite",
  legalName: "Admissions & Educational Consultancies Ltd.",
  supportEmail: "support@crm-portal.com",
  helpline: "+91 1800 200 4642 (24x7 Support Desk)",
  accentTheme: "indigo",
  logoUrl: "",
  logoIcon: "GraduationCap",
  updatedAt: new Date().toISOString(),
  updatedBy: "System Default"
};
