/**
 * Student Lifecycle CRM - Canonical Lead Capture & Ingestion Constants
 * Single Source of Truth for Database Persistence, Form Dropdowns, Filters, and Normalization
 */

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  category?: string;
  badge?: string;
  description?: string;
}

// ===========================================================================
// 1. ALL 11 CANONICAL LEAD SOURCES (Matches crm.lead_sources and PostgreSQL ENUM/Codes)
// ===========================================================================

export const CANONICAL_LEAD_SOURCES = [
  { value: 'website', label: 'Website Inquiry Form', category: 'Digital', channel: 'Digital', dbCode: 'WEBSITE', defaultTemperature: 'hot' as const },
  { value: 'google_ads', label: 'Google Ads (Search & Display)', category: 'Digital', channel: 'Digital', dbCode: 'GOOGLE_ADS', defaultTemperature: 'hot' as const },
  { value: 'instagram', label: 'Instagram Ads & DMs', category: 'Digital', channel: 'Digital', dbCode: 'INSTAGRAM', defaultTemperature: 'hot' as const },
  { value: 'facebook', label: 'Facebook Lead Gen Form', category: 'Digital', channel: 'Digital', dbCode: 'FACEBOOK', defaultTemperature: 'hot' as const },
  { value: 'whatsapp', label: 'WhatsApp Official Chatbot', category: 'Direct', channel: 'Digital', dbCode: 'WHATSAPP', defaultTemperature: 'hot' as const },
  { value: 'walk_in', label: 'Branch Walk-in', category: 'Offline', channel: 'Direct', dbCode: 'WALK_IN', defaultTemperature: 'hot' as const },
  { value: 'phone_call', label: 'Direct Phone / Inbound Toll-free', category: 'Direct', channel: 'Direct', dbCode: 'PHONE_CALL', defaultTemperature: 'hot' as const },
  { value: 'college_visits', label: 'Campus / College Visit Seminar', category: 'Offline', channel: 'Offline', dbCode: 'COLLEGE_VISITS', defaultTemperature: 'warm' as const },
  { value: 'education_fairs', label: 'Study Abroad Education Fair', category: 'Offline', channel: 'Offline', dbCode: 'EDUCATION_FAIRS', defaultTemperature: 'warm' as const },
  { value: 'events', label: 'Webinars & Spot Assessment Events', category: 'Digital', channel: 'Offline', dbCode: 'EVENTS', defaultTemperature: 'warm' as const },
  { value: 'referral', label: 'Alumni / Student Referral', category: 'Direct', channel: 'Direct', dbCode: 'REFERRAL', defaultTemperature: 'warm' as const },
  { value: 'cold_calling', label: 'Outbound Telecalling / Bulk Database', category: 'Offline', channel: 'Offline', dbCode: 'COLD_CALLING', defaultTemperature: 'cold' as const }
] as const;

export type CanonicalLeadSource = string;

/**
 * Normalizer for database backwards compatibility / legacy form entries
 * Guarantees that any legacy string (e.g. 'website_form', 'google_search', 'education_fair')
 * is mapped cleanly to the canonical database code, while preserving any custom database lead source.
 */
export function normalizeLeadSource(source: string | undefined | null): CanonicalLeadSource {
  if (!source) return 'website';
  const clean = source.toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_');
  if (clean === 'website_form' || clean === 'web') return 'website';
  if (clean === 'google_search' || clean === 'google') return 'google_ads';
  if (clean === 'education_fair' || clean === 'fair') return 'education_fairs';
  if (clean === 'college_visit') return 'college_visits';
  if (clean === 'meta_ads' || clean === 'meta') return 'facebook';
  if (clean === 'phone' || clean === 'call') return 'phone_call';
  if (clean === 'insta') return 'instagram';

  return clean || 'website';
}

// ===========================================================================
// 2. CANONICAL TARGET COUNTRIES (GMI 6 Core Study Abroad Destinations)
// ===========================================================================

export const CANONICAL_TARGET_COUNTRIES: DropdownOption[] = [
  { value: 'Germany', label: 'Germany (Specialized European Desk)', badge: 'APS Required' },
  { value: 'United Kingdom', label: 'United Kingdom', badge: '1-Yr Masters' },
  { value: 'United States', label: 'United States', badge: 'STEM OPT' },
  { value: 'Canada', label: 'Canada', badge: 'PGWP' },
  { value: 'Australia', label: 'Australia', badge: 'PR Pathways' },
  { value: 'Ireland', label: 'Ireland', badge: 'Tech Hub' }
];

