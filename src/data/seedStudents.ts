import { StudentMasterProfile } from '../types/crm';

export const INITIAL_STUDENT_PROFILES: StudentMasterProfile[] = [
  {
    id: 'std_01',
    studentRefNo: 'GMI-2026-0089',
    createdAt: '2026-09-02T10:15:00Z',
    updatedAt: '2026-09-18T14:30:00Z',
    currentStage: 'application_filing',
    branch: 'Hyderabad - Somajiguda',
    assignedCounselorId: 'usr_c1',
    assignedCounselorName: 'Sandeep Koteshwara',
    assignedProcessingOfficerId: 'usr_c1',
    assignedProcessingOfficerName: 'Sandeep Koteshwara',
    assignedVisaOfficerId: 'usr_c1',
    assignedVisaOfficerName: 'Sandeep Koteshwara',
    personal: {
      firstName: 'Sandeep',
      lastName: 'Fidrox',
      email: 'sandeepfidrox@gmail.com',
      phone: '+91 98490 11223',
      whatsapp: '+91 98490 11223',
      dateOfBirth: '2003-05-14',
      nationality: 'Indian',
      passportNumber: 'Z8472910',
      aadhaarNumber: '7823 4912 8492',
      panNumber: 'ABCDE8472F',
      city: 'Hyderabad',
      state: 'Telangana',
      gender: 'Male',
      emergencyContact: {
        name: 'Venkatesh Reddy',
        relation: 'Father',
        phone: '+91 98490 00111',
        email: 'venkatesh.reddy@example.com',
        portalAccessEnabled: true
      }
    },
    leadDetails: {
      source: 'education_fair',
      subSource: 'Study Abroad Information Desk',
      leadScore: 92,
      firstContactDate: '2026-09-02',
      duplicateFlag: false
    },
    academics: {
      highestQualification: 'B.Tech in Computer Science',
      institution: 'JNTU Hyderabad',
      completionYear: 2025,
      scoreType: 'gpa_10',
      scoreValue: 8.65,
      backlogs: 0,
      englishTest: {
        testType: 'IELTS',
        overallScore: 7.5,
        bands: { listening: 8.0, reading: 7.5, writing: 7.0, speaking: 7.5 },
        testDate: '2026-07-10'
      },
      greGmat: {
        testType: 'GRE',
        score: 318
      }
    },
    preferences: {
      targetCountries: ['United Kingdom', 'Ireland'],
      targetDegree: 'Masters',
      targetIntakeSeason: 'Fall',
      targetIntakeYear: 2027,
      targetFields: ['MSc Advanced Computer Science', 'Artificial Intelligence'],
      budgetCapInLakhsINR: 35,
      requiresLoan: true
    },
    registration: {
      isRegistered: true,
      registrationDate: '2026-09-06',
      registrationFeeAmount: 15000,
      paymentStatus: 'paid',
      agreementSigned: true,
      agreementSignedAt: '2026-09-06T15:20:00Z'
    },
    parallelServices: {
      educationLoan: {
        active: true,
        partnerBank: 'HDFC Credila',
        sanctionAmount: 3000000,
        status: 'in_review'
      },
      testPrep: {
        active: false
      },
      forexCard: {
        active: true,
        status: 'pending'
      },
      simCard: {
        active: true,
        provider: 'Giffgaff',
        status: 'pending'
      },
      accommodation: {
        active: true,
        status: 'searching',
        housingPartner: 'AmberStudent'
      }
    },
    applications: [
      {
        id: 'app_01',
        universityName: 'University of Manchester',
        country: 'United Kingdom',
        courseName: 'MSc Advanced Computer Science',
        category: 'Ambitious',
        status: 'submitted',
        applicationRefId: 'MAN-2026-77821',
        appliedDate: '2026-09-14'
      },
      {
        id: 'app_02',
        universityName: 'University of Birmingham',
        country: 'United Kingdom',
        courseName: 'MSc Computer Science',
        category: 'Moderate',
        status: 'conditional_offer',
        applicationRefId: 'BHAM-89421',
        appliedDate: '2026-09-10',
        offerReceivedDate: '2026-09-17',
        tuitionDepositDeadline: '2026-11-15'
      }
    ],
    documents: [
      { id: 'doc_1', name: '10th & 12th Marks Memo', category: 'Academic', status: 'verified', fileSizeMb: 2.1, uploadedAt: '2026-09-07' },
      { id: 'doc_2', name: 'B.Tech Consolidated Transcript', category: 'Academic', status: 'verified', fileSizeMb: 4.8, uploadedAt: '2026-09-07' },
      { id: 'doc_3', name: 'Valid Passport (All Pages)', category: 'Identity', status: 'verified', fileSizeMb: 3.2, uploadedAt: '2026-09-07' },
      { id: 'doc_4', name: 'IELTS Official TRF Scorecard', category: 'Academic', status: 'verified', fileSizeMb: 1.1, uploadedAt: '2026-09-08' },
      { id: 'doc_5', name: 'Statement of Purpose (SOP - UK Final)', category: 'Statement', status: 'verified', fileSizeMb: 0.6, uploadedAt: '2026-09-11' },
      { id: 'doc_6', name: 'Letters of Recommendation (2 Academic LORs)', category: 'Statement', status: 'verified', fileSizeMb: 1.4, uploadedAt: '2026-09-11' }
    ],
    tasks: [
      {
        id: 'tsk_1',
        title: 'Submit Manchester supplementary coding portfolio questionnaire',
        assignedToRole: 'counselor',
        assignedToName: 'Sandeep Koteshwara',
        dueDate: '2026-09-22',
        priority: 'high',
        completed: false,
        slaHoursRemaining: 68,
        isOverdue: false
      }
    ],
    auditTrail: [
      { id: 'aud_1', timestamp: '2026-09-02T10:15:00Z', action: 'Lead Created', performedBy: 'Sandeep Koteshwara', role: 'counselor', details: 'Direct registration from Information Desk' },
      { id: 'aud_2', timestamp: '2026-09-06T15:20:00Z', action: 'Student Registered', performedBy: 'Sandeep Koteshwara', role: 'counselor', details: 'Agreement signed, registration fee received' },
      { id: 'aud_3', timestamp: '2026-09-14T11:00:00Z', action: 'Applications Dispatched', performedBy: 'Sandeep Koteshwara', role: 'counselor', details: 'Filing completed for Manchester and Birmingham portals' }
    ]
  }
];
