/**
 * Shared Lead Validation, CGPA/Percentage Normalization, and CSV/Excel Template Engine
 * Used by both Frontend (React UI) and Backend (Express API & LeadRegistrationEngine)
 */

export const SAMPLE_LEAD_TEMPLATE_HEADERS = [
  'Lead Source *',
  'First Name *',
  'Last Name',
  'Email Address *',
  'Mobile Phone *',
  'Target Country',
  'Target Degree',
  'Intake',
  'Intake Year',
  'Budget Cap',
  'Requires Education Loan Assistance',
  'CGPA / Percentage'
] as const;

export const SAMPLE_LEAD_TEMPLATE_ROWS: string[][] = [
  [
    'Website Inquiry Form',
    'Aarav',
    'Verma',
    'aarav.verma@example.com',
    '+91 98450 22334',
    'Germany',
    'Masters',
    'Fall',
    '2026',
    '25',
    'Yes',
    '8.6 CGPA'
  ],
  [
    'Google Ads',
    'Meera',
    'Krishnan',
    'meera.krishnan@example.com',
    '+91 98112 33445',
    'United Kingdom',
    'Masters',
    'Fall',
    '2026',
    '35',
    'No',
    '84.5%'
  ]
];

export interface CgpaParseResult {
  valid: boolean;
  isEmpty: boolean;
  formatted: string;
  numericValue?: number;
  scoreType?: 'gpa_10' | 'gpa_4' | 'percentage';
  error?: string;
}

/**
 * Validates and parses a flexible "CGPA / Percentage" value.
 * Supports formats like: "8.5", "8.5 CGPA", "8.5/10", "3.6/4", "3.6 GPA", "82%", "82.5", "78.4 %"
 */
export function parseAndValidateCgpaOrPercentage(
  raw: string | number | undefined | null
): CgpaParseResult {
  if (raw === undefined || raw === null) {
    return { valid: true, isEmpty: true, formatted: '' };
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return { valid: true, isEmpty: true, formatted: '' };
  }

  // Match number + optional "/10", "/4", "/100" + optional unit ("%", "cgpa", "gpa", "percent", "percentage")
  const match = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*(?:\/\s*(10(?:\.0+)?|4(?:\.0+)?|100(?:\.0+)?))?\s*(%|percent|percentage|cgpa|gpa)?$/i
  );

  if (!match) {
    return {
      valid: false,
      isEmpty: false,
      formatted: trimmed,
      error:
        'Invalid CGPA / Percentage format. Enter a numeric CGPA (e.g. 8.5 or 8.5 CGPA) or Percentage (e.g. 82% or 82.5).'
    };
  }

  const num = parseFloat(match[1]);
  const denom = match[2] ? parseFloat(match[2]) : undefined;
  const unit = (match[3] || '').toLowerCase();

  if (isNaN(num) || num <= 0 || num > 100) {
    return {
      valid: false,
      isEmpty: false,
      formatted: trimmed,
      error: 'CGPA / Percentage must be greater than 0 and at most 100.'
    };
  }

  if ((unit === 'cgpa' || denom === 10) && num > 10) {
    return {
      valid: false,
      isEmpty: false,
      formatted: trimmed,
      error: 'CGPA on a 10-point scale cannot exceed 10.0.'
    };
  }

  if (denom === 4 && num > 4) {
    return {
      valid: false,
      isEmpty: false,
      formatted: trimmed,
      error: 'GPA on a 4.0 scale cannot exceed 4.0.'
    };
  }

  if (unit === 'gpa' && num > 10) {
    return {
      valid: false,
      isEmpty: false,
      formatted: trimmed,
      error: 'GPA cannot exceed 10.0.'
    };
  }

  let scoreType: 'gpa_10' | 'gpa_4' | 'percentage' = 'gpa_10';
  let formatted = trimmed;

  if (unit === '%' || unit === 'percent' || unit === 'percentage' || denom === 100 || num > 10) {
    scoreType = 'percentage';
    formatted = `${num}%`;
  } else if (denom === 4 || (unit === 'gpa' && num <= 4)) {
    scoreType = 'gpa_4';
    formatted = unit === 'gpa' ? `${num} GPA` : denom === 4 ? `${num}/4.0` : `${num} CGPA`;
  } else {
    scoreType = 'gpa_10';
    formatted = unit === 'cgpa' ? `${num} CGPA` : denom === 10 ? `${num}/10` : `${num} CGPA`;
  }

  return {
    valid: true,
    isEmpty: false,
    formatted,
    numericValue: num,
    scoreType
  };
}