// ===========================================================================
// 3. CANONICAL TARGET DEGREES
// ===========================================================================

export const CANONICAL_TARGET_DEGREES: DropdownOption[] = [
  { value: 'Masters', label: 'Masters (MS / MSc / MA)' },
  { value: 'Bachelors', label: 'Bachelors (UG / BSc / BA / BEng)' },
  { value: 'MBA', label: 'MBA / Executive Management' },
  { value: 'PhD', label: 'PhD / Doctorate Research' }
];

// ===========================================================================
// 4. CANONICAL PHYSICAL BRANCHES
// ===========================================================================

export const CANONICAL_BRANCHES: DropdownOption[] = [
  { value: 'Hyderabad - Head Office', label: 'Corporate HQ - Hyderabad' },
  { value: 'Hyderabad - Banjara Hills', label: 'Hyderabad - Banjara Hills' },
  { value: 'Bangalore - Indiranagar', label: 'Bangalore - Indiranagar' },
  { value: 'New Delhi - Connaught Place', label: 'New Delhi - Connaught Place' },
  { value: 'Mumbai - Bandra', label: 'Mumbai - Bandra' }
];

// ===========================================================================
// 5. CANONICAL TARGET INTAKE SEASONS & YEARS
// ===========================================================================

export const CANONICAL_INTAKE_SEASONS: DropdownOption[] = [
  { value: 'Fall', label: 'Fall Intake (Aug - Oct)' },
  { value: 'Spring', label: 'Spring Intake (Jan - Mar)' },
  { value: 'Summer', label: 'Summer Intake (May - Jul)' }
];

export const CANONICAL_INTAKE_YEARS = [2026, 2027, 2028] as const;

// ===========================================================================
// 6. CANONICAL LEAD PRIORITIES
// ===========================================================================

export const CANONICAL_LEAD_PRIORITIES: DropdownOption[] = [
  { value: 'hot', label: 'Hot (High Intent - Follow up < 1 hr)' },
  { value: 'warm', label: 'Warm (Moderate Intent - Follow up < 4 hrs)' },
  { value: 'cold', label: 'Cold (General Nurturing Queue)' }
];

// ===========================================================================
// 7. CANONICAL LEAD STATUSES
// ===========================================================================

export const CANONICAL_LEAD_STATUSES: DropdownOption[] = [
  { value: 'new', label: 'New Inbound Inquiry' },
  { value: 'contact_in_progress', label: 'Contact In Progress' },
  { value: 'qualified', label: 'Qualified Prospect' },
  { value: 'counselling_scheduled', label: 'Counselling Scheduled' },
  { value: 'counselled', label: 'Counselled' },
  { value: 'registered', label: 'Registered (Payment Verified)' },
  { value: 'lost', label: 'Lost Lead' },
  { value: 'merged', label: 'Merged Duplicate' }
];

// ===========================================================================
// 8. CANONICAL CALL REACHABILITY & DISPOSITIONS
// ===========================================================================

export const CANONICAL_CALL_DISPOSITIONS = {
  reachable: [
    { value: 'call_answered', label: 'Call Answered & Discussed' },
    { value: 'requested_callback', label: 'Requested Callback at Specific Time' }
  ],
  not_reachable: [
    { value: 'busy_not_picked', label: 'Ringing / Busy Not Answered' },
    { value: 'switched_off', label: 'Phone Switched Off / Unreachable' },
    { value: 'wrong_number', label: 'Wrong / Invalid Number' }
  ]
} as const;

// ===========================================================================
// 9. CANONICAL ENGLISH PROFICIENCY TESTS
// ===========================================================================

export const CANONICAL_ENGLISH_TEST_STATUSES: DropdownOption[] = [
  { value: 'completed', label: 'IELTS / TOEFL / PTE / Duolingo Completed' },
  { value: 'scheduled', label: 'Test Date Scheduled' },
  { value: 'needs_coaching', label: 'Enrolled / Needs GMI Test Prep Coaching' },
  { value: 'not_required', label: 'Waived / English Medium of Instruction' }
];
