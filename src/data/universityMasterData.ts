/**
 * Master University & Course Catalog for Student Lifecycle CRM
 * Adheres to authentic entry criteria, fees, conversion rates, and documented citations.
 */

import { UniversityMasterRecord, CourseMasterRecord } from '../types/applications';

export const MASTER_UNIVERSITIES: UniversityMasterRecord[] = [
  // ==========================================
  // PUBLIC UNIVERSITIES (8 ACTIVE RECORDS)
  // ==========================================
  {
    id: 'uni_tum',
    universityId: 'uni_tum',
    name: 'Technical University of Munich (TUM)',
    universityName: 'Technical University of Munich (TUM)',
    country: 'Germany',
    city: 'Munich, Bavaria',
    stateOrLocation: 'Munich, Bavaria',
    globalRanking: 37,
    nationalRanking: 1,
    type: 'Public',
    universityType: 'PUBLIC',
    minCgpa: 8.3,
    recommendedCgpa: 8.7,
    minPercentage: 78,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'German Institutional Accreditation / TU9',
    website: 'https://www.tum.de',
    portalType: 'Direct University Portal',
    standardCurrency: 'EUR',
    inrExchangeRate: 91.5,
    description: 'Premier public technical university in Germany, renowned for informatics, mechanical engineering, and robotics research.',
    dataSourceCitation: 'DAAD International Database & TUM Academic Examination Regulations (FPSO 2026/27)'
  },
  {
    id: 'uni_rwth',
    universityId: 'uni_rwth',
    name: 'RWTH Aachen University',
    universityName: 'RWTH Aachen University',
    country: 'Germany',
    city: 'Aachen, North Rhine-Westphalia',
    stateOrLocation: 'Aachen, North Rhine-Westphalia',
    globalRanking: 99,
    nationalRanking: 4,
    type: 'Public',
    universityType: 'PUBLIC',
    minCgpa: 7.9,
    recommendedCgpa: 8.3,
    minPercentage: 74,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'German Rectors Conference / TU9',
    website: 'https://www.rwth-aachen.de',
    portalType: 'Direct University Portal',
    standardCurrency: 'EUR',
    inrExchangeRate: 91.5,
    description: 'Leading European public institution for science and engineering with extensive industrial collaboration networks.',
    dataSourceCitation: 'RWTH Aachen Official Admission Regulations & DAAD Higher Education Compass 2026'
  },
  {
    id: 'uni_manchester',
    universityId: 'uni_manchester',
    name: 'The University of Manchester',
    universityName: 'The University of Manchester',
    country: 'United Kingdom',
    city: 'Manchester, England',
    stateOrLocation: 'Manchester, England',
    globalRanking: 32,
    nationalRanking: 6,
    type: 'Public',
    universityType: 'PUBLIC',
    minCgpa: 7.8,
    recommendedCgpa: 8.2,
    minPercentage: 73,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'Russell Group / Privy Council Royal Charter',
    website: 'https://www.manchester.ac.uk',
    portalType: 'Direct University Portal',
    standardCurrency: 'GBP',
    inrExchangeRate: 108.2,
    description: 'Historic public red-brick university with 25 Nobel laureates, high student employability and top research output.',
    dataSourceCitation: 'UK UCAS Official Postgraduate Entry Directory 2026/2027'
  },
  {
    id: 'uni_warwick',
    universityId: 'uni_warwick',
    name: 'University of Warwick',
    universityName: 'University of Warwick',
    country: 'United Kingdom',
    city: 'Coventry, West Midlands',
    stateOrLocation: 'Coventry, West Midlands',
    globalRanking: 67,
    nationalRanking: 9,
    type: 'Public',
    universityType: 'PUBLIC',
    minCgpa: 7.5,
    recommendedCgpa: 8.0,
    minPercentage: 70,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'Russell Group / AACSB / AMBA / EQUIS',
    website: 'https://warwick.ac.uk',
    portalType: 'Direct University Portal',
    standardCurrency: 'GBP',
    inrExchangeRate: 108.2,
    description: 'Renowned public research university for mathematics, computer science, economics, and Warwick Business School.',
    dataSourceCitation: 'Warwick Postgraduate Admissions Criteria & HESA UK Statistics 2026'
  },
  {
    id: 'uni_asu',
    universityId: 'uni_asu',
    name: 'Arizona State University',
    universityName: 'Arizona State University',
    country: 'United States',
    city: 'Tempe, Arizona',
    stateOrLocation: 'Tempe, Arizona',
    globalRanking: 179,
    nationalRanking: 105,
    type: 'Public',
    universityType: 'PUBLIC',
    minCgpa: 7.0,
    recommendedCgpa: 7.6,
    minPercentage: 65,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'HLC / ABET',
    website: 'https://www.asu.edu',
    portalType: 'Direct University Portal',
    standardCurrency: 'USD',
    inrExchangeRate: 84.2,
    description: 'Ranked #1 public university in the US for Innovation, high international student intake and extensive scholarships.',
    dataSourceCitation: 'Ira A. Fulton Schools of Engineering Graduate Admissions Catalogue 2026'
  },
  {
    id: 'uni_melbourne',
    universityId: 'uni_melbourne',
    name: 'The University of Melbourne',
    universityName: 'The University of Melbourne',
    country: 'Australia',
    city: 'Melbourne, Victoria',
    stateOrLocation: 'Melbourne, Victoria',
    globalRanking: 14,
    nationalRanking: 1,
    type: 'Public',
    universityType: 'PUBLIC',
    minCgpa: 7.4,
    recommendedCgpa: 8.0,
    minPercentage: 70,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'Group of Eight (Go8) / TEQSA',
    website: 'https://www.unimelb.edu.au',
    portalType: 'Direct University Portal',
    standardCurrency: 'AUD',
    inrExchangeRate: 55.4,
    description: 'Australias leading public university, internationally celebrated for research excellence and high graduate outcomes.',
    dataSourceCitation: 'University of Melbourne Course & Admissions Handbook 2026'
  },
  {
    id: 'uni_dublin',
    universityId: 'uni_dublin',
    name: 'University College Dublin (UCD)',
    universityName: 'University College Dublin (UCD)',
    country: 'Ireland',
    city: 'Dublin, Leinster',
    stateOrLocation: 'Dublin, Leinster',
    globalRanking: 126,
    nationalRanking: 2,
    type: 'Public',
    universityType: 'PUBLIC',
    minCgpa: 7.2,
    recommendedCgpa: 7.7,
    minPercentage: 68,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'IUA / Triple Crown Business School',
    website: 'https://www.ucd.ie',
    portalType: 'Direct University Portal',
    standardCurrency: 'EUR',
    inrExchangeRate: 91.5,
    description: 'Irelands global public university situated in the heart of European tech headquarters.',
    dataSourceCitation: 'Education in Ireland & UCD International Admissions Guidelines 2026/27'
  },
  {
    id: 'uni_waterloo',
    universityId: 'uni_waterloo',
    name: 'University of Waterloo',
    universityName: 'University of Waterloo',
    country: 'Canada',
    city: 'Waterloo, Ontario',
    stateOrLocation: 'Waterloo, Ontario',
    globalRanking: 115,
    nationalRanking: 5,
    type: 'Public',
    universityType: 'PUBLIC',
    minCgpa: 8.1,
    recommendedCgpa: 8.5,
    minPercentage: 76,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'Universities Canada / CEAB',
    website: 'https://uwaterloo.ca',
    portalType: 'OUAC',
    standardCurrency: 'CAD',
    inrExchangeRate: 61.8,
    description: 'Premier Canadian public research institution famed for computer science, engineering, and North Americas largest co-op program.',
    dataSourceCitation: 'University of Waterloo Graduate Studies Academic Calendar 2026/27'
  },

  // ==========================================
  // PRIVATE UNIVERSITIES (11 ACTIVE RECORDS)
  // ==========================================
  {
    id: 'uni_neu',
    universityId: 'uni_neu',
    name: 'Northeastern University',
    universityName: 'Northeastern University',
    country: 'United States',
    city: 'Boston, Massachusetts',
    stateOrLocation: 'Boston, Massachusetts',
    globalRanking: 396,
    nationalRanking: 53,
    type: 'Private',
    universityType: 'PRIVATE',
    minCgpa: 7.8,
    recommendedCgpa: 8.3,
    minPercentage: 72,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'NECHE / ABET',
    website: 'https://www.northeastern.edu',
    portalType: 'Direct University Portal',
    standardCurrency: 'USD',
    inrExchangeRate: 84.2,
    description: 'World pioneer private research university in Co-op experiential learning with tech placement in Boston and Silicon Valley.',
    dataSourceCitation: 'Khoury College of Computer Sciences Graduate Bulletin 2026/27'
  },
  {
    id: 'uni_usc',
    universityId: 'uni_usc',
    name: 'University of Southern California (USC)',
    universityName: 'University of Southern California (USC)',
    country: 'United States',
    city: 'Los Angeles, California',
    stateOrLocation: 'Los Angeles, California',
    globalRanking: 116,
    nationalRanking: 28,
    type: 'Private',
    universityType: 'PRIVATE',
    minCgpa: 8.3,
    recommendedCgpa: 8.8,
    minPercentage: 78,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'WSCUC / ABET',
    website: 'https://www.usc.edu',
    portalType: 'Direct University Portal',
    standardCurrency: 'USD',
    inrExchangeRate: 84.2,
    description: 'Leading private research university in California with the prestigious Viterbi School of Engineering.',
    dataSourceCitation: 'USC Viterbi Graduate Admissions & International Student Criteria 2026'
  },
  {
    id: 'uni_nyu',
    universityId: 'uni_nyu',
    name: 'New York University (NYU Tandon)',
    universityName: 'New York University (NYU Tandon)',
    country: 'United States',
    city: 'New York City, New York',
    stateOrLocation: 'New York City, New York',
    globalRanking: 38,
    nationalRanking: 35,
    type: 'Private',
    universityType: 'PRIVATE',
    minCgpa: 8.1,
    recommendedCgpa: 8.6,
    minPercentage: 76,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'MSCHE / ABET',
    website: 'https://www.nyu.edu',
    portalType: 'Direct University Portal',
    standardCurrency: 'USD',
    inrExchangeRate: 84.2,
    description: 'Global private research university in NYC offering top-ranked graduate programs in AI, Cybersecurity, and FinTech.',
    dataSourceCitation: 'NYU Tandon School of Engineering Graduate Admissions Bulletin 2026/27'
  },
  {
    id: 'uni_bu',
    universityId: 'uni_bu',
    name: 'Boston University',
    universityName: 'Boston University',
    country: 'United States',
    city: 'Boston, Massachusetts',
    stateOrLocation: 'Boston, Massachusetts',
    globalRanking: 93,
    nationalRanking: 43,
    type: 'Private',
    universityType: 'PRIVATE',
    minCgpa: 7.9,
    recommendedCgpa: 8.4,
    minPercentage: 74,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'NECHE / AAU',
    website: 'https://www.bu.edu',
    portalType: 'Direct University Portal',
    standardCurrency: 'USD',
    inrExchangeRate: 84.2,
    description: 'Major private research institution in Boston with world-class faculty in Computing & Data Sciences.',
    dataSourceCitation: 'Boston University Graduate School of Arts & Sciences Admissions 2026'
  },
  {
    id: 'uni_Constructor',
    universityId: 'uni_Constructor',
    name: 'Constructor University Bremen',
    universityName: 'Constructor University Bremen',
    country: 'Germany',
    city: 'Bremen',
    stateOrLocation: 'Bremen',
    globalRanking: 501,
    nationalRanking: 32,
    type: 'Private',
    universityType: 'PRIVATE',
    minCgpa: 7.5,
    recommendedCgpa: 8.0,
    minPercentage: 70,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'German Science and Humanities Council (Wissenschaftsrat)',
    website: 'https://constructor.university',
    portalType: 'Direct University Portal',
    standardCurrency: 'EUR',
    inrExchangeRate: 91.5,
    description: 'Top-ranked English-speaking private university in Germany specializing in Computer Science and Software Engineering.',
    dataSourceCitation: 'Constructor University Graduate Admission Guidelines 2026'
  },
  {
    id: 'uni_frankfurt_fs',
    universityId: 'uni_frankfurt_fs',
    name: 'Frankfurt School of Finance & Management',
    universityName: 'Frankfurt School of Finance & Management',
    country: 'Germany',
    city: 'Frankfurt am Main, Hesse',
    stateOrLocation: 'Frankfurt am Main, Hesse',
    globalRanking: 410,
    nationalRanking: 18,
    type: 'Private',
    universityType: 'PRIVATE',
    minCgpa: 7.6,
    recommendedCgpa: 8.2,
    minPercentage: 71,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'AACSB / EQUIS / AMBA Triple Crown',
    website: 'https://www.frankfurt-school.de',
    portalType: 'Direct University Portal',
    standardCurrency: 'EUR',
    inrExchangeRate: 91.5,
    description: 'Premier German private business and applied data science university located in Europes financial capital.',
    dataSourceCitation: 'Frankfurt School MSc Admissions & Selection Statute 2026'
  },
  {
    id: 'uni_srh_heidelberg',
    universityId: 'uni_srh_heidelberg',
    name: 'SRH Hochschule Heidelberg',
    universityName: 'SRH Hochschule Heidelberg',
    country: 'Germany',
    city: 'Heidelberg, Baden-Württemberg',
    stateOrLocation: 'Heidelberg, Baden-Württemberg',
    globalRanking: 650,
    nationalRanking: 45,
    type: 'Private',
    universityType: 'PRIVATE',
    minCgpa: 6.8,
    recommendedCgpa: 7.4,
    minPercentage: 63,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'German Wissenschaftsrat / ZEvA Accredited',
    website: 'https://www.srh-hochschule-heidelberg.de',
    portalType: 'Direct University Portal',
    standardCurrency: 'EUR',
    inrExchangeRate: 91.5,
    description: 'State-recognized private university in Germany known for its CORE principle and Applied Computer Science programs.',
    dataSourceCitation: 'SRH Heidelberg International Admissions Criteria 2026'
  },
  {
    id: 'uni_rit',
    universityId: 'uni_rit',
    name: 'Rochester Institute of Technology (RIT)',
    universityName: 'Rochester Institute of Technology (RIT)',
    country: 'United States',
    city: 'Rochester, New York',
    stateOrLocation: 'Rochester, New York',
    globalRanking: 520,
    nationalRanking: 98,
    type: 'Private',
    universityType: 'PRIVATE',
    minCgpa: 7.2,
    recommendedCgpa: 7.8,
    minPercentage: 67,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'MSCHE / ABET',
    website: 'https://www.rit.edu',
    portalType: 'Direct University Portal',
    standardCurrency: 'USD',
    inrExchangeRate: 84.2,
    description: 'Renowned private technological university in New York with one of the oldest and largest career co-op programs.',
    dataSourceCitation: 'RIT Golisano College of Computing Graduate Catalog 2026'
  },
  {
    id: 'uni_stevens',
    universityId: 'uni_stevens',
    name: 'Stevens Institute of Technology',
    universityName: 'Stevens Institute of Technology',
    country: 'United States',
    city: 'Hoboken, New Jersey',
    stateOrLocation: 'Hoboken, New Jersey',
    globalRanking: 540,
    nationalRanking: 76,
    type: 'Private',
    universityType: 'PRIVATE',
    minCgpa: 7.3,
    recommendedCgpa: 7.9,
    minPercentage: 68,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'MSCHE / ABET',
    website: 'https://www.stevens.edu',
    portalType: 'Direct University Portal',
    standardCurrency: 'USD',
    inrExchangeRate: 84.2,
    description: 'Premier private research university overlooking Manhattan with top ROI for computer science and enterprise AI graduates.',
    dataSourceCitation: 'Stevens Schaefer School of Engineering & Science Graduate Bulletin 2026'
  },
  {
    id: 'uni_iit_chicago',
    universityId: 'uni_iit_chicago',
    name: 'Illinois Institute of Technology (Illinois Tech)',
    universityName: 'Illinois Institute of Technology (Illinois Tech)',
    country: 'United States',
    city: 'Chicago, Illinois',
    stateOrLocation: 'Chicago, Illinois',
    globalRanking: 480,
    nationalRanking: 105,
    type: 'Private',
    universityType: 'PRIVATE',
    minCgpa: 6.9,
    recommendedCgpa: 7.5,
    minPercentage: 64,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'HLC / ABET',
    website: 'https://www.iit.edu',
    portalType: 'Direct University Portal',
    standardCurrency: 'USD',
    inrExchangeRate: 84.2,
    description: 'Chicagos premier private technology-focused university offering strong STEM OPT career pathways.',
    dataSourceCitation: 'Illinois Tech College of Computing Graduate Admission Standards 2026'
  },
  {
    id: 'uni_bond',
    universityId: 'uni_bond',
    name: 'Bond University',
    universityName: 'Bond University',
    country: 'Australia',
    city: 'Gold Coast, Queensland',
    stateOrLocation: 'Gold Coast, Queensland',
    globalRanking: 560,
    nationalRanking: 22,
    type: 'Private',
    universityType: 'PRIVATE',
    minCgpa: 6.5,
    recommendedCgpa: 7.2,
    minPercentage: 60,
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    accreditation: 'TEQSA / AACSB / EQUIS',
    website: 'https://bond.edu.au',
    portalType: 'Direct University Portal',
    standardCurrency: 'AUD',
    inrExchangeRate: 55.4,
    description: 'Australias first private not-for-profit university recognized for accelerated trimesters and personalized small-cohort education.',
    dataSourceCitation: 'Bond University International Postgraduate Entry Handbook 2026'
  }
];