/**
 * Validates standard email format
 */
export function validateEmailFormat(email: string | undefined | null): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const trimmed = String(email || '').trim().toLowerCase();
  if (!trimmed) {
    return { valid: false, normalized: '', error: 'Email Address is required.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return {
      valid: false,
      normalized: trimmed,
      error: `Invalid Email Address format ("${email}").`
    };
  }
  return { valid: true, normalized: trimmed };
}

/**
 * Normalizes a phone number for duplicate comparisons.
 * For 10+ digit Indian numbers starting with 91 or 0, normalizes to the core 10 digits;
 * for international numbers, preserves full digit sequence (up to 15 digits).
 */
export function normalizeMobileForComparison(phone: string | undefined | null): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length > 10 && digits.slice(-10).match(/^[6-9]\d{9}$/)) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Validates mobile phone number supporting both domestic (10-digit / +91) and international formats (+1, +44, +49, +61, etc.)
 */
export function validateMobilePhoneFormat(phone: string | undefined | null): {
  valid: boolean;
  trimmed: string;
  normalized: string;
  error?: string;
} {
  const trimmed = String(phone || '').trim();
  if (!trimmed) {
    return { valid: false, trimmed: '', normalized: '', error: 'Mobile Phone is required.' };
  }

  // Must contain only digits, optional leading +, spaces, hyphens, parentheses
  const allowedCharsRegex = /^\+?[\d\s\-\(\)\.]{8,22}$/;
  if (!allowedCharsRegex.test(trimmed)) {
    return {
      valid: false,
      trimmed,
      normalized: '',
      error: `Invalid Mobile Phone format ("${trimmed}"). Only digits, +, spaces, and hyphens are allowed.`
    };
  }

  const digits = trimmed.replace(/\D/g, '');
  const hasPlusPrefix = trimmed.startsWith('+');

  // Without international '+', require 10 to 15 digits (or 11 with leading 0)
  if (!hasPlusPrefix && (digits.length < 10 || digits.length > 15)) {
    return {
      valid: false,
      trimmed,
      normalized: digits,
      error: `Invalid Mobile Phone ("${trimmed}"). Enter a 10-digit mobile number or international number with country code (e.g. +91 98490 11223).`
    };
  }

  // With international '+', require 8 to 15 digits per ITU-T E.164
  if (hasPlusPrefix && (digits.length < 8 || digits.length > 15)) {
    return {
      valid: false,
      trimmed,
      normalized: digits,
      error: `Invalid international Mobile Phone ("${trimmed}"). Must contain between 8 and 15 digits.`
    };
  }

  // Reject all-zeros or repeating single digit like 0000000000
  if (/^(\d)\1+$/.test(digits)) {
    return {
      valid: false,
      trimmed,
      normalized: digits,
      error: `Invalid Mobile Phone ("${trimmed}").`
    };
  }

  return {
    valid: true,
    trimmed,
    normalized: normalizeMobileForComparison(trimmed)
  };
}

const KNOWN_SOURCE_ALIASES: Record<string, { code: string; label: string }> = {
  website: { code: 'website', label: 'Website Inquiry Form' },
  website_inquiry_form: { code: 'website', label: 'Website Inquiry Form' },
  website_form: { code: 'website', label: 'Website Inquiry Form' },
  web: { code: 'website', label: 'Website Inquiry Form' },
  google_ads: { code: 'google_ads', label: 'Google Search & Display Ads' },
  google_search_display_ads: { code: 'google_ads', label: 'Google Search & Display Ads' },
  google_ads_search_display: { code: 'google_ads', label: 'Google Search & Display Ads' },
  google_search: { code: 'google_ads', label: 'Google Search & Display Ads' },
  google: { code: 'google_ads', label: 'Google Search & Display Ads' },
  instagram: { code: 'instagram', label: 'Instagram Ads & DMs' },
  instagram_ads_dms: { code: 'instagram', label: 'Instagram Ads & DMs' },
  insta: { code: 'instagram', label: 'Instagram Ads & DMs' },
  facebook: { code: 'facebook', label: 'Facebook Lead Gen Campaign' },
  facebook_lead_gen_campaign: { code: 'facebook', label: 'Facebook Lead Gen Campaign' },
  facebook_lead_gen_form: { code: 'facebook', label: 'Facebook Lead Gen Campaign' },
  meta: { code: 'facebook', label: 'Facebook Lead Gen Campaign' },
  whatsapp: { code: 'whatsapp', label: 'Official WhatsApp Bot' },
  official_whatsapp_bot: { code: 'whatsapp', label: 'Official WhatsApp Bot' },
  whatsapp_official_chatbot: { code: 'whatsapp', label: 'Official WhatsApp Bot' },
  walk_in: { code: 'walk_in', label: 'Physical Branch Walk-in' },
  walkin: { code: 'walk_in', label: 'Physical Branch Walk-in' },
  physical_branch_walk_in: { code: 'walk_in', label: 'Physical Branch Walk-in' },
  branch_walk_in: { code: 'walk_in', label: 'Physical Branch Walk-in' },
  phone_call: { code: 'phone_call', label: 'Inbound Phone / Toll-free' },
  inbound_phone_toll_free: { code: 'phone_call', label: 'Inbound Phone / Toll-free' },
  direct_phone_inbound_toll_free: { code: 'phone_call', label: 'Inbound Phone / Toll-free' },
  phone: { code: 'phone_call', label: 'Inbound Phone / Toll-free' },
  call: { code: 'phone_call', label: 'Inbound Phone / Toll-free' },
  college_visits: { code: 'college_visits', label: 'College Campus Seminar' },
  college_visit: { code: 'college_visits', label: 'College Campus Seminar' },
  college_campus_seminar: { code: 'college_visits', label: 'College Campus Seminar' },
  campus_college_visit_seminar: { code: 'college_visits', label: 'College Campus Seminar' },
  education_fairs: { code: 'education_fairs', label: 'Study Abroad Education Fair' },
  education_fair: { code: 'education_fairs', label: 'Study Abroad Education Fair' },
  study_abroad_education_fair: { code: 'education_fairs', label: 'Study Abroad Education Fair' },
  fair: { code: 'education_fairs', label: 'Study Abroad Education Fair' },
  events: { code: 'events', label: 'Webinars & Spot Assessments' },
  event: { code: 'events', label: 'Webinars & Spot Assessments' },
  webinar: { code: 'events', label: 'Webinars & Spot Assessments' },
  webinars_spot_assessments: { code: 'events', label: 'Webinars & Spot Assessments' },
  webinars_spot_assessment_events: { code: 'events', label: 'Webinars & Spot Assessments' },
  referral: { code: 'referral', label: 'Student / Alumni Referral' },
  student_alumni_referral: { code: 'referral', label: 'Student / Alumni Referral' },
  alumni_student_referral: { code: 'referral', label: 'Student / Alumni Referral' },
  cold_calling: { code: 'cold_calling', label: 'Outbound Telecalling / Bulk Database' },
  outbound_telecalling_bulk_database: { code: 'cold_calling', label: 'Outbound Telecalling / Bulk Database' },
  telecalling: { code: 'cold_calling', label: 'Outbound Telecalling / Bulk Database' }
};