export const MASTER_COURSES: CourseMasterRecord[] = [
  // 1. TUM - M.Sc. Informatics
  {
    id: 'crs_tum_cs',
    universityId: 'uni_tum',
    universityName: 'Technical University of Munich (TUM)',
    country: 'Germany',
    courseName: 'M.Sc. Informatics (Computer Science)',
    faculty: 'School of Computation, Information and Technology',
    degreeLevel: 'Masters',
    durationMonths: 24,
    credits: 120,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        earlyBirdDeadline: '2026-03-31',
        regularDeadline: '2026-05-31',
        hardCutoffDeadline: '2026-05-31'
      },
      {
        season: 'Spring',
        year: 2027,
        earlyBirdDeadline: '2026-10-15',
        regularDeadline: '2026-11-30',
        hardCutoffDeadline: '2026-11-30'
      }
    ],
    fees: {
      tuitionFeePerYear: 6000, // New international tuition at Bavarian universities
      estimatedLivingCostPerYear: 11208, // Standard German blocked account statutory rate
      semesterFeePerYear: 300,
      currency: 'EUR',
      applicationFee: 75
    },
    entryCriteria: {
      minGpa10Scale: 8.5,
      minPercentage: 80,
      germanGpaMinThreshold: 2.0, // High standard
      englishRequirements: {
        testAccepted: ['IELTS', 'TOEFL'],
        minOverallIelts: 7.0,
        minIeltsSubBands: { listening: 6.5, reading: 6.5, writing: 6.5, speaking: 6.5 },
        minToefl: 95,
        waiverAllowed: false
      },
      greGmat: 'Recommended',
      minGreScore: 315,
      maxBacklogsAccepted: 0,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Official German APS Certificate with verifiable digital verification link',
      'Curricular analysis form demonstrating >= 30 ECTS in Theoretical CS and Math',
      'Letter of Motivation (1000 words maximum) explaining research interest',
      'Two Academic Letters of Recommendation from university faculty'
    ],
    postStudyWorkVisaMonths: 18,
    dataSourceCitation: 'TUM CIT Aptitude Assessment Statute (Eignungsverfahren) 2026'
  },

  // 2. RWTH Aachen - M.Sc. Data Science
  {
    id: 'crs_rwth_ds',
    universityId: 'uni_rwth',
    universityName: 'RWTH Aachen University',
    country: 'Germany',
    courseName: 'M.Sc. Data Science',
    faculty: 'Faculty of Mathematics, Computer Science and Natural Sciences',
    degreeLevel: 'Masters',
    durationMonths: 24,
    credits: 120,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        regularDeadline: '2026-07-15',
        hardCutoffDeadline: '2026-07-15'
      }
    ],
    fees: {
      tuitionFeePerYear: 0, // Public university no tuition in NRW
      estimatedLivingCostPerYear: 11208,
      semesterFeePerYear: 650,
      currency: 'EUR',
      applicationFee: 0
    },
    entryCriteria: {
      minGpa10Scale: 8.0,
      minPercentage: 75,
      germanGpaMinThreshold: 2.3,
      englishRequirements: {
        testAccepted: ['IELTS', 'TOEFL'],
        minOverallIelts: 6.5,
        minIeltsSubBands: { listening: 6.0, reading: 6.0, writing: 6.0, speaking: 6.0 },
        minToefl: 90,
        waiverAllowed: false
      },
      greGmat: 'Required',
      minGreScore: 310,
      maxBacklogsAccepted: 1,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Mandatory German APS Certificate',
      'GRE revised General Test (Verbal: 145, Quantitative: 160, Analytical Writing: 3.0)',
      'Detailed course syllabus certified by Dean/Registrar',
      'Statement of Purpose addressing Data Science foundations'
    ],
    postStudyWorkVisaMonths: 18,
    dataSourceCitation: 'RWTH Aachen Official Examination Regulations M.Sc. Data Science 2026'
  },

  // 3. Univ of Manchester - M.Sc. Advanced Computer Science
  {
    id: 'crs_manchester_cs',
    universityId: 'uni_manchester',
    universityName: 'The University of Manchester',
    country: 'United Kingdom',
    courseName: 'M.Sc. Advanced Computer Science',
    faculty: 'Department of Computer Science',
    degreeLevel: 'Masters',
    durationMonths: 12,
    credits: 180,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        earlyBirdDeadline: '2026-01-15',
        regularDeadline: '2026-06-30',
        hardCutoffDeadline: '2026-07-31'
      }
    ],
    fees: {
      tuitionFeePerYear: 37500,
      estimatedLivingCostPerYear: 12150,
      semesterFeePerYear: 0,
      currency: 'GBP',
      applicationFee: 60
    },
    entryCriteria: {
      minGpa10Scale: 8.0,
      minPercentage: 75,
      englishRequirements: {
        testAccepted: ['IELTS', 'PTE', 'TOEFL'],
        minOverallIelts: 7.0,
        minIeltsSubBands: { listening: 6.5, reading: 6.5, writing: 6.5, speaking: 6.5 },
        minPte: 76,
        waiverAllowed: true,
        waiverConditions: '75%+ in 12th Standard English from CBSE/ICSE Board'
      },
      greGmat: 'Not Required',
      maxBacklogsAccepted: 2,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'First Class Honours degree (minimum 75% or 8.0 CGPA) with substantial 50%+ CS content',
      'Personal Statement (maximum 500 words)',
      'Two academic references on official letterhead with institutional email verification',
      'Valid passport copy'
    ],
    postStudyWorkVisaMonths: 24,
    dataSourceCitation: 'University of Manchester Admissions Criteria & Tier 4 / Student Route Rules 2026'
  },

  // 4. Warwick - M.Sc. Business Analytics
  {
    id: 'crs_warwick_ba',
    universityId: 'uni_warwick',
    universityName: 'University of Warwick',
    country: 'United Kingdom',
    courseName: 'M.Sc. Business Analytics',
    faculty: 'Warwick Business School (WBS)',
    degreeLevel: 'Masters',
    durationMonths: 12,
    credits: 180,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        regularDeadline: '2026-07-31',
        hardCutoffDeadline: '2026-08-15'
      }
    ],
    fees: {
      tuitionFeePerYear: 35500,
      estimatedLivingCostPerYear: 11500,
      semesterFeePerYear: 0,
      currency: 'GBP',
      applicationFee: 80
    },
    entryCriteria: {
      minGpa10Scale: 7.5,
      minPercentage: 70,
      englishRequirements: {
        testAccepted: ['IELTS', 'PTE', 'TOEFL'],
        minOverallIelts: 7.0,
        minIeltsSubBands: { listening: 6.0, reading: 6.0, writing: 6.5, speaking: 6.5 },
        minPte: 70,
        waiverAllowed: true,
        waiverConditions: 'Medium of instruction English plus 80% in CBSE 12th English'
      },
      greGmat: 'Recommended',
      minGreScore: 310,
      maxBacklogsAccepted: 3,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Undergraduate degree with strong quantitative, statistical, or mathematical content',
      'Statement of Purpose detailing career goals in Analytics',
      'One academic referee and one employer referee'
    ],
    postStudyWorkVisaMonths: 24,
    dataSourceCitation: 'Warwick Business School MSc Admissions Regulations 2026/27'
  },

  // 5. Northeastern - M.S. in Computer Science
  {
    id: 'crs_neu_cs',
    universityId: 'uni_neu',
    universityName: 'Northeastern University',
    country: 'United States',
    courseName: 'M.S. in Computer Science (MSCS)',
    faculty: 'Khoury College of Computer Sciences',
    degreeLevel: 'Masters',
    durationMonths: 24,
    credits: 32,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        earlyBirdDeadline: '2025-12-15',
        regularDeadline: '2026-04-15',
        hardCutoffDeadline: '2026-05-01'
      },
      {
        season: 'Spring',
        year: 2027,
        regularDeadline: '2026-10-01',
        hardCutoffDeadline: '2026-10-15'
      }
    ],
    fees: {
      tuitionFeePerYear: 31000,
      estimatedLivingCostPerYear: 21500,
      semesterFeePerYear: 600,
      currency: 'USD',
      applicationFee: 100
    },
    entryCriteria: {
      minGpa10Scale: 7.8,
      minPercentage: 72,
      englishRequirements: {
        testAccepted: ['IELTS', 'TOEFL', 'Duolingo'],
        minOverallIelts: 7.5,
        minIeltsSubBands: { listening: 7.0, reading: 7.0, writing: 7.0, speaking: 7.0 },
        minToefl: 100,
        waiverAllowed: false
      },
      greGmat: 'Waived',
      maxBacklogsAccepted: 2,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Statement of Purpose (500 - 1000 words)',
      '3 Letters of Recommendation (at least 2 academic)',
      'Official Transcripts and Degree Certificate with grading scale breakdown',
      'Updated Resume detailing tech projects and GitHub links'
    ],
    postStudyWorkVisaMonths: 36, // STEM OPT 3 years
    dataSourceCitation: 'Northeastern Khoury Graduate Catalog & SEVP STEM-OPT Eligibility List'
  },

  // 6. ASU - M.S. in Software Engineering
  {
    id: 'crs_asu_se',
    universityId: 'uni_asu',
    universityName: 'Arizona State University',
    country: 'United States',
    courseName: 'M.S. in Software Engineering',
    faculty: 'Ira A. Fulton Schools of Engineering',
    degreeLevel: 'Masters',
    durationMonths: 24,
    credits: 30,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        earlyBirdDeadline: '2026-01-15',
        regularDeadline: '2026-06-01',
        hardCutoffDeadline: '2026-07-01'
      }
    ],
    fees: {
      tuitionFeePerYear: 32000,
      estimatedLivingCostPerYear: 18000,
      semesterFeePerYear: 700,
      currency: 'USD',
      applicationFee: 115
    },
    entryCriteria: {
      minGpa10Scale: 7.0,
      minPercentage: 65,
      englishRequirements: {
        testAccepted: ['IELTS', 'TOEFL', 'PTE', 'Duolingo'],
        minOverallIelts: 6.5,
        minIeltsSubBands: { listening: 6.0, reading: 6.0, writing: 6.0, speaking: 6.0 },
        minToefl: 80,
        waiverAllowed: false
      },
      greGmat: 'Not Required',
      maxBacklogsAccepted: 4,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Comprehensive resume',
      'Personal Statement of Educational and Professional Objectives',
      'Two letters of recommendation from qualified professionals',
      'Financial Guarantee Statement for I-20 generation'
    ],
    postStudyWorkVisaMonths: 36,
    dataSourceCitation: 'Arizona State University Fulton Graduate Admission Requirements 2026'
  },

  // 7. Univ of Melbourne - Master of Information Technology
  {
    id: 'crs_melb_it',
    universityId: 'uni_melbourne',
    universityName: 'The University of Melbourne',
    country: 'Australia',
    courseName: 'Master of Information Technology',
    faculty: 'Faculty of Engineering and Information Technology',
    degreeLevel: 'Masters',
    durationMonths: 24,
    credits: 200,
    intakes: [
      {
        season: 'Fall', // Semester 2 in Australia
        year: 2026,
        regularDeadline: '2026-04-30',
        hardCutoffDeadline: '2026-05-15'
      },
      {
        season: 'Spring', // Semester 1 in Australia
        year: 2027,
        regularDeadline: '2026-10-31',
        hardCutoffDeadline: '2026-11-15'
      }
    ],
    fees: {
      tuitionFeePerYear: 52000,
      estimatedLivingCostPerYear: 29710,
      semesterFeePerYear: 300,
      currency: 'AUD',
      applicationFee: 100
    },
    entryCriteria: {
      minGpa10Scale: 7.5,
      minPercentage: 70,
      englishRequirements: {
        testAccepted: ['IELTS', 'PTE', 'TOEFL'],
        minOverallIelts: 6.5,
        minIeltsSubBands: { listening: 6.0, reading: 6.0, writing: 6.0, speaking: 6.0 },
        minPte: 64,
        waiverAllowed: false
      },
      greGmat: 'Not Required',
      maxBacklogsAccepted: 2,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Undergraduate degree with at least one introductory programming subject',
      'Official academic transcript and grading syllabus description',
      'Genuine Student (GS) statement compliant with Australian Department of Home Affairs guidelines'
    ],
    postStudyWorkVisaMonths: 36,
    dataSourceCitation: 'University of Melbourne FEIT Guidelines & Department of Home Affairs Australia 2026'
  },

  // 8. UCD - M.Sc. Computer Science (Negotiated Learning)
  {
    id: 'crs_ucd_cs',
    universityId: 'uni_dublin',
    universityName: 'University College Dublin (UCD)',
    country: 'Ireland',
    courseName: 'M.Sc. Computer Science (Negotiated Learning)',
    faculty: 'School of Computer Science',
    degreeLevel: 'Masters',
    durationMonths: 12,
    credits: 90,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        regularDeadline: '2026-06-30',
        hardCutoffDeadline: '2026-07-15'
      }
    ],
    fees: {
      tuitionFeePerYear: 29100,
      estimatedLivingCostPerYear: 14000,
      semesterFeePerYear: 250,
      currency: 'EUR',
      applicationFee: 60
    },
    entryCriteria: {
      minGpa10Scale: 7.2,
      minPercentage: 68,
      englishRequirements: {
        testAccepted: ['IELTS', 'Duolingo', 'PTE'],
        minOverallIelts: 6.5,
        minIeltsSubBands: { listening: 6.0, reading: 6.0, writing: 6.0, speaking: 6.0 },
        minPte: 63,
        waiverAllowed: false
      },
      greGmat: 'Not Required',
      maxBacklogsAccepted: 3,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Primary degree in Computer Science or a closely related discipline with 60% minimum',
      'Two academic reference letters',
      'Curriculum Vitae',
      'Statement of Purpose outlining elective stream preference'
    ],
    postStudyWorkVisaMonths: 24, // Ireland Third Level Graduate Scheme (Stamp 1G)
    dataSourceCitation: 'UCD Graduate Studies Admissions Handbook & Education in Ireland 2026'
  },

  // 9. Univ of Waterloo - M.Math in Computer Science (Public)
  {
    id: 'crs_waterloo_cs',
    universityId: 'uni_waterloo',
    universityName: 'University of Waterloo',
    country: 'Canada',
    courseName: 'M.Math in Computer Science (Coursework)',
    faculty: 'David R. Cheriton School of Computer Science',
    degreeLevel: 'Masters',
    durationMonths: 16,
    credits: 30,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        regularDeadline: '2026-05-15',
        hardCutoffDeadline: '2026-06-01'
      }
    ],
    fees: {
      tuitionFeePerYear: 28500,
      estimatedLivingCostPerYear: 16800,
      semesterFeePerYear: 600,
      currency: 'CAD',
      applicationFee: 125
    },
    entryCriteria: {
      minGpa10Scale: 8.1,
      minPercentage: 76,
      englishRequirements: {
        testAccepted: ['IELTS', 'TOEFL'],
        minOverallIelts: 7.0,
        minIeltsSubBands: { listening: 6.5, reading: 6.5, writing: 6.5, speaking: 6.5 },
        minToefl: 93,
        waiverAllowed: false
      },
      greGmat: 'Recommended',
      maxBacklogsAccepted: 1,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Honours Bachelor degree in Computer Science or Engineering with minimum 78% average',
      'Three academic letters of reference',
      'Supplementary Information Form (SIF)'
    ],
    postStudyWorkVisaMonths: 36,
    dataSourceCitation: 'University of Waterloo Graduate Studies Academic Calendar 2026/27'
  },

  // 10. USC - M.S. in Computer Science (Private)
  {
    id: 'crs_usc_cs',
    universityId: 'uni_usc',
    universityName: 'University of Southern California (USC)',
    country: 'United States',
    courseName: 'M.S. in Computer Science (Data Science & AI)',
    faculty: 'Viterbi School of Engineering',
    degreeLevel: 'Masters',
    durationMonths: 24,
    credits: 32,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        regularDeadline: '2026-05-15',
        hardCutoffDeadline: '2026-06-01'
      }
    ],
    fees: {
      tuitionFeePerYear: 36500,
      estimatedLivingCostPerYear: 22000,
      semesterFeePerYear: 850,
      currency: 'USD',
      applicationFee: 90
    },
    entryCriteria: {
      minGpa10Scale: 8.3,
      minPercentage: 78,
      englishRequirements: {
        testAccepted: ['IELTS', 'TOEFL', 'PTE'],
        minOverallIelts: 7.0,
        minIeltsSubBands: { listening: 6.5, reading: 6.5, writing: 6.5, speaking: 6.5 },
        minToefl: 95,
        waiverAllowed: false
      },
      greGmat: 'Not Required',
      maxBacklogsAccepted: 1,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Four-year Bachelor degree in Computer Science or closely related engineering discipline',
      'Statement of Purpose & two Letters of Recommendation'
    ],
    postStudyWorkVisaMonths: 36,
    dataSourceCitation: 'USC Viterbi Graduate Admissions & International Student Criteria 2026'
  },

  // 11. NYU Tandon - M.S. in Computer Engineering (Private)
  {
    id: 'crs_nyu_ce',
    universityId: 'uni_nyu',
    universityName: 'New York University (NYU Tandon)',
    country: 'United States',
    courseName: 'M.S. in Computer Science & Engineering',
    faculty: 'Tandon School of Engineering',
    degreeLevel: 'Masters',
    durationMonths: 24,
    credits: 30,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        regularDeadline: '2026-05-01',
        hardCutoffDeadline: '2026-06-01'
      }
    ],
    fees: {
      tuitionFeePerYear: 35200,
      estimatedLivingCostPerYear: 23500,
      semesterFeePerYear: 900,
      currency: 'USD',
      applicationFee: 90
    },
    entryCriteria: {
      minGpa10Scale: 8.1,
      minPercentage: 76,
      englishRequirements: {
        testAccepted: ['IELTS', 'TOEFL', 'Duolingo'],
        minOverallIelts: 7.0,
        minIeltsSubBands: { listening: 6.5, reading: 6.5, writing: 6.5, speaking: 6.5 },
        minToefl: 90,
        waiverAllowed: false
      },
      greGmat: 'Optional' as any,
      maxBacklogsAccepted: 2,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Undergraduate coursework in Data Structures, Algorithms, and Operating Systems',
      'Statement of Purpose & two Letters of Recommendation'
    ],
    postStudyWorkVisaMonths: 36,
    dataSourceCitation: 'NYU Tandon School of Engineering Graduate Admissions Bulletin 2026/27'
  },

  // 12. Boston University - M.S. in Artificial Intelligence (Private)
  {
    id: 'crs_bu_ai',
    universityId: 'uni_bu',
    universityName: 'Boston University',
    country: 'United States',
    courseName: 'M.S. in Artificial Intelligence & Computing',
    faculty: 'Graduate School of Arts & Sciences',
    degreeLevel: 'Masters',
    durationMonths: 18,
    credits: 32,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        regularDeadline: '2026-05-15',
        hardCutoffDeadline: '2026-06-15'
      }
    ],
    fees: {
      tuitionFeePerYear: 34800,
      estimatedLivingCostPerYear: 21000,
      semesterFeePerYear: 650,
      currency: 'USD',
      applicationFee: 95
    },
    entryCriteria: {
      minGpa10Scale: 7.9,
      minPercentage: 74,
      englishRequirements: {
        testAccepted: ['IELTS', 'TOEFL'],
        minOverallIelts: 7.0,
        minIeltsSubBands: { listening: 6.5, reading: 6.5, writing: 6.5, speaking: 6.5 },
        minToefl: 92,
        waiverAllowed: false
      },
      greGmat: 'Not Required',
      maxBacklogsAccepted: 2,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Strong foundation in linear algebra, probability, and programming',
      'Personal statement and two academic references'
    ],
    postStudyWorkVisaMonths: 36,
    dataSourceCitation: 'Boston University Graduate School of Arts & Sciences Admissions 2026'
  },

  // 13. Constructor University Bremen - M.Sc. Computer Science & Software Engineering (Private)
  {
    id: 'crs_constructor_cs',
    universityId: 'uni_Constructor',
    universityName: 'Constructor University Bremen',
    country: 'Germany',
    courseName: 'M.Sc. Computer Science & Software Engineering',
    faculty: 'School of Computer Science and Engineering',
    degreeLevel: 'Masters',
    durationMonths: 24,
    credits: 120,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        regularDeadline: '2026-07-01',
        hardCutoffDeadline: '2026-07-15'
      }
    ],
    fees: {
      tuitionFeePerYear: 20000,
      estimatedLivingCostPerYear: 11208,
      semesterFeePerYear: 350,
      currency: 'EUR',
      applicationFee: 0
    },
    entryCriteria: {
      minGpa10Scale: 7.5,
      minPercentage: 70,
      englishRequirements: {
        testAccepted: ['IELTS', 'TOEFL', 'Duolingo'],
        minOverallIelts: 6.5,
        minIeltsSubBands: { listening: 6.0, reading: 6.0, writing: 6.0, speaking: 6.0 },
        minToefl: 90,
        waiverAllowed: true
      },
      greGmat: 'Not Required',
      maxBacklogsAccepted: 3,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'German APS Certificate',
      'Bachelor degree in CS, IT, or Software Engineering'
    ],
    postStudyWorkVisaMonths: 18,
    dataSourceCitation: 'Constructor University Graduate Admission Guidelines 2026'
  },

  // 14. Frankfurt School of Finance & Management - M.Sc. in Applied Data Science (Private)
  {
    id: 'crs_frankfurt_ads',
    universityId: 'uni_frankfurt_fs',
    universityName: 'Frankfurt School of Finance & Management',
    country: 'Germany',
    courseName: 'M.Sc. in Applied Data Science & AI',
    faculty: 'Department of Computation & Analytics',
    degreeLevel: 'Masters',
    durationMonths: 24,
    credits: 120,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        regularDeadline: '2026-06-30',
        hardCutoffDeadline: '2026-07-15'
      }
    ],
    fees: {
      tuitionFeePerYear: 19500,
      estimatedLivingCostPerYear: 11208,
      semesterFeePerYear: 300,
      currency: 'EUR',
      applicationFee: 100
    },
    entryCriteria: {
      minGpa10Scale: 7.6,
      minPercentage: 71,
      englishRequirements: {
        testAccepted: ['IELTS', 'TOEFL', 'PTE'],
        minOverallIelts: 7.0,
        minIeltsSubBands: { listening: 6.5, reading: 6.5, writing: 6.5, speaking: 6.5 },
        minToefl: 90,
        waiverAllowed: false
      },
      greGmat: 'Recommended',
      maxBacklogsAccepted: 2,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Quantitative undergraduate degree',
      'German APS Certificate and Admissions Interview'
    ],
    postStudyWorkVisaMonths: 18,
    dataSourceCitation: 'Frankfurt School MSc Admissions & Selection Statute 2026'
  },

  // 15. SRH Hochschule Heidelberg - M.Sc. Applied Computer Science (Private)
  {
    id: 'crs_srh_acs',
    universityId: 'uni_srh_heidelberg',
    universityName: 'SRH Hochschule Heidelberg',
    country: 'Germany',
    courseName: 'M.Sc. Applied Computer Science',
    faculty: 'School of Information, Media and Design',
    degreeLevel: 'Masters',
    durationMonths: 24,
    credits: 120,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        regularDeadline: '2026-07-31',
        hardCutoffDeadline: '2026-08-15'
      }
    ],
    fees: {
      tuitionFeePerYear: 11800,
      estimatedLivingCostPerYear: 11208,
      semesterFeePerYear: 280,
      currency: 'EUR',
      applicationFee: 0
    },
    entryCriteria: {
      minGpa10Scale: 6.8,
      minPercentage: 63,
      englishRequirements: {
        testAccepted: ['IELTS', 'TOEFL', 'PTE', 'Duolingo'],
        minOverallIelts: 6.5,
        minIeltsSubBands: { listening: 6.0, reading: 6.0, writing: 6.0, speaking: 6.0 },
        minToefl: 80,
        waiverAllowed: true
      },
      greGmat: 'Not Required',
      maxBacklogsAccepted: 5,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Bachelor degree in Engineering or Computer Science',
      'German APS Certificate'
    ],
    postStudyWorkVisaMonths: 18,
    dataSourceCitation: 'SRH Heidelberg International Admissions Criteria 2026'
  },

  // 16. Rochester Institute of Technology (RIT) - M.S. in Software Engineering (Private)
  {
    id: 'crs_rit_se',
    universityId: 'uni_rit',
    universityName: 'Rochester Institute of Technology (RIT)',
    country: 'United States',
    courseName: 'M.S. in Software Engineering',
    faculty: 'Golisano College of Computing and Information Sciences',
    degreeLevel: 'Masters',
    durationMonths: 24,
    credits: 30,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        regularDeadline: '2026-06-15',
        hardCutoffDeadline: '2026-07-01'
      }
    ],
    fees: {
      tuitionFeePerYear: 31500,
      estimatedLivingCostPerYear: 16500,
      semesterFeePerYear: 500,
      currency: 'USD',
      applicationFee: 65
    },
    entryCriteria: {
      minGpa10Scale: 7.2,
      minPercentage: 67,
      englishRequirements: {
        testAccepted: ['IELTS', 'TOEFL', 'PTE'],
        minOverallIelts: 6.5,
        minIeltsSubBands: { listening: 6.0, reading: 6.0, writing: 6.0, speaking: 6.0 },
        minToefl: 88,
        waiverAllowed: false
      },
      greGmat: 'Not Required',
      maxBacklogsAccepted: 4,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Bachelor degree in computing or related discipline',
      'Personal statement and two recommendations'
    ],
    postStudyWorkVisaMonths: 36,
    dataSourceCitation: 'RIT Golisano College of Computing Graduate Catalog 2026'
  },

  // 17. Stevens Institute of Technology - M.S. in Computer Science (Private)
  {
    id: 'crs_stevens_cs',
    universityId: 'uni_stevens',
    universityName: 'Stevens Institute of Technology',
    country: 'United States',
    courseName: 'M.S. in Computer Science',
    faculty: 'Schaefer School of Engineering and Science',
    degreeLevel: 'Masters',
    durationMonths: 24,
    credits: 30,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        regularDeadline: '2026-06-15',
        hardCutoffDeadline: '2026-07-01'
      }
    ],
    fees: {
      tuitionFeePerYear: 33200,
      estimatedLivingCostPerYear: 19000,
      semesterFeePerYear: 600,
      currency: 'USD',
      applicationFee: 70
    },
    entryCriteria: {
      minGpa10Scale: 7.3,
      minPercentage: 68,
      englishRequirements: {
        testAccepted: ['IELTS', 'TOEFL', 'Duolingo'],
        minOverallIelts: 6.5,
        minIeltsSubBands: { listening: 6.0, reading: 6.0, writing: 6.0, speaking: 6.0 },
        minToefl: 86,
        waiverAllowed: false
      },
      greGmat: 'Not Required',
      maxBacklogsAccepted: 3,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Undergraduate degree in CS or STEM field',
      'Official transcripts and Statement of Purpose'
    ],
    postStudyWorkVisaMonths: 36,
    dataSourceCitation: 'Stevens Schaefer School of Engineering & Science Graduate Bulletin 2026'
  },

  // 18. Illinois Institute of Technology - M.A.S. in Computer Science (Private)
  {
    id: 'crs_iit_chicago_cs',
    universityId: 'uni_iit_chicago',
    universityName: 'Illinois Institute of Technology (Illinois Tech)',
    country: 'United States',
    courseName: 'Master of Computer Science (M.C.S.)',
    faculty: 'College of Computing',
    degreeLevel: 'Masters',
    durationMonths: 24,
    credits: 30,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        regularDeadline: '2026-06-30',
        hardCutoffDeadline: '2026-07-15'
      }
    ],
    fees: {
      tuitionFeePerYear: 29800,
      estimatedLivingCostPerYear: 17200,
      semesterFeePerYear: 550,
      currency: 'USD',
      applicationFee: 75
    },
    entryCriteria: {
      minGpa10Scale: 6.9,
      minPercentage: 64,
      englishRequirements: {
        testAccepted: ['IELTS', 'TOEFL', 'PTE', 'Duolingo'],
        minOverallIelts: 6.5,
        minIeltsSubBands: { listening: 6.0, reading: 6.0, writing: 6.0, speaking: 6.0 },
        minToefl: 80,
        waiverAllowed: false
      },
      greGmat: 'Not Required',
      maxBacklogsAccepted: 5,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Four-year undergraduate degree',
      'Financial support affidavit for I-20'
    ],
    postStudyWorkVisaMonths: 36,
    dataSourceCitation: 'Illinois Tech College of Computing Graduate Admission Standards 2026'
  },

  // 19. Bond University - Master of Information Technology (Private)
  {
    id: 'crs_bond_it',
    universityId: 'uni_bond',
    universityName: 'Bond University',
    country: 'Australia',
    courseName: 'Master of Information Technology (Professional)',
    faculty: 'Bond Business School & IT Faculty',
    degreeLevel: 'Masters',
    durationMonths: 20,
    credits: 160,
    intakes: [
      {
        season: 'Fall',
        year: 2026,
        regularDeadline: '2026-07-15',
        hardCutoffDeadline: '2026-08-01'
      }
    ],
    fees: {
      tuitionFeePerYear: 42000,
      estimatedLivingCostPerYear: 24500,
      semesterFeePerYear: 300,
      currency: 'AUD',
      applicationFee: 0
    },
    entryCriteria: {
      minGpa10Scale: 6.5,
      minPercentage: 60,
      englishRequirements: {
        testAccepted: ['IELTS', 'PTE', 'TOEFL'],
        minOverallIelts: 6.5,
        minIeltsSubBands: { listening: 6.0, reading: 6.0, writing: 6.0, speaking: 6.0 },
        minPte: 58,
        waiverAllowed: false
      },
      greGmat: 'Not Required',
      maxBacklogsAccepted: 6,
      workExperienceMonthsRequired: 0
    },
    specificPrerequisites: [
      'Recognized Bachelor degree in any discipline',
      'Genuine Student (GS) declaration'
    ],
    postStudyWorkVisaMonths: 36,
    dataSourceCitation: 'Bond University International Postgraduate Entry Handbook 2026'
  }
];