export function resolveAndValidateLeadSource(
  rawSource: string | undefined | null,
  catalog?: Array<{ code: string; label: string }>
): { valid: boolean; code: string; label: string; error?: string } {
  const trimmed = String(rawSource || '').trim();
  if (!trimmed) {
    return { valid: false, code: '', label: '', error: 'Lead Source is required.' };
  }

  const normalizedSlug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (catalog && catalog.length > 0) {
    const exactMatch = catalog.find(
      item =>
        item.code.toLowerCase() === trimmed.toLowerCase() ||
        item.code.toLowerCase() === normalizedSlug ||
        item.label.toLowerCase() === trimmed.toLowerCase() ||
        item.label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') === normalizedSlug
    );
    if (exactMatch) {
      return { valid: true, code: exactMatch.code, label: exactMatch.label };
    }
  }

  if (KNOWN_SOURCE_ALIASES[normalizedSlug]) {
    return {
      valid: true,
      code: KNOWN_SOURCE_ALIASES[normalizedSlug].code,
      label: KNOWN_SOURCE_ALIASES[normalizedSlug].label
    };
  }

  return {
    valid: false,
    code: normalizedSlug,
    label: trimmed,
    error: `Invalid Lead Source "${trimmed}". Please use a valid source (e.g. Website Inquiry Form, Google Ads, Instagram, Facebook, WhatsApp, Walk-in, Phone Call, Education Fairs, Referral).`
  };
}

export function normalizeOptionalDegree(raw: string | undefined | null): {
  valid: boolean;
  value: 'Masters' | 'Bachelors' | 'MBA' | 'PhD' | '';
  error?: string;
} {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { valid: true, value: '' };
  const lower = trimmed.toLowerCase();
  if (['masters', 'master', 'ms', 'msc', 'ma', 'm.tech', 'mtech', 'postgraduate', 'pg'].includes(lower)) {
    return { valid: true, value: 'Masters' };
  }
  if (['bachelors', 'bachelor', 'ug', 'bsc', 'ba', 'beng', 'b.tech', 'btech', 'undergraduate'].includes(lower)) {
    return { valid: true, value: 'Bachelors' };
  }
  if (['mba', 'executive mba', 'pgdm'].includes(lower)) {
    return { valid: true, value: 'MBA' };
  }
  if (['phd', 'ph.d', 'doctorate', 'doctoral'].includes(lower)) {
    return { valid: true, value: 'PhD' };
  }
  return {
    valid: false,
    value: '',
    error: `Invalid Target Degree "${trimmed}". Allowed values: Masters, Bachelors, MBA, PhD.`
  };
}

export function normalizeOptionalIntakeSeason(raw: string | undefined | null): {
  valid: boolean;
  value: 'Fall' | 'Spring' | 'Summer' | '';
  error?: string;
} {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { valid: true, value: '' };
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('fall') || lower === 'autumn' || lower === 'sep' || lower === 'september') {
    return { valid: true, value: 'Fall' };
  }
  if (lower.startsWith('spring') || lower === 'winter' || lower === 'jan' || lower === 'january') {
    return { valid: true, value: 'Spring' };
  }
  if (lower.startsWith('summer') || lower === 'may') {
    return { valid: true, value: 'Summer' };
  }
  return {
    valid: false,
    value: '',
    error: `Invalid Intake "${trimmed}". Allowed values: Fall, Spring, Summer.`
  };
}

export function normalizeOptionalBooleanLoan(raw: string | boolean | number | undefined | null): {
  valid: boolean;
  value: boolean;
  error?: string;
} {
  if (typeof raw === 'boolean') return { valid: true, value: raw };
  if (raw === undefined || raw === null) return { valid: true, value: false };
  const trimmed = String(raw).trim().toLowerCase();
  if (!trimmed) return { valid: true, value: false };
  if (['yes', 'y', 'true', '1', 'required', 'loan required'].includes(trimmed)) {
    return { valid: true, value: true };
  }
  if (['no', 'n', 'false', '0', 'not required', 'none', 'self funded'].includes(trimmed)) {
    return { valid: true, value: false };
  }
  return {
    valid: false,
    value: false,
    error: `Invalid value "${raw}" for Requires Education Loan Assistance. Use Yes or No.`
  };
}

/**
 * Generates CSV content for the Sample Lead Import Template
 */
export function generateSampleLeadTemplateCsv(): string {
  const escapeCsvCell = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  const headerLine = SAMPLE_LEAD_TEMPLATE_HEADERS.map(escapeCsvCell).join(',');
  const dataLines = SAMPLE_LEAD_TEMPLATE_ROWS.map(row => row.map(escapeCsvCell).join(','));
  return [headerLine, ...dataLines].join('\r\n');
}

/**
 * Parses CSV or TSV text into an array of key-value row objects keyed by header name
 */
export function parseCsvToRowObjects(csvText: string): Record<string, string>[] {
  const cleaned = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return [];

  // Detect delimiter (comma or tab or semicolon)
  const firstLine = cleaned.split(/\r?\n/)[0] || '';
  const delimiter =
    firstLine.split('\t').length > firstLine.split(',').length
      ? '\t'
      : firstLine.split(';').length > firstLine.split(',').length
      ? ';'
      : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());
  const result: Record<string, string>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const rowCells = rows[r];
    // Skip completely empty rows
    if (rowCells.every(c => !c || !c.trim())) continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `col_${c}`;
      obj[key] = rowCells[c] !== undefined ? rowCells[c].trim() : '';
    }
    result.push(obj);
  }

  return result;
}

/**
 * Extracts normalized field values from a raw imported row object regardless of minor header variations
 */
export function extractLeadFieldsFromRawRow(raw: Record<string, string>): {
  source: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  targetCountry: string;
  targetDegree: string;
  intakeSeason: string;
  intakeYear: string;
  budgetCap: string;
  requiresLoan: string;
  cgpaOrPercentage: string;
} {
  const normalizedMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const cleanKey = k
      .toLowerCase()
      .replace(/\*/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    normalizedMap[cleanKey] = String(v ?? '').trim();
  }

  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (normalizedMap[k] !== undefined && normalizedMap[k] !== '') {
        return normalizedMap[k];
      }
    }
    for (const k of keys) {
      if (normalizedMap[k] !== undefined) {
        return normalizedMap[k];
      }
    }
    return '';
  };

  return {
    source: pick('lead_source', 'source', 'enquiry_source', 'channel'),
    firstName: pick('first_name', 'firstname', 'given_name', 'student_first_name', 'name'),
    lastName: pick('last_name', 'lastname', 'surname', 'family_name'),
    email: pick('email_address', 'email', 'student_email', 'e_mail'),
    phone: pick('mobile_phone', 'mobile', 'phone', 'phone_number', 'mobile_number', 'contact_number'),
    targetCountry: pick('target_country', 'preferred_country', 'country', 'destination_country'),
    targetDegree: pick('target_degree', 'degree', 'program_level'),
    intakeSeason: pick('intake', 'intake_season', 'target_intake', 'semester'),
    intakeYear: pick('intake_year', 'target_intake_year', 'year'),
    budgetCap: pick('budget_cap', 'budget', 'budget_in_lakhs', 'budget_cap_in_lakhs_inr'),
    requiresLoan: pick(
      'requires_education_loan_assistance',
      'requires_loan',
      'education_loan',
      'loan_assistance',
      'loan_required'
    ),
    cgpaOrPercentage: pick(
      'cgpa_percentage',
      'cgpa_or_percentage',
      'cgpa',
      'percentage',
      'academic_score',
      'score'
    )
  };
}

/**
 * Pure-TypeScript OpenXML (.xlsx) Workbook Binary Generator (Zero External Dependencies)
 * Creates a standard uncompressed ZIP archive containing the OpenXML spreadsheet structure.
 */
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colIndexToLetter(index: number): string {
  let col = '';
  let n = index;
  while (n >= 0) {
    col = String.fromCharCode((n % 26) + 65) + col;
    n = Math.floor(n / 26) - 1;
  }
  return col;
}

export function generateSampleLeadTemplateXlsx(): Uint8Array {
  const allRows: string[][] = [
    Array.from(SAMPLE_LEAD_TEMPLATE_HEADERS),
    ...SAMPLE_LEAD_TEMPLATE_ROWS
  ];

  const sheetRowsXml = allRows
    .map((row, rIdx) => {
      const rowNum = rIdx + 1;
      const cellsXml = row
        .map((cellVal, cIdx) => {
          const ref = `${colIndexToLetter(cIdx)}${rowNum}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cellVal)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .join('');

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Leads Import Template" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRowsXml}</sheetData>
</worksheet>`;

  const files: Array<{ name: string; content: string }> = [
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: relsXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/worksheets/sheet1.xml', content: sheet1Xml }
  ];

  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const crc = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length + dataBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // Local file header signature
    lv.setUint16(4, 20, true); // Version needed
    lv.setUint16(6, 0, true); // Flags
    lv.setUint16(8, 0, true); // Compression method (0 = STORE)
    lv.setUint16(10, 0, true); // Mod time
    lv.setUint16(12, 0, true); // Mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);
    localHeader.set(dataBytes, 30 + nameBytes.length);
    localParts.push(localHeader);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // Central directory file header signature
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length;
  }

  const centralDirSize = centralParts.reduce((acc, p) => acc + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralDirSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalLength = offset + centralDirSize + eocd.length;
  const out = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of localParts) {
    out.set(part, pos);
    pos += part.length;
  }
  for (const part of centralParts) {
    out.set(part, pos);
    pos += part.length;
  }
  out.set(eocd, pos);
  return out;
}

export const generateSampleLeadCsvContent = generateSampleLeadTemplateCsv;
export const generateSampleLeadXlsxBytes = generateSampleLeadTemplateXlsx;

export interface LeadFormValidationInput {
  source?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  preferredCountries?: string[] | string | null;
  targetDegree?: string | null;
  targetCourse?: string | null;
  targetIntakeSeason?: string | null;
  targetIntakeYear?: number | string | null;
  budgetInLakhsINR?: number | string | null;
  requiresLoan?: boolean | string | null;
  cgpaOrPercentage?: string | number | null;
}

export function validateLeadFormPayload(input: LeadFormValidationInput): {
  valid: boolean;
  errors: string[];
  cgpaResult: CgpaParseResult;
} {
  const errors: string[] = [];

  if (!input.source || !String(input.source).trim()) {
    errors.push('Lead Source is mandatory.');
  }

  if (!input.firstName || !String(input.firstName).trim()) {
    errors.push('First Name is mandatory.');
  }

  const emailCheck = validateEmailFormat(input.email);
  if (!emailCheck.valid) {
    errors.push(emailCheck.error || 'Email Address is invalid.');
  }

  const phoneCheck = validateMobilePhoneFormat(input.phone);
  if (!phoneCheck.valid) {
    errors.push(phoneCheck.error || 'Mobile Phone is invalid.');
  }

  const cgpaResult = parseAndValidateCgpaOrPercentage(input.cgpaOrPercentage);
  if (!cgpaResult.valid) {
    errors.push(cgpaResult.error || 'Invalid CGPA / Percentage.');
  }

  if (input.targetIntakeYear !== undefined && input.targetIntakeYear !== null && String(input.targetIntakeYear).trim() !== '') {
    const yr = Number(input.targetIntakeYear);
    if (isNaN(yr) || yr < 2024 || yr > 2035) {
      errors.push('Intake Year must be between 2024 and 2035.');
    }
  }

  if (input.budgetInLakhsINR !== undefined && input.budgetInLakhsINR !== null && String(input.budgetInLakhsINR).trim() !== '') {
    const b = Number(input.budgetInLakhsINR);
    if (isNaN(b) || b < 0 || b > 1000) {
      errors.push('Budget Cap must be a valid non-negative number.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    cgpaResult
  };
}

