/**
 * Student Lifecycle CRM - Travel & Post-Landing Domain Engine
 * Enforces Travel Readiness blocking conditions, authorized ticket issuance,
 * configurable arrival services, student privacy checks, and support ticket escalations.
 */

import { StudentMasterProfile } from '../types/crm';
import {
  TravelReadinessRecord,
  TravelChecklistItem,
  PreDepartureBriefing,
  TravelDeskBooking,
  FlightOption,
  PaymentStatus,
  ArrivalServicesRecord,
  SupportTicketRecord,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  EscalationLevel,
  DepartureReminderItem,
  TravelTestScenarioResult
} from '../types/travelPostLanding';

export class TravelPostLandingEngine {
  private readinessRecords: Map<string, TravelReadinessRecord> = new Map();
  private travelBookings: Map<string, TravelDeskBooking> = new Map();
  private arrivalServices: Map<string, ArrivalServicesRecord> = new Map();
  private supportTickets: Map<string, SupportTicketRecord> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // -------------------------------------------------------------------------
    // Student 1: Aarav Reddy (UK - Manchester) - Travel Desk in progress
    // -------------------------------------------------------------------------
    const aaravReadiness: TravelReadinessRecord = {
      id: 'tr_aarav',
      studentId: 'std_01',
      studentRefNo: 'GMI-2026-0089',
      studentName: 'Aarav Reddy',
      destinationCountry: 'United Kingdom',
      readinessStatus: 'in_progress',
      preDepartureBriefing: {
        id: 'pdb_01',
        briefingDate: '2026-09-18T10:00:00Z',
        sessionMode: 'in_person',
        attended: true,
        conductedBy: 'Pooja Sharma (Senior Counselor)',
        packReceived: true,
        topicsCovered: [
          { id: 'top_1', title: 'Currency & BRP Collection Protocol', completed: true },
          { id: 'top_2', title: 'UK Border Control & Border Force Questions', completed: true },
          { id: 'top_3', title: 'National Health Service (NHS) & GP Registration', completed: true },
          { id: 'top_4', title: 'Academic Culture & Plagiarism Policies', completed: true },
          { id: 'top_5', title: 'Climate, Winter Clothing & Electrical Adapters', completed: true },
          { id: 'top_6', title: 'Part-time Work Limits (20 hrs/week term time)', completed: true }
        ],
        notes: 'Aarav attended with father Venkatesh Reddy. Clarified BRP collection at Manchester post office within 10 days.',
        lastUpdated: '2026-09-18T12:00:00Z'
      },
      checklist: [
        { id: 'chk_1', title: 'Passport with UK Entry Vignette Sticker', category: 'documents', isMandatory: true, completed: true, verifiedBy: 'Sunita Rao', verifiedAt: '2026-09-15' },
        { id: 'chk_2', title: 'CAS Statement & Unconditional Offer Letter', category: 'documents', isMandatory: true, completed: true, verifiedBy: 'Rajesh Nair', verifiedAt: '2026-09-15' },
        { id: 'chk_3', title: 'Tuition Fee Payment & Scholarship Receipts', category: 'financial', isMandatory: true, completed: true, verifiedBy: 'Sunil Verma', verifiedAt: '2026-09-16' },
        { id: 'chk_4', title: 'TB Clearance Medical Certificate', category: 'health', isMandatory: true, completed: true, verifiedBy: 'Sunita Rao', verifiedAt: '2026-09-15' },
        { id: 'chk_5', title: 'Confirmed Flight Ticket & Valid PNR', category: 'logistics', isMandatory: true, completed: false, notes: 'Awaiting student final flight quote selection' },
        { id: 'chk_6', title: 'Accommodation Tenancy Agreement / Hall Booking', category: 'logistics', isMandatory: true, completed: true, verifiedBy: 'Pooja Sharma', verifiedAt: '2026-09-16' },
        { id: 'chk_7', title: 'Forex Multi-Currency Card & Initial British Pounds Cash', category: 'financial', isMandatory: true, completed: true, verifiedBy: 'Sunil Verma', verifiedAt: '2026-09-17' },
        { id: 'chk_8', title: 'Prescribed Medications with Doctor Letter & Generic Names', category: 'health', isMandatory: false, completed: true, verifiedBy: 'Pooja Sharma' }
      ],
      flightConfirmation: {
        isConfirmed: false,
        airline: 'Emirates',
        flightNumber: 'EK 527 / EK 17',
        pnr: '',
        departureAirport: 'HYD (Rajiv Gandhi International)',
        arrivalAirport: 'MAN (Manchester Airport Terminal 1)',
        departureDateTime: '2026-09-28T09:45:00Z',
        arrivalDateTime: '2026-09-28T19:30:00Z'
      },
      accommodationConfirmation: {
        status: 'confirmed',
        type: 'private_student_hall',
        address: 'Artisan Heights, 1 New Wakefield St',
        city: 'Manchester',
        postalCode: 'M1 5WT',
        landlordOrManagerName: 'Unite Students Residence Desk',
        contactPhone: '+44 161 826 4920',
        leaseStartDate: '2026-09-25',
        depositPaid: true,
        bookingVoucherName: 'Artisan_Heights_Tenancy_Aarav.pdf',
        verifiedBy: 'Pooja Sharma'
      },
      insuranceVerification: {
        provider: 'UK National Health Service (IHS Paid) + Tata AIG Travel Guard',
        policyNumber: 'IHS-UK-84920419 / TAIG-99421',
        validFrom: '2026-09-25',
        validUntil: '2027-09-25',
        medicalCoverageAmountEurOrGbp: 100000,
        repatriationIncluded: true,
        verified: true,
        policyDocumentName: 'Aarav_IHS_Receipt_and_Travel_Insurance.pdf',
        verifiedBy: 'Sunita Rao',
        verifiedAt: '2026-09-16'
      },
      forexCompletion: {
        provider: 'Thomas Cook Borderless Prepaid Mastercard',
        currency: 'GBP',
        cardLoadedAmount: 3500,
        cashInHandAmount: 400,
        cardDispatched: true,
        cardActivationStatus: 'active',
        forexReceiptName: 'ThomasCook_Forex_Receipt_GBP.pdf',
        completed: true,
        verifiedBy: 'Sunil Verma'
      },
      universityReporting: {
        campusName: 'University of Manchester - Oxford Road Campus',
        reportingDeadline: '2026-10-02',
        orientationStartDate: '2026-09-29',
        internationalOfficeEmail: 'international@manchester.ac.uk',
        internationalOfficePhone: '+44 161 275 2077',
        reportingAddress: 'Student Services Centre, Burlington St, Manchester M13 9PL',
        requiredDocumentsAtDesk: ['Original Passport & Vignette', 'Original B.Tech Degree Certificate & Transcripts', 'IELTS Official TRF', 'CAS Letter Printout'],
        reportingAcknowledgedByStudent: true
      },
      emergencyContacts: {
        primaryParentName: 'Venkatesh Reddy (Father)',
        primaryParentRelation: 'Father',
        primaryParentPhone: '+91 98490 00111',
        secondaryContactName: 'Kavitha Reddy (Mother)',
        secondaryContactPhone: '+91 98490 00222',
        localHostOrAdvisorName: 'Dr. Alistair Finch (Senior Tutor, Dept of CS)',
        localHostPhone: '+44 161 275 6120',
        twentyFourSevenHelpline: '+91 1800 200 4642 (24x7 Post-Landing Desk)'
      },
      blockingReasons: ['Flight confirmation and valid PNR pending in Travel Desk'],
      createdAt: '2026-09-15T10:00:00Z',
      updatedAt: '2026-09-18T14:00:00Z'
    };

    const aaravBooking: TravelDeskBooking = {
      id: 'tb_aarav',
      studentId: 'std_01',
      studentRefNo: 'GMI-2026-0089',
      studentName: 'Aarav Reddy',
      destinationCountry: 'United Kingdom',
      flightOptions: [
        {
          id: 'fo_1',
          airline: 'Emirates',
          flightNumber: 'EK 527 / EK 17',
          routing: 'HYD -> DXB (3h 10m layover) -> MAN',
          departureAirport: 'HYD (Hyderabad)',
          arrivalAirport: 'MAN (Manchester)',
          departureDateTime: '2026-09-28T09:45:00',
          arrivalDateTime: '2026-09-28T19:30:00',
          fareInr: 48500,
          cabinBaggageKg: 7,
          checkInBaggage: '2 x 23 kg Student Allowance',
          transitVisaRequired: false,
          transitDurationHours: 3.16,
          isRecommended: true,
          studentApproved: false,
          notes: 'Best student baggage allowance (46kg total). Free meal & seamless Dubai connection.'
        },
        {
          id: 'fo_2',
          airline: 'Qatar Airways',
          flightNumber: 'QR 501 / QR 23',
          routing: 'HYD -> DOH (2h 40m layover) -> MAN',
          departureAirport: 'HYD (Hyderabad)',
          arrivalAirport: 'MAN (Manchester)',
          departureDateTime: '2026-09-28T04:10:00',
          arrivalDateTime: '2026-09-28T14:15:00',
          fareInr: 51200,
          cabinBaggageKg: 7,
          checkInBaggage: '40 kg Student Baggage (Flexible Pieces)',
          transitVisaRequired: false,
          transitDurationHours: 2.66,
          isRecommended: false,
          studentApproved: false,
          notes: 'Early afternoon arrival in Manchester, convenient for same-day hall check-in.'
        },
        {
          id: 'fo_3',
          airline: 'Air India',
          flightNumber: 'AI 543 / AI 165',
          routing: 'HYD -> DEL (2h 15m) -> LHR (Train to MAN)',
          departureAirport: 'HYD (Hyderabad)',
          arrivalAirport: 'LHR (London Heathrow)',
          departureDateTime: '2026-09-28T07:00:00',
          arrivalDateTime: '2026-09-28T18:00:00',
          fareInr: 42000,
          cabinBaggageKg: 8,
          checkInBaggage: '2 x 23 kg',
          transitVisaRequired: false,
          transitDurationHours: 0,
          isRecommended: false,
          studentApproved: false,
          notes: 'Cheaper fare but requires 2-hour train journey from London Euston to Manchester Piccadilly.'
        }
      ],
      selectedOptionId: 'fo_1',
      studentApprovalStatus: 'pending_student_review',
      paymentStatus: 'unpaid',
      ticketIssuanceStatus: 'quote_submitted',
      baggageDetails: {
        cabinKg: 7,
        checkInPieces: 2,
        checkInWeightPerPieceKg: 23,
        specialStudentAllowanceNote: 'Verified 46kg allowance under Emirates Student Club'
      },
      transitValidation: {
        passed: true,
        transitAirport: 'DXB (Dubai International Airport)',
        visaRequired: false,
        transitTimeMinutes: 190,
        airsideTransitOnly: true,
        verifiedBy: 'Sunita Rao (Visa Specialist)',
        verifiedAt: '2026-09-17',
        notes: 'Indian passport holders do not require UAE transit visa for stay under 24 hours within airport transit area.'
      },
      airportPickupNotified: false,
      departureReminders: [
        { id: 'rem_1', stage: 'T-7 days', scheduledDate: '2026-09-21', message: 'Comprehensive packing checklist & essential medicines doctor prescription guidelines sent.', sent: false },
        { id: 'rem_2', stage: 'T-72h', scheduledDate: '2026-09-25', message: 'Web check-in opening reminder, seat selection & boarding pass download alert.', sent: false },
        { id: 'rem_3', stage: 'T-24h', scheduledDate: '2026-09-27', message: 'Airport reporting protocol: Arrive 4 hours before departure at RGI Airport with physical documentation dossier.', sent: false }
      ],
      createdAt: '2026-09-16T11:00:00Z',
      updatedAt: '2026-09-18T14:30:00Z'
    };

    // -------------------------------------------------------------------------
    // Student 2: Meera Kulkarni (Germany - TUM) - Ready for departure / Flight confirmed
    // -------------------------------------------------------------------------
    const meeraReadiness: TravelReadinessRecord = {
      id: 'tr_meera',
      studentId: 'std_02',
      studentRefNo: 'GMI-2026-0045',
      studentName: 'Meera Kulkarni',
      destinationCountry: 'Germany',
      readinessStatus: 'ready_for_departure',
      preDepartureBriefing: {
        id: 'pdb_02',
        briefingDate: '2026-09-15T15:00:00Z',
        sessionMode: 'online_zoom',
        attended: true,
        conductedBy: 'Ananya Sen (Counselor)',
        packReceived: true,
        topicsCovered: [
          { id: 'top_11', title: 'German Bürgeramt (City Registration) Mandate (14 days)', completed: true },
          { id: 'top_12', title: 'Coracle Blocked Account Activation & Current Account Setup', completed: true },
          { id: 'top_13', title: 'TK Public Health Insurance Certificate Activation', completed: true },
          { id: 'top_14', title: 'TUM Enrolment Documents & Semester Ticket (MVV/Deutschlandticket)', completed: true },
          { id: 'top_15', title: 'Recycling, Quiet Hours (Ruhezeit) & German Rental Etiquette', completed: true },
          { id: 'top_16', title: 'Residence Permit (Aufenthaltstitel) Appointment Preparation', completed: true }
        ],
        notes: 'Meera was fully briefed on Munich registration offices and blocked account payout rules.',
        lastUpdated: '2026-09-15T17:00:00Z'
      },
      checklist: [
        { id: 'chk_11', title: 'Valid Passport with German National Visa (Type D)', category: 'documents', isMandatory: true, completed: true, verifiedBy: 'Sunita Rao', verifiedAt: '2026-09-14' },
        { id: 'chk_12', title: 'TUM Zulassungsbescheid (Admission Letter)', category: 'documents', isMandatory: true, completed: true, verifiedBy: 'Kavita Menon', verifiedAt: '2026-09-14' },
        { id: 'chk_13', title: 'APS Certificate Original & Certified Copies', category: 'documents', isMandatory: true, completed: true, verifiedBy: 'Kavita Menon', verifiedAt: '2026-09-14' },
        { id: 'chk_14', title: 'Coracle Blocked Account 06 Opening Confirmation (€11,904)', category: 'financial', isMandatory: true, completed: true, verifiedBy: 'Sunita Rao', verifiedAt: '2026-09-14' },
        { id: 'chk_15', title: 'TK (Techniker Krankenkasse) Health Insurance Certificate', category: 'health', isMandatory: true, completed: true, verifiedBy: 'Sunita Rao', verifiedAt: '2026-09-14' },
        { id: 'chk_16', title: 'Confirmed Flight Ticket & Valid PNR', category: 'logistics', isMandatory: true, completed: true, verifiedBy: 'Ananya Sen', verifiedAt: '2026-09-17' },
        { id: 'chk_17', title: 'Wohnungsgeberbestätigung / Student Dorm Booking Confirmation', category: 'logistics', isMandatory: true, completed: true, verifiedBy: 'Ananya Sen', verifiedAt: '2026-09-17' },
        { id: 'chk_18', title: 'Forex Multi-Currency Card loaded with €2,500 + €350 Cash', category: 'financial', isMandatory: true, completed: true, verifiedBy: 'Sunil Verma', verifiedAt: '2026-09-17' }
      ],
      flightConfirmation: {
        isConfirmed: true,
        airline: 'Lufthansa',
        flightNumber: 'LH 765',
        pnr: 'MUC92K',
        departureAirport: 'BLR (Kempegowda International Airport)',
        arrivalAirport: 'MUC (Munich International Airport Terminal 2)',
        departureDateTime: '2026-09-24T03:30:00Z',
        arrivalDateTime: '2026-09-24T09:20:00Z',
        eTicketDocumentName: 'LH_Eticket_MeeraKulkarni_MUC92K.pdf',
        verifiedByOfficer: 'Sunita Rao',
        verifiedAt: '2026-09-17'
      },
      accommodationConfirmation: {
        status: 'confirmed',
        type: 'university_dorm',
        address: 'Studentenstadt Freimann, Christoph-Probst-Weg 4',
        city: 'Munich',
        postalCode: '80805',
        landlordOrManagerName: 'Studentenwerk München Hausverwaltung',
        contactPhone: '+49 89 38196 0',
        leaseStartDate: '2026-09-20',
        depositPaid: true,
        bookingVoucherName: 'Studentenstadt_MUC_Lease_Agreement.pdf',
        verifiedBy: 'Ananya Sen'
      },
      insuranceVerification: {
        provider: 'Techniker Krankenkasse (TK Statutory Health)',
        policyNumber: 'TK-DE-99482103',
        validFrom: '2026-09-20',
        validUntil: '2028-09-20',
        medicalCoverageAmountEurOrGbp: 500000,
        repatriationIncluded: true,
        verified: true,
        policyDocumentName: 'TK_Versicherungsbescheinigung_TUM.pdf',
        verifiedBy: 'Sunita Rao',
        verifiedAt: '2026-09-14'
      },
      forexCompletion: {
        provider: 'BookMyForex Multi-Currency Forex Card',
        currency: 'EUR',
        cardLoadedAmount: 2500,
        cashInHandAmount: 350,
        cardDispatched: true,
        cardActivationStatus: 'active',
        forexReceiptName: 'BMF_EUR_Card_Meera.pdf',
        completed: true,
        verifiedBy: 'Sunil Verma'
      },
      universityReporting: {
        campusName: 'Technical University of Munich (TUM) - Garching Campus',
        reportingDeadline: '2026-10-01',
        orientationStartDate: '2026-09-28',
        internationalOfficeEmail: 'study@tum.de',
        internationalOfficePhone: '+49 89 289 22245',
        reportingAddress: 'Arcisstraße 21, 80333 München, Germany',
        requiredDocumentsAtDesk: ['Original Passport with Visa', 'Original Degree & APS Certificate', 'TUM Acceptance Letter', 'Proof of TK Health Insurance'],
        reportingAcknowledgedByStudent: true
      },
      emergencyContacts: {
        primaryParentName: 'Dr. Ramesh Kulkarni (Father)',
        primaryParentRelation: 'Father',
        primaryParentPhone: '+91 99801 00222',
        secondaryContactName: 'Shalini Kulkarni (Mother)',
        secondaryContactPhone: '+91 99801 00333',
        localHostOrAdvisorName: 'Prof. Dr. Florian Mayer (Faculty Advisor, Automotive Engineering)',
        localHostPhone: '+49 89 289 15000',
        twentyFourSevenHelpline: '+91 1800 200 4642 (24x7 Post-Landing Desk)'
      },
      blockingReasons: [],
      departureApprovedBy: 'Ananya Sen (Counselor) & Pooja Sharma (Branch Manager)',
      departureApprovedAt: '2026-09-18T10:00:00Z',
      createdAt: '2026-09-12T10:00:00Z',
      updatedAt: '2026-09-18T16:00:00Z'
    };

    const meeraBooking: TravelDeskBooking = {
      id: 'tb_meera',
      studentId: 'std_02',
      studentRefNo: 'GMI-2026-0045',
      studentName: 'Meera Kulkarni',
      destinationCountry: 'Germany',
      flightOptions: [
        {
          id: 'fo_m1',
          airline: 'Lufthansa',
          flightNumber: 'LH 765',
          routing: 'BLR -> MUC (Non-stop direct flight)',
          departureAirport: 'BLR (Bangalore)',
          arrivalAirport: 'MUC (Munich)',
          departureDateTime: '2026-09-24T03:30:00',
          arrivalDateTime: '2026-09-24T09:20:00',
          fareInr: 54000,
          cabinBaggageKg: 8,
          checkInBaggage: '2 x 23 kg Student Allowance',
          transitVisaRequired: false,
          transitDurationHours: 0,
          isRecommended: true,
          studentApproved: true,
          notes: 'Direct nonstop flight from Bangalore to Munich. No transit hassles or layovers.'
        }
      ],
      selectedOptionId: 'fo_m1',
      studentApprovalStatus: 'student_approved',
      studentApprovalNotes: 'Direct non-stop flight preferred. Father made corporate payment.',
      studentApprovedAt: '2026-09-16T12:00:00Z',
      paymentStatus: 'payment_verified',
      paymentReference: 'TXN-HDFC-994821',
      paymentAmountInr: 54000,
      paymentVerifiedBy: 'Sunil Verma (Finance Officer)',
      paymentVerifiedAt: '2026-09-16T14:30:00Z',
      ticketIssuanceStatus: 'ticket_issued',
      pnr: 'MUC92K',
      eTicketNumber: '220-4928109482',
      eTicketFileName: 'LH_Eticket_MeeraKulkarni_MUC92K.pdf',
      eTicketUploadedAt: '2026-09-17T09:00:00Z',
      baggageDetails: {
        cabinKg: 8,
        checkInPieces: 2,
        checkInWeightPerPieceKg: 23,
        specialStudentAllowanceNote: 'Lufthansa GenerationFly verified: 46kg check-in + 8kg cabin + 1 laptop bag'
      },
      transitValidation: {
        passed: true,
        transitAirport: 'None (Direct Flight)',
        visaRequired: false,
        transitTimeMinutes: 0,
        airsideTransitOnly: true,
        verifiedBy: 'Sunita Rao',
        verifiedAt: '2026-09-16',
        notes: 'Direct BLR to MUC nonstop route. No transit visa applicable.'
      },
      airportPickupNotified: true,
      airportPickupNotifiedAt: '2026-09-18T10:15:00Z',
      departureReminders: [
        { id: 'rem_m1', stage: 'T-7 days', scheduledDate: '2026-09-17', message: 'Pre-departure packing & German medication laws briefing sent.', sent: true, sentAt: '2026-09-17T09:00:00Z' },
        { id: 'rem_m2', stage: 'T-72h', scheduledDate: '2026-09-21', message: 'Lufthansa web check-in reminder & boarding pass instructions.', sent: false },
        { id: 'rem_m3', stage: 'T-24h', scheduledDate: '2026-09-23', message: 'Kempegowda Airport terminal arrival guidance (arrive 3.5 hrs prior).', sent: false }
      ],
      createdAt: '2026-09-15T09:00:00Z',
      updatedAt: '2026-09-18T10:30:00Z'
    };

    const meeraArrival: ArrivalServicesRecord = {
      id: 'arr_meera',
      studentId: 'std_02',
      studentRefNo: 'GMI-2026-0045',
      studentName: 'Meera Kulkarni',
      destinationCountry: 'Germany',
      universityName: 'Technical University of Munich (TUM)',
      activationDate: '2026-09-24',
      overallStatus: 'services_in_progress',
      services: {
        airportPickup: {
          requested: true,
          status: 'scheduled',
          driverName: 'Hans Becker (Munich Arrival Partner)',
          driverPhone: '+49 176 4920 1199',
          vehicleNumber: 'M-GB 8421',
          vehicleModel: 'Volkswagen Touran (Spacious Luggage Trunk)',
          pickupTerminal: 'Munich Airport (MUC) Terminal 2 - Arrival Hall B',
          arrivalFlightNumber: 'LH 765 (Expected 09:20 AM)',
          scheduledPickupTime: '2026-09-24T09:50:00',
          flightLandingConfirmed: false,
          emergencyPickupContact: '+49 89 200 4811 (Munich Operations Desk)',
          notes: 'Driver will hold personalized name placard with student name at Terminal 2 exit.'
        },
        dropToResidence: {
          requested: true,
          status: 'scheduled',
          dropAddress: 'Studentenstadt Freimann, Christoph-Probst-Weg 4, 80805 München',
          hostOrManagerName: 'Herr Schmidt (Studentenwerk München)',
          hostPhone: '+49 89 38196 112',
          keyHandoverConfirmed: false,
          notes: 'Office open until 14:00 for key collection and room inventory sign-off.'
        },
        cityRegistration: {
          requested: true,
          status: 'scheduled',
          authorityName: 'Bürgerbüro Riesenfeldstraße (KVR München)',
          appointmentDate: '2026-09-26',
          appointmentTime: '10:30 AM',
          appointmentLocation: 'Riesenfeldstraße 75, 80809 München',
          documentsDossierPrepared: true,
          certificateReceived: false,
          notes: 'Wohnungsgeberbestätigung signed by Studentenwerk + Passport + Anmeldung form ready.'
        },
        collegeRegistration: {
          requested: true,
          status: 'scheduled',
          campusLocation: 'TUM Main Campus - Arcisstraße 21, Immatrikulationsamt',
          orientationDate: '2026-09-28',
          internationalDeskReported: false,
          studentIdCardIssued: false,
          timetableEnrolled: false,
          advisorName: 'Frau Dr. Weber',
          notes: 'Session includes Student Card (Studentenausweis) encoding & lab safety induction.'
        },
        simAssistance: {
          requested: true,
          status: 'scheduled',
          provider: 'Lyca Mobile Germany',
          planName: 'Allnet Flat 30GB EU Roaming',
          monthlyDataGb: 30,
          simType: 'eSIM',
          assignedPhoneNumber: '+49 152 9840 2211',
          notes: 'eSIM QR code sent to student WhatsApp. Will activate upon landing at Munich airport.'
        },
        bankAccountAssistance: {
          requested: true,
          status: 'scheduled',
          bankName: 'Deutsche Bank / Coracle Current Account',
          branchLocation: 'München Leopoldstraße 54',
          appointmentDate: '2026-09-27',
          accountOpened: false,
          debitCardReceived: false,
          notes: 'Blocked account monthly payout of €992 will route to this current account upon city registration.'
        },
        accommodationSupport: {
          requested: true,
          status: 'scheduled',
          contractVerified: true,
          inventoryChecklistSigned: false,
          landlordDepositReceiptVerified: true,
          housingNotes: 'Deposit of €750 paid. Move-in inventory checklist must be signed with Hausmeister.'
        },
        partTimeJobAssistance: {
          requested: true,
          status: 'scheduled',
          applicable: true,
          workPermitHoursLimitPerWeek: 20,
          taxNumberOrNiNumberObtained: false,
          cvLocalizedToCountryStandard: true,
          resumeFileUploaded: 'Meera_Kulkarni_Lebenslauf_Tabellarisch.pdf',
          jobPortalBriefingConducted: false,
          notes: 'German standard Lebenslauf prepared. HiWi (student research assistant) positions briefed.'
        },
        parentHotlineEmergencySupport: {
          requested: true,
          status: 'scheduled',
          parentArrivalConfirmationCallDone: false,
          dailyCheckInCallsConducted: 0,
          parentReassuranceSmsSent: false,
          escalationHotlineAvailable24x7: true,
          designatedCoordinatorName: 'Ananya Sen (Senior Counselor)',
          designatedCoordinatorPhone: '+91 99801 44556',
          notes: 'Parents requested automated confirmation call as soon as Meera meets driver.'
        }
      },
      notes: [
        '2026-09-17: All 9 arrival services configured with local Munich executive partners.',
        '2026-09-18: Munich airport driver and Studentenwerk check-in coordinator synchronized.'
      ],
      createdAt: '2026-09-15T10:00:00Z',
      updatedAt: '2026-09-18T16:00:00Z'
    };

    // -------------------------------------------------------------------------
    // Seed Support Tickets
    // -------------------------------------------------------------------------
    const ticket1: SupportTicketRecord = {
      id: 'tic_01',
      ticketRefNumber: 'TIC-2026-0042',
      studentId: 'std_02',
      studentRefNo: 'GMI-2026-0045',
      studentName: 'Meera Kulkarni',
      studentPhone: '+91 99801 44556',
      parentPhone: '+91 99801 00222',
      destinationCountry: 'Germany',
      category: 'Airport & Transit',
      priority: 'high',
      assignedExecutive: {
        id: 'usr_arr_1',
        name: 'Hans Becker',
        role: 'Munich Field Coordinator',
        phone: '+49 176 4920 1199'
      },
      slaHours: 12,
      slaHoursRemaining: 8,
      isBreached: false,
      escalation: {
        level: 'executive'
      },
      status: 'action_in_progress',
      subject: 'Munich Airport Arrival - Flight LH 765 terminal baggage pickup coordination',
      description: 'Requesting driver to have trolley ready at Terminal 2 gate as student is carrying 2 heavy check-in bags (46kg) plus cabin baggage.',
      communicationHistory: [
        {
          id: 'msg_1',
          timestamp: '2026-09-18T11:00:00Z',
          sender: 'Meera Kulkarni',
          senderRole: 'student',
          channel: 'portal',
          message: 'Hi team, I will be carrying 2 large trolley bags under the 46kg allowance. Could the driver please meet me inside near the baggage belt exit?',
          isInternal: false
        },
        {
          id: 'msg_2',
          timestamp: '2026-09-18T11:45:00Z',
          sender: 'Hans Becker',
          senderRole: 'Munich Field Coordinator',
          channel: 'whatsapp',
          message: 'Hallo Meera! Absolutely. I will be parked at Terminal 2 short-stay with a luggage trolley and will wait right at the customs exit door with your name board.',
          isInternal: false
        }
      ],
      parentPermission: {
        allowParentCommunication: true,
        consentScope: 'full_disclosure',
        consentGrantedAt: '2026-09-15T12:00:00Z',
        blockedAttemptsCount: 0,
        lastAuditReason: 'Student consented to parent updates during initial onboarding'
      },
      createdAt: '2026-09-18T11:00:00Z',
      updatedAt: '2026-09-18T12:00:00Z'
    };

    const ticket2: SupportTicketRecord = {
      id: 'tic_02',
      ticketRefNumber: 'TIC-2026-0043',
      studentId: 'std_01',
      studentRefNo: 'GMI-2026-0089',
      studentName: 'Aarav Reddy',
      studentPhone: '+91 98490 11223',
      parentPhone: '+91 98490 00111',
      destinationCountry: 'United Kingdom',
      category: 'Accommodation & Landlord',
      priority: 'critical',
      assignedExecutive: {
        id: 'usr_arr_2',
        name: 'David Wilson',
        role: 'UK Post-Landing Specialist',
        phone: '+44 7700 900122'
      },
      slaHours: 4,
      slaHoursRemaining: 0,
      isBreached: true,
      escalation: {
        level: 'post_landing_director',
        escalatedAt: '2026-09-18T16:00:00Z',
        escalatedTo: 'Vikram Malhotra (Operations Director)',
        reason: 'Critical SLA breach - Landlord tenancy confirmation letter required for UK border clearance within 4 hours.'
      },
      status: 'investigating',
      subject: 'Urgent: Landlord tenancy confirmation letter required with room number for Border Force',
      description: 'UK Border Force requires proof of accommodation with explicit room allotment. Need Unite Students to re-issue confirmation with assigned Room 402 details.',
      communicationHistory: [
        {
          id: 'msg_21',
          timestamp: '2026-09-18T12:00:00Z',
          sender: 'Aarav Reddy',
          senderRole: 'student',
          channel: 'portal',
          message: 'My counselor told me I need the room number explicitly on the tenancy letter before my flight next week. Currently it only shows building name.',
          isInternal: false
        },
        {
          id: 'msg_22',
          timestamp: '2026-09-18T12:30:00Z',
          sender: 'David Wilson',
          senderRole: 'UK Post-Landing Specialist',
          channel: 'email',
          message: 'Contacting Unite Students central bookings manager to generate the updated room-specific tenancy schedule today.',
          isInternal: false
        }
      ],
      parentPermission: {
        allowParentCommunication: false,
        consentScope: 'strictly_prohibited',
        consentGrantedAt: '2026-09-10T10:00:00Z',
        blockedAttemptsCount: 1,
        lastAuditReason: 'Student marked parent communication strictly prohibited for non-medical issues.'
      },
      createdAt: '2026-09-18T12:00:00Z',
      updatedAt: '2026-09-18T16:05:00Z'
    };

    this.readinessRecords.set(aaravReadiness.studentId, aaravReadiness);
    this.readinessRecords.set(meeraReadiness.studentId, meeraReadiness);

    this.travelBookings.set(aaravBooking.studentId, aaravBooking);
    this.travelBookings.set(meeraBooking.studentId, meeraBooking);

    this.arrivalServices.set(meeraArrival.studentId, meeraArrival);

    this.supportTickets.set(ticket1.id, ticket1);
    this.supportTickets.set(ticket2.id, ticket2);
  }

  // ---------------------------------------------------------------------------
  // 1. TRAVEL READINESS METHODS
  // ---------------------------------------------------------------------------

  public getTravelReadiness(studentId: string): TravelReadinessRecord {
    const record = this.readinessRecords.get(studentId);
    if (record) return record;

    // Default template
    const newRecord: TravelReadinessRecord = {
      id: `tr_${studentId}`,
      studentId,
      studentRefNo: 'GMI-2026-TEMP',
      studentName: 'Student Profile',
      destinationCountry: 'United Kingdom',
      readinessStatus: 'not_ready',
      preDepartureBriefing: {
        id: `pdb_${studentId}`,
        briefingDate: new Date().toISOString(),
        sessionMode: 'online_zoom',
        attended: false,
        conductedBy: 'Assigned Counselor',
        packReceived: false,
        topicsCovered: [
          { id: 't1', title: 'Immigration & Border Force Clearance Pack', completed: false },
          { id: 't2', title: 'City & Police Registration Mandate', completed: false },
          { id: 't3', title: 'Health Insurance & Clinic Registration', completed: false },
          { id: 't4', title: 'Emergency Protocols & 24x7 Helpline', completed: false }
        ],
        notes: '',
        lastUpdated: new Date().toISOString()
      },
      checklist: [
        { id: 'c1', title: 'Passport with Valid Visa Sticker / Entry Clearance', category: 'documents', isMandatory: true, completed: false },
        { id: 'c2', title: 'Official University Admission Letter / CAS / COE', category: 'documents', isMandatory: true, completed: false },
        { id: 'c3', title: 'Confirmed Flight Ticket with Verified PNR', category: 'logistics', isMandatory: true, completed: false },
        { id: 'c4', title: 'Accommodation Tenancy / Booking Voucher', category: 'logistics', isMandatory: true, completed: false },
        { id: 'c5', title: 'International Student Health & Travel Insurance', category: 'health', isMandatory: true, completed: false },
        { id: 'c6', title: 'Forex Multi-Currency Card & Foreign Currency Cash', category: 'financial', isMandatory: true, completed: false }
      ],
      flightConfirmation: {
        isConfirmed: false,
        airline: '',
        flightNumber: '',
        pnr: '',
        departureAirport: '',
        arrivalAirport: '',
        departureDateTime: '',
        arrivalDateTime: ''
      },
      accommodationConfirmation: {
        status: 'not_arranged',
        type: 'university_dorm',
        address: '',
        city: '',
        postalCode: '',
        landlordOrManagerName: '',
        contactPhone: '',
        leaseStartDate: '',
        depositPaid: false
      },
      insuranceVerification: {
        provider: '',
        policyNumber: '',
        validFrom: '',
        validUntil: '',
        medicalCoverageAmountEurOrGbp: 0,
        repatriationIncluded: false,
        verified: false
      },
      forexCompletion: {
        provider: '',
        currency: 'EUR',
        cardLoadedAmount: 0,
        cashInHandAmount: 0,
        cardDispatched: false,
        cardActivationStatus: 'pending',
        completed: false
      },
      universityReporting: {
        campusName: '',
        reportingDeadline: '',
        orientationStartDate: '',
        internationalOfficeEmail: '',
        internationalOfficePhone: '',
        reportingAddress: '',
        requiredDocumentsAtDesk: [],
        reportingAcknowledgedByStudent: false
      },
      emergencyContacts: {
        primaryParentName: '',
        primaryParentRelation: 'Father',
        primaryParentPhone: '',
        secondaryContactName: '',
        secondaryContactPhone: '',
        localHostOrAdvisorName: '',
        localHostPhone: '',
        twentyFourSevenHelpline: '+91 1800 200 4642 (24x7 Post-Landing Desk)'
      },
      blockingReasons: ['Pre-departure briefing not attended', 'Mandatory checklist incomplete', 'Flight unconfirmed'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.readinessRecords.set(studentId, newRecord);
    return newRecord;
  }

  public updateChecklistItem(studentId: string, itemId: string, completed: boolean, verifiedBy: string): TravelReadinessRecord {
    const record = this.getTravelReadiness(studentId);
    const item = record.checklist.find(c => c.id === itemId);
    if (item) {
      item.completed = completed;
      item.verifiedBy = completed ? verifiedBy : undefined;
      item.verifiedAt = completed ? new Date().toISOString().split('T')[0] : undefined;
    }
    return this.recomputeReadinessStatus(record);
  }

  public updatePreDepartureBriefing(studentId: string, briefingData: Partial<PreDepartureBriefing>): TravelReadinessRecord {
    const record = this.getTravelReadiness(studentId);
    record.preDepartureBriefing = {
      ...record.preDepartureBriefing,
      ...briefingData,
      lastUpdated: new Date().toISOString()
    };
    return this.recomputeReadinessStatus(record);
  }

  public updateConfirmations(studentId: string, payload: {
    flight?: any;
    accommodation?: any;
    insurance?: any;
    forex?: any;
    universityReporting?: any;
    emergencyContacts?: any;
  }): TravelReadinessRecord {
    const record = this.getTravelReadiness(studentId);
    if (payload.flight) record.flightConfirmation = { ...record.flightConfirmation, ...payload.flight };
    if (payload.accommodation) record.accommodationConfirmation = { ...record.accommodationConfirmation, ...payload.accommodation };
    if (payload.insurance) record.insuranceVerification = { ...record.insuranceVerification, ...payload.insurance };
    if (payload.forex) record.forexCompletion = { ...record.forexCompletion, ...payload.forex };
    if (payload.universityReporting) record.universityReporting = { ...record.universityReporting, ...payload.universityReporting };
    if (payload.emergencyContacts) record.emergencyContacts = { ...record.emergencyContacts, ...payload.emergencyContacts };

    return this.recomputeReadinessStatus(record);
  }

  public approveDeparture(studentId: string, approverName: string): TravelReadinessRecord {
    const record = this.getTravelReadiness(studentId);
    const recomputed = this.recomputeReadinessStatus(record);

    if (recomputed.blockingReasons.length > 0) {
      throw new Error(`Cannot approve departure for ${record.studentName}: Blocking conditions exist - ${recomputed.blockingReasons.join('; ')}`);
    }

    record.readinessStatus = 'ready_for_departure';
    record.departureApprovedBy = approverName;
    record.departureApprovedAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();
    return record;
  }

  public recomputeReadinessStatus(record: TravelReadinessRecord): TravelReadinessRecord {
    const blocking: string[] = [];

    // 1. Briefing check
    if (!record.preDepartureBriefing.attended) {
      blocking.push('Pre-departure briefing must be attended');
    }

    // 2. Mandatory checklist items
    const incompleteMandatory = record.checklist.filter(c => c.isMandatory && !c.completed);
    if (incompleteMandatory.length > 0) {
      blocking.push(`${incompleteMandatory.length} mandatory checklist item(s) incomplete: ${incompleteMandatory.map(i => i.title).join(', ')}`);
    }

    // 3. Flight confirmation
    if (!record.flightConfirmation.isConfirmed || !record.flightConfirmation.pnr) {
      blocking.push('Flight must be confirmed with a valid PNR number');
    }

    // 4. Accommodation confirmation
    if (record.accommodationConfirmation.status !== 'confirmed') {
      blocking.push('Accommodation must be confirmed with verified lease or voucher');
    }

    // 5. Insurance verification
    if (!record.insuranceVerification.verified || !record.insuranceVerification.policyNumber) {
      blocking.push('Health and travel insurance policy must be verified');
    }

    // 6. Forex completion
    if (!record.forexCompletion.completed || !record.forexCompletion.cardDispatched) {
      blocking.push('Forex card disbursement and foreign currency must be completed');
    }

    // 7. University reporting info
    if (!record.universityReporting.reportingAcknowledgedByStudent) {
      blocking.push('University reporting date and orientation must be acknowledged');
    }

    record.blockingReasons = blocking;
    if (blocking.length === 0 && record.readinessStatus === 'not_ready') {
      record.readinessStatus = 'in_progress';
    } else if (blocking.length > 0 && record.readinessStatus === 'ready_for_departure') {
      record.readinessStatus = 'in_progress';
    }

    record.updatedAt = new Date().toISOString();
    return record;
  }

  // ---------------------------------------------------------------------------
  // 2. TRAVEL DESK METHODS
  // ---------------------------------------------------------------------------

  public getTravelDeskBooking(studentId: string): TravelDeskBooking {
    const booking = this.travelBookings.get(studentId);
    if (booking) return booking;

    const newBooking: TravelDeskBooking = {
      id: `tb_${studentId}`,
      studentId,
      studentRefNo: 'GMI-2026-TEMP',
      studentName: 'Student Profile',
      destinationCountry: 'United Kingdom',
      flightOptions: [],
      studentApprovalStatus: 'pending_student_review',
      paymentStatus: 'unpaid',
      ticketIssuanceStatus: 'quote_submitted',
      baggageDetails: {
        cabinKg: 7,
        checkInPieces: 2,
        checkInWeightPerPieceKg: 23,
        specialStudentAllowanceNote: 'Standard student allowance'
      },
      transitValidation: {
        passed: false,
        transitAirport: 'None',
        visaRequired: false,
        transitTimeMinutes: 0,
        airsideTransitOnly: true,
        verifiedBy: '',
        verifiedAt: '',
        notes: ''
      },
      airportPickupNotified: false,
      departureReminders: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.travelBookings.set(studentId, newBooking);
    return newBooking;
  }

  public setFlightOptions(studentId: string, options: FlightOption[]): TravelDeskBooking {
    const booking = this.getTravelDeskBooking(studentId);
    booking.flightOptions = options;
    if (options.length > 0 && !booking.selectedOptionId) {
      booking.selectedOptionId = options[0].id;
    }
    booking.updatedAt = new Date().toISOString();
    return booking;
  }

  public studentApproveFlight(studentId: string, optionId: string, approved: boolean, notes: string): TravelDeskBooking {
    const booking = this.getTravelDeskBooking(studentId);
    booking.selectedOptionId = optionId;
    booking.studentApprovalStatus = approved ? 'student_approved' : 'student_rejected';
    booking.studentApprovalNotes = notes;
    booking.studentApprovedAt = new Date().toISOString();
    booking.flightOptions = booking.flightOptions.map(opt => ({
      ...opt,
      studentApproved: opt.id === optionId ? approved : false
    }));

    if (approved) {
      booking.ticketIssuanceStatus = 'student_approved';
    }

    booking.updatedAt = new Date().toISOString();
    return booking;
  }

  public recordFlightPayment(studentId: string, paymentData: {
    status: PaymentStatus;
    amountInr: number;
    reference: string;
    verifiedBy: string;
  }): TravelDeskBooking {
    const booking = this.getTravelDeskBooking(studentId);
    booking.paymentStatus = paymentData.status;
    booking.paymentAmountInr = paymentData.amountInr;
    booking.paymentReference = paymentData.reference;
    booking.paymentVerifiedBy = paymentData.verifiedBy;
    booking.paymentVerifiedAt = new Date().toISOString();

    if (
      paymentData.status === 'payment_verified' ||
      paymentData.status === 'paid_direct_to_airline' ||
      paymentData.status === 'corporate_account_settled'
    ) {
      booking.ticketIssuanceStatus = 'payment_in_verification';
    }

    booking.updatedAt = new Date().toISOString();
    return booking;
  }

  /**
   * CRITICAL SECURITY & COMPLIANCE RULE:
   * "Do not issue or claim to issue tickets without a real authorized booking/payment process."
   */
  public issueTicketAndUploadPNR(studentId: string, ticketData: {
    pnr: string;
    eTicketNumber: string;
    eTicketFileName: string;
    baggageDetails?: any;
    verifiedOfficer: string;
  }): TravelDeskBooking {
    const booking = this.getTravelDeskBooking(studentId);

    // 1. Strict Payment Authorization Check
    const authorizedPayments: PaymentStatus[] = ['payment_verified', 'paid_direct_to_airline', 'corporate_account_settled'];
    if (!authorizedPayments.includes(booking.paymentStatus)) {
      throw new Error(`Unauthorized ticket issuance blocked: Cannot issue ticket without verified payment settlement. Current status: '${booking.paymentStatus}'.`);
    }

    // 2. Strict Student Approval Check
    if (booking.studentApprovalStatus !== 'student_approved') {
      throw new Error(`Unauthorized ticket issuance blocked: Student has not formally approved flight option. Current approval status: '${booking.studentApprovalStatus}'.`);
    }

    // 3. Issue and persist
    booking.pnr = ticketData.pnr;
    booking.eTicketNumber = ticketData.eTicketNumber;
    booking.eTicketFileName = ticketData.eTicketFileName;
    booking.eTicketUploadedAt = new Date().toISOString();
    booking.ticketIssuanceStatus = 'ticket_issued';

    if (ticketData.baggageDetails) {
      booking.baggageDetails = {
        ...booking.baggageDetails,
        ...ticketData.baggageDetails
      };
    }

    // Synchronize with Travel Readiness flight confirmation
    const readiness = this.getTravelReadiness(studentId);
    const selectedOption = booking.flightOptions.find(o => o.id === booking.selectedOptionId);
    if (selectedOption) {
      readiness.flightConfirmation = {
        isConfirmed: true,
        airline: selectedOption.airline,
        flightNumber: selectedOption.flightNumber,
        pnr: ticketData.pnr,
        departureAirport: selectedOption.departureAirport,
        arrivalAirport: selectedOption.arrivalAirport,
        departureDateTime: selectedOption.departureDateTime,
        arrivalDateTime: selectedOption.arrivalDateTime,
        eTicketDocumentName: ticketData.eTicketFileName,
        verifiedByOfficer: ticketData.verifiedOfficer,
        verifiedAt: new Date().toISOString().split('T')[0]
      };
      // Mark flight checklist item completed
      const flightChecklistItem = readiness.checklist.find(c => c.id === 'chk_5' || c.id === 'chk_16' || c.title.toLowerCase().includes('flight'));
      if (flightChecklistItem) {
        flightChecklistItem.completed = true;
        flightChecklistItem.verifiedBy = ticketData.verifiedOfficer;
        flightChecklistItem.verifiedAt = new Date().toISOString().split('T')[0];
      }
      this.recomputeReadinessStatus(readiness);
    }

    booking.updatedAt = new Date().toISOString();
    return booking;
  }

  public notifyAirportPickup(studentId: string, arrivalNotes?: string): { success: boolean; notifiedAt: string; driverDetails: string } {
    const booking = this.getTravelDeskBooking(studentId);
    const arrival = this.getArrivalServices(studentId);

    booking.airportPickupNotified = true;
    booking.airportPickupNotifiedAt = new Date().toISOString();

    if (arrival) {
      arrival.services.airportPickup.flightLandingConfirmed = true;
      if (arrivalNotes) {
        arrival.services.airportPickup.notes = `${arrival.services.airportPickup.notes} | ${arrivalNotes}`;
      }
    }

    booking.updatedAt = new Date().toISOString();
    return {
      success: true,
      notifiedAt: booking.airportPickupNotifiedAt,
      driverDetails: arrival?.services.airportPickup.driverName || 'Designated Driver Dispatched'
    };
  }

  public sendDepartureReminder(studentId: string, reminderId: string): DepartureReminderItem {
    const booking = this.getTravelDeskBooking(studentId);
    const reminder = booking.departureReminders.find(r => r.id === reminderId);
    if (!reminder) throw new Error('Reminder not found');

    reminder.sent = true;
    reminder.sentAt = new Date().toISOString();
    booking.updatedAt = new Date().toISOString();
    return reminder;
  }

  // ---------------------------------------------------------------------------
  // 3. ARRIVAL SERVICES METHODS
  // ---------------------------------------------------------------------------

  public getArrivalServices(studentId: string): ArrivalServicesRecord {
    const record = this.arrivalServices.get(studentId);
    if (record) return record;

    const newRecord: ArrivalServicesRecord = {
      id: `arr_${studentId}`,
      studentId,
      studentRefNo: 'GMI-2026-TEMP',
      studentName: 'Student Profile',
      destinationCountry: 'United Kingdom',
      universityName: 'University of Manchester',
      activationDate: new Date().toISOString().split('T')[0],
      overallStatus: 'pending_arrival',
      services: {
        airportPickup: {
          requested: true,
          status: 'scheduled',
          driverName: 'Robert Clarke',
          driverPhone: '+44 7700 900341',
          vehicleNumber: 'MAN-TX-892',
          vehicleModel: 'Mercedes Vito Shuttle (High Capacity)',
          pickupTerminal: 'Terminal 1 - Arrival Hall Gate B',
          arrivalFlightNumber: 'EK 17',
          scheduledPickupTime: '2026-09-28T19:30:00',
          flightLandingConfirmed: false,
          emergencyPickupContact: '+44 161 800 9200',
          notes: 'Driver will meet student with personalized name placard.'
        },
        dropToResidence: {
          requested: true,
          status: 'scheduled',
          dropAddress: 'Artisan Heights, 1 New Wakefield St, Manchester M1 5WT',
          hostOrManagerName: 'Unite Students Accommodation Office',
          hostPhone: '+44 161 826 4920',
          keyHandoverConfirmed: false,
          notes: '24/7 security desk handles after-hours keys check-in.'
        },
        cityRegistration: {
          requested: true,
          status: 'scheduled',
          authorityName: 'UK BRP Collection & Police Registration',
          appointmentDate: '2026-10-02',
          appointmentTime: '11:00 AM',
          appointmentLocation: 'Manchester Post Office, 26 Spring Gardens',
          documentsDossierPrepared: true,
          certificateReceived: false,
          notes: 'Collect Biometric Residence Permit (BRP) within 10 days of arrival.'
        },
        collegeRegistration: {
          requested: true,
          status: 'scheduled',
          campusLocation: 'Student Services Centre, Burlington St',
          orientationDate: '2026-09-29',
          internationalDeskReported: false,
          studentIdCardIssued: false,
          timetableEnrolled: false,
          advisorName: 'Dr. Alistair Finch',
          notes: 'Bring original degree certificates and passport.'
        },
        simAssistance: {
          requested: true,
          status: 'scheduled',
          provider: 'Giffgaff UK / Vodafone',
          planName: 'Monthly Rolling 35GB + Unlimited UK Minutes',
          monthlyDataGb: 35,
          simType: 'eSIM',
          assignedPhoneNumber: '+44 7911 123456',
          notes: 'eSIM delivered via email.'
        },
        bankAccountAssistance: {
          requested: true,
          status: 'scheduled',
          bankName: 'Monzo / Barclays Bank UK',
          branchLocation: '51 Mosley Street, Manchester',
          appointmentDate: '2026-09-30',
          accountOpened: false,
          debitCardReceived: false,
          notes: 'Requires Bank Letter from University of Manchester student portal.'
        },
        accommodationSupport: {
          requested: true,
          status: 'scheduled',
          contractVerified: true,
          inventoryChecklistSigned: false,
          landlordDepositReceiptVerified: true,
          housingNotes: 'Tenancy signed for 51 weeks.'
        },
        partTimeJobAssistance: {
          requested: true,
          status: 'scheduled',
          applicable: true,
          workPermitHoursLimitPerWeek: 20,
          taxNumberOrNiNumberObtained: false,
          cvLocalizedToCountryStandard: true,
          resumeFileUploaded: 'Aarav_Reddy_UK_Resume.pdf',
          jobPortalBriefingConducted: false,
          notes: 'UK National Insurance (NIN) application guide provided.'
        },
        parentHotlineEmergencySupport: {
          requested: true,
          status: 'scheduled',
          parentArrivalConfirmationCallDone: false,
          dailyCheckInCallsConducted: 0,
          parentReassuranceSmsSent: false,
          escalationHotlineAvailable24x7: true,
          designatedCoordinatorName: 'Pooja Sharma (Senior Counselor)',
          designatedCoordinatorPhone: '+91 98490 11223',
          notes: 'Parent confirmation call queued upon arrival confirmation.'
        }
      },
      notes: ['Arrival services initialized for student.'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.arrivalServices.set(studentId, newRecord);
    return newRecord;
  }

  public updateArrivalServiceItem(studentId: string, serviceKey: string, payload: any): ArrivalServicesRecord {
    const record = this.getArrivalServices(studentId);
    if ((record.services as any)[serviceKey]) {
      (record.services as any)[serviceKey] = {
        ...(record.services as any)[serviceKey],
        ...payload
      };
    }
    record.updatedAt = new Date().toISOString();
    return record;
  }

  public activatePostLandingServices(studentId: string): ArrivalServicesRecord {
    const record = this.getArrivalServices(studentId);
    record.overallStatus = 'services_in_progress';
    record.activationDate = new Date().toISOString().split('T')[0];
    record.notes.push(`[${new Date().toISOString()}] Student landed in destination country. All 9 post-landing services transitioned to in_progress.`);

    // Transition readiness status to landed
    const readiness = this.getTravelReadiness(studentId);
    readiness.readinessStatus = 'landed';
    readiness.updatedAt = new Date().toISOString();

    record.updatedAt = new Date().toISOString();
    return record;
  }

  // ---------------------------------------------------------------------------
  // 4. SUPPORT TICKETS METHODS
  // ---------------------------------------------------------------------------

  public getAllTickets(studentId?: string): SupportTicketRecord[] {
    const tickets = Array.from(this.supportTickets.values());
    if (studentId) {
      return tickets.filter(t => t.studentId === studentId);
    }
    return tickets;
  }

  public getTicketById(ticketId: string): SupportTicketRecord | undefined {
    return this.supportTickets.get(ticketId);
  }

  public createSupportTicket(payload: {
    studentId: string;
    studentRefNo: string;
    studentName: string;
    studentPhone: string;
    parentPhone: string;
    destinationCountry: string;
    category: TicketCategory;
    priority: TicketPriority;
    subject: string;
    description: string;
    executiveName?: string;
  }): SupportTicketRecord {
    const id = `tic_${Date.now()}`;
    const slaHours = payload.priority === 'critical' ? 4 : payload.priority === 'high' ? 12 : payload.priority === 'medium' ? 24 : 48;

    const newTicket: SupportTicketRecord = {
      id,
      ticketRefNumber: `TIC-2026-${String(this.supportTickets.size + 1).padStart(4, '0')}`,
      studentId: payload.studentId,
      studentRefNo: payload.studentRefNo,
      studentName: payload.studentName,
      studentPhone: payload.studentPhone,
      parentPhone: payload.parentPhone,
      destinationCountry: payload.destinationCountry,
      category: payload.category,
      priority: payload.priority,
      assignedExecutive: {
        id: 'usr_exec_1',
        name: payload.executiveName || 'David Wilson',
        role: 'Post-Landing Specialist',
        phone: '+44 7700 900122'
      },
      slaHours,
      slaHoursRemaining: slaHours,
      isBreached: false,
      escalation: {
        level: payload.priority === 'critical' ? 'post_landing_director' : 'executive',
        escalatedAt: payload.priority === 'critical' ? new Date().toISOString() : undefined,
        escalatedTo: payload.priority === 'critical' ? 'Vikram Malhotra (Operations Director)' : undefined,
        reason: payload.priority === 'critical' ? 'Critical priority ticket automatically escalated upon creation' : undefined
      },
      status: 'open',
      subject: payload.subject,
      description: payload.description,
      communicationHistory: [
        {
          id: `msg_${Date.now()}`,
          timestamp: new Date().toISOString(),
          sender: payload.studentName,
          senderRole: 'student',
          channel: 'portal',
          message: payload.description,
          isInternal: false
        }
      ],
      parentPermission: {
        allowParentCommunication: false,
        consentScope: 'all_emergencies_only',
        blockedAttemptsCount: 0,
        lastAuditReason: 'Initial ticket created - parent permission defaulted to emergency only'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.supportTickets.set(id, newTicket);
    return newTicket;
  }

  public updateTicketStatus(ticketId: string, status: TicketStatus, resolutionNotes?: any): SupportTicketRecord {
    const ticket = this.supportTickets.get(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.status = status;
    if (resolutionNotes) {
      ticket.resolutionNotes = {
        summary: resolutionNotes.summary || 'Issue resolved by field executive.',
        rootCause: resolutionNotes.rootCause || 'Routine post-landing request.',
        resolvedAt: new Date().toISOString(),
        resolvedBy: resolutionNotes.resolvedBy || 'Assigned Executive'
      };
    }
    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }

  public addTicketMessage(ticketId: string, message: {
    sender: string;
    senderRole: string;
    channel: any;
    message: string;
    isInternal: boolean;
  }): SupportTicketRecord {
    const ticket = this.supportTickets.get(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.communicationHistory.push({
      id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      sender: message.sender,
      senderRole: message.senderRole,
      channel: message.channel,
      message: message.message,
      isInternal: message.isInternal
    });

    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }

  public escalateTicket(ticketId: string, level: EscalationLevel, reason: string, escalatedTo: string): SupportTicketRecord {
    const ticket = this.supportTickets.get(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.escalation = {
      level,
      escalatedAt: new Date().toISOString(),
      escalatedTo,
      reason
    };
    ticket.status = 'investigating';
    ticket.communicationHistory.push({
      id: `msg_esc_${Date.now()}`,
      timestamp: new Date().toISOString(),
      sender: 'System Escalation Engine',
      senderRole: 'system',
      channel: 'portal',
      message: `[ESCALATION TRIGGERED] Escalated to ${level.toUpperCase()} (${escalatedTo}). Reason: ${reason}`,
      isInternal: true
    });

    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }

  public studentConfirmResolution(ticketId: string, rating: number, feedback: string): SupportTicketRecord {
    const ticket = this.supportTickets.get(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.studentConfirmation = {
      confirmed: true,
      rating,
      feedback,
      confirmedAt: new Date().toISOString()
    };
    ticket.status = 'closed';
    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }

  /**
   * CRITICAL STUDENT PRIVACY CHECK:
   * Parent communication permission checks before notifying parents!
   */
  public checkAndNotifyParent(ticketId: string, emergencyMessage: string): {
    allowed: boolean;
    notified: boolean;
    reason: string;
    privacyAuditNote: string;
  } {
    const ticket = this.supportTickets.get(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const perm = ticket.parentPermission;

    // Strict privacy rule: if allowParentCommunication is false OR strictly prohibited
    if (!perm.allowParentCommunication || perm.consentScope === 'strictly_prohibited') {
      perm.blockedAttemptsCount += 1;
      perm.lastAuditReason = `Parent notification blocked on ${new Date().toISOString()}: Student privacy setting is 'strictly_prohibited'.`;
      ticket.updatedAt = new Date().toISOString();

      return {
        allowed: false,
        notified: false,
        reason: 'BLOCKED_BY_STUDENT_PRIVACY',
        privacyAuditNote: `GDPR / Data Privacy Protection: Student ${ticket.studentName} has not authorized disclosure to parents. Access denied.`
      };
    }

    // If emergency only, check ticket priority
    if (perm.consentScope === 'all_emergencies_only' && ticket.priority !== 'critical' && ticket.priority !== 'high') {
      perm.blockedAttemptsCount += 1;
      perm.lastAuditReason = `Blocked notification: Student consent limited to life-safety emergencies. Current priority is ${ticket.priority}.`;
      ticket.updatedAt = new Date().toISOString();

      return {
        allowed: false,
        notified: false,
        reason: 'RESTRICTED_TO_EMERGENCIES_ONLY',
        privacyAuditNote: `Student consent scope limited to life-safety emergencies only. Message withheld.`
      };
    }

    // Consent authorized!
    ticket.communicationHistory.push({
      id: `msg_par_${Date.now()}`,
      timestamp: new Date().toISOString(),
      sender: 'Parent Notification Gateway',
      senderRole: 'system',
      channel: 'whatsapp',
      message: `[PARENT NOTIFICATION DISPATCHED to ${ticket.parentPhone}] ${emergencyMessage}`,
      isInternal: true
    });
    ticket.updatedAt = new Date().toISOString();

    return {
      allowed: true,
      notified: true,
      reason: 'AUTHORIZED_AND_DISPATCHED',
      privacyAuditNote: `Parent notification legally authorized under student consent scope '${perm.consentScope}'.`
    };
  }

  // ---------------------------------------------------------------------------
  // 5. AUTOMATED TEST SUITE FOR TRAVEL & POST-LANDING
  // ---------------------------------------------------------------------------

  public runTravelPostLandingTestSuite(students: StudentMasterProfile[]): TravelTestScenarioResult[] {
    const results: TravelTestScenarioResult[] = [];

    // Test 1: Travel readiness blocking conditions
    try {
      const studentId = 'test_std_blocking';
      const mockReadiness = this.getTravelReadiness(studentId);
      mockReadiness.preDepartureBriefing.attended = false;
      mockReadiness.flightConfirmation.isConfirmed = false;
      mockReadiness.accommodationConfirmation.status = 'searching';

      let blocked = false;
      let blockingError = '';
      try {
        this.approveDeparture(studentId, 'Test Officer');
      } catch (err: any) {
        blocked = true;
        blockingError = err.message;
      }

      results.push({
        id: 'TRV-TEST-01',
        name: 'Travel Readiness Blocking Conditions',
        category: 'Travel Readiness',
        passed: blocked && blockingError.includes('Blocking conditions exist'),
        expected: 'Attempt to approve departure without flight, accommodation, and briefing is rejected with clear blocking reasons.',
        actual: blocked ? `Successfully blocked: ${blockingError.slice(0, 100)}...` : 'Failed: Premature departure approved without prerequisites.',
        details: 'Guarantees students cannot be marked ready for departure if critical travel prerequisites remain unsatisfied.'
      });
    } catch (err: any) {
      results.push({
        id: 'TRV-TEST-01',
        name: 'Travel Readiness Blocking Conditions',
        category: 'Travel Readiness',
        passed: false,
        expected: 'Blocking condition enforcement',
        actual: `Exception: ${err.message}`,
        details: 'Error in Test 1'
      });
    }

    // Test 2: Ticket issuance authorization rule
    try {
      const studentId = 'test_std_unauth_ticket';
      const booking = this.getTravelDeskBooking(studentId);
      booking.studentApprovalStatus = 'pending_student_review';
      booking.paymentStatus = 'unpaid';

      let rejected = false;
      let rejectError = '';
      try {
        this.issueTicketAndUploadPNR(studentId, {
          pnr: 'FAKE99',
          eTicketNumber: '000-111111111',
          eTicketFileName: 'fake_ticket.pdf',
          verifiedOfficer: 'Unauthorized Agent'
        });
      } catch (err: any) {
        rejected = true;
        rejectError = err.message;
      }

      results.push({
        id: 'TRV-TEST-02',
        name: 'Strict Payment & Booking Ticket Authorization Rule',
        category: 'Travel Desk',
        passed: rejected && rejectError.includes('Unauthorized ticket issuance blocked'),
        expected: 'Do not issue or claim to issue tickets without a real authorized booking and verified payment process.',
        actual: rejected ? `Rejected properly: ${rejectError}` : 'Violation: Ticket issued without payment verification.',
        details: 'Enforces strict anti-fraud rule preventing staff from uploading tickets or claiming PNRs without verified financial settlement and student sign-off.'
      });
    } catch (err: any) {
      results.push({
        id: 'TRV-TEST-02',
        name: 'Strict Payment & Booking Ticket Authorization Rule',
        category: 'Travel Desk',
        passed: false,
        expected: 'Rejection of unpaid ticket issuance',
        actual: `Exception: ${err.message}`,
        details: 'Error in Test 2'
      });
    }

    // Test 3: Flight option selection & student approval status changes
    try {
      const studentId = 'test_std_options';
      const booking = this.getTravelDeskBooking(studentId);
      this.setFlightOptions(studentId, [
        {
          id: 'opt_a',
          airline: 'British Airways',
          flightNumber: 'BA 118',
          routing: 'BLR -> LHR',
          departureAirport: 'BLR',
          arrivalAirport: 'LHR',
          departureDateTime: '2026-09-30T07:00:00',
          arrivalDateTime: '2026-09-30T13:00:00',
          fareInr: 52000,
          cabinBaggageKg: 7,
          checkInBaggage: '2 x 23 kg',
          transitVisaRequired: false,
          transitDurationHours: 0,
          isRecommended: true,
          studentApproved: false,
          notes: 'Nonstop flight'
        }
      ]);

      const approvedBooking = this.studentApproveFlight(studentId, 'opt_a', true, 'Student confirmed BA 118 nonstop.');

      results.push({
        id: 'TRV-TEST-03',
        name: 'Flight Options Comparison & Student Approval',
        category: 'Travel Desk',
        passed: approvedBooking.studentApprovalStatus === 'student_approved' && approvedBooking.flightOptions[0].studentApproved === true,
        expected: 'Student approval records selected option and updates status to student_approved.',
        actual: `Status: ${approvedBooking.studentApprovalStatus}, Option approved: ${approvedBooking.flightOptions[0].studentApproved}`,
        details: 'Validates transparent student flight quotation comparison and auditable approval timestamps.'
      });
    } catch (err: any) {
      results.push({
        id: 'TRV-TEST-03',
        name: 'Flight Options Comparison & Student Approval',
        category: 'Travel Desk',
        passed: false,
        expected: 'Flight option selection and student approval',
        actual: `Exception: ${err.message}`,
        details: 'Error in Test 3'
      });
    }

    // Test 4: Notification routing
    try {
      const studentId = 'test_std_routing';
      const booking = this.getTravelDeskBooking(studentId);
      const arrival = this.getArrivalServices(studentId);
      booking.departureReminders = [
        { id: 'rem_t4', stage: 'T-7 days', scheduledDate: '2026-09-20', message: 'T-7 days checklist', sent: false }
      ];

      const reminderResult = this.sendDepartureReminder(studentId, 'rem_t4');
      const pickupResult = this.notifyAirportPickup(studentId, 'Student carrying 2 x 23kg check-in baggage');

      results.push({
        id: 'TRV-TEST-04',
        name: 'Notification Routing & Departure Reminders',
        category: 'Communications',
        passed: reminderResult.sent === true && pickupResult.success === true && booking.airportPickupNotified === true,
        expected: 'Departure reminders dispatched and airport pickup notifications routed to driver with flight details.',
        actual: `Reminder sent: ${reminderResult.sent}, Driver notified: ${pickupResult.success}, Timestamp: ${pickupResult.notifiedAt}`,
        details: 'Ensures reliable delivery of departure packing alerts, web check-in links, and driver arrival notices.'
      });
    } catch (err: any) {
      results.push({
        id: 'TRV-TEST-04',
        name: 'Notification Routing & Departure Reminders',
        category: 'Communications',
        passed: false,
        expected: 'Notification dispatch and tracking',
        actual: `Exception: ${err.message}`,
        details: 'Error in Test 4'
      });
    }

    // Test 5: Support ticket escalation & SLA calculation
    try {
      const ticket = this.createSupportTicket({
        studentId: 'test_std_esc',
        studentRefNo: 'GMI-TEST-001',
        studentName: 'Test Student Esc',
        studentPhone: '+91 99999 11111',
        parentPhone: '+91 99999 22222',
        destinationCountry: 'United Kingdom',
        category: 'Health & Medical Emergency',
        priority: 'critical',
        subject: 'Student Hospitalized in London with Acute Appendicitis',
        description: 'Immediate health emergency assistance required.'
      });

      results.push({
        id: 'TRV-TEST-05',
        name: 'Support Ticket SLA Calculation & Auto-Escalation',
        category: 'Support Tickets',
        passed: ticket.slaHours === 4 && ticket.escalation.level === 'post_landing_director' && ticket.escalation.escalatedTo !== undefined,
        expected: 'Critical priority tickets automatically receive 4-hour SLA and escalate directly to Post-Landing Director.',
        actual: `SLA: ${ticket.slaHours}h, Escalation Level: ${ticket.escalation.level}, Escalated To: ${ticket.escalation.escalatedTo}`,
        details: 'Validates automated SLA timers and immediate senior leadership alerting for life-safety incidents.'
      });
    } catch (err: any) {
      results.push({
        id: 'TRV-TEST-05',
        name: 'Support Ticket SLA Calculation & Auto-Escalation',
        category: 'Support Tickets',
        passed: false,
        expected: 'Critical SLA and auto-escalation',
        actual: `Exception: ${err.message}`,
        details: 'Error in Test 5'
      });
    }

    // Test 6: Student privacy permission check on parent communications
    try {
      const ticket = this.createSupportTicket({
        studentId: 'test_std_privacy',
        studentRefNo: 'GMI-TEST-002',
        studentName: 'Test Student Privacy',
        studentPhone: '+91 99999 33333',
        parentPhone: '+91 99999 44444',
        destinationCountry: 'Germany',
        category: 'Academic & Enrollment',
        priority: 'medium',
        subject: 'Course schedule inquiry',
        description: 'Routine question about semester elective enrollment.'
      });

      // Force privacy setting to strictly_prohibited
      ticket.parentPermission.allowParentCommunication = false;
      ticket.parentPermission.consentScope = 'strictly_prohibited';

      const parentCheck = this.checkAndNotifyParent(ticket.id, 'Your ward has an academic elective question.');

      results.push({
        id: 'TRV-TEST-06',
        name: 'Student Privacy & Parent Permission Enforcement',
        category: 'Data Privacy & RBAC',
        passed: parentCheck.allowed === false && parentCheck.reason === 'BLOCKED_BY_STUDENT_PRIVACY',
        expected: 'Parent notification is blocked when student has not granted consent or set privacy to strictly prohibited.',
        actual: `Allowed: ${parentCheck.allowed}, Reason: ${parentCheck.reason}, Blocked Attempts: ${ticket.parentPermission.blockedAttemptsCount}`,
        details: 'Guarantees compliance with international data privacy laws (GDPR/FERPA) by enforcing explicit student consent before sharing updates with parents.'
      });
    } catch (err: any) {
      results.push({
        id: 'TRV-TEST-06',
        name: 'Student Privacy & Parent Permission Enforcement',
        category: 'Data Privacy & RBAC',
        passed: false,
        expected: 'Strict privacy enforcement',
        actual: `Exception: ${err.message}`,
        details: 'Error in Test 6'
      });
    }

    // Test 7: Critical incident handling
    try {
      const criticalTicket = this.createSupportTicket({
        studentId: 'test_std_incident',
        studentRefNo: 'GMI-TEST-003',
        studentName: 'Incident Student',
        studentPhone: '+91 99999 55555',
        parentPhone: '+91 99999 66666',
        destinationCountry: 'United Kingdom',
        category: 'Lost Documents / Baggage',
        priority: 'critical',
        subject: 'Lost Passport and BRP Vignette at Heathrow Airport Terminal 4',
        description: 'Student misplaced carry-on pouch containing original passport and visa vignette.'
      });

      // Add emergency message
      this.addTicketMessage(criticalTicket.id, {
        sender: 'Emergency Desk Officer',
        senderRole: 'visa_officer',
        channel: 'phone_call',
        message: 'Alerted Metropolitan Police Heathrow Station and Indian High Commission Emergency Consular Wing.',
        isInternal: true
      });

      // Update resolution
      const updatedTicket = this.updateTicketStatus(criticalTicket.id, 'resolved', {
        summary: 'Pouch located by Heathrow Lost Property Office (LPO reference LPO-88419). Handed to student in presence of GMI field coordinator.',
        rootCause: 'Pouch left on seating bench at baggage carousel 7.',
        resolvedBy: 'David Wilson (UK Post-Landing Specialist)'
      });

      results.push({
        id: 'TRV-TEST-07',
        name: 'Critical Incident Handling & Rapid Resolution Trail',
        category: 'Incident Management',
        passed: updatedTicket.status === 'resolved' && updatedTicket.resolutionNotes !== undefined && updatedTicket.communicationHistory.length >= 2,
        expected: 'Critical incident lifecycle manages multi-channel coordination, root cause logging, and audit resolution.',
        actual: `Status: ${updatedTicket.status}, Root Cause Logged: true, History: ${updatedTicket.communicationHistory.length} events`,
        details: 'Validates emergency protocol execution, external liaison logging (Police/Consulate), and structured resolution sign-off.'
      });
    } catch (err: any) {
      results.push({
        id: 'TRV-TEST-07',
        name: 'Critical Incident Handling & Rapid Resolution Trail',
        category: 'Incident Management',
        passed: false,
        expected: 'Critical incident resolution lifecycle',
        actual: `Exception: ${err.message}`,
        details: 'Error in Test 7'
      });
    }

    // Test 8: Post-landing service activation
    try {
      const studentId = 'test_std_post_landing';
      const arrival = this.activatePostLandingServices(studentId);
      const readiness = this.getTravelReadiness(studentId);

      const hasAll9Services = 
        arrival.services.airportPickup !== undefined &&
        arrival.services.dropToResidence !== undefined &&
        arrival.services.cityRegistration !== undefined &&
        arrival.services.collegeRegistration !== undefined &&
        arrival.services.simAssistance !== undefined &&
        arrival.services.bankAccountAssistance !== undefined &&
        arrival.services.accommodationSupport !== undefined &&
        arrival.services.partTimeJobAssistance !== undefined &&
        arrival.services.parentHotlineEmergencySupport !== undefined;

      results.push({
        id: 'TRV-TEST-08',
        name: 'Post-Landing Service Activation (All 9 Modules)',
        category: 'Arrival Services',
        passed: hasAll9Services && arrival.overallStatus === 'services_in_progress' && readiness.readinessStatus === 'landed',
        expected: 'Seamless activation of all 9 configurable arrival services with readiness transitioned to landed.',
        actual: `Overall Status: ${arrival.overallStatus}, Readiness: ${readiness.readinessStatus}, 9 Services Active: ${hasAll9Services}`,
        details: 'Confirms that arrival triggers airport pickup, residence drop, city registration, college registration, SIM, bank account, housing support, part-time job guidance, and parent hotline.'
      });
    } catch (err: any) {
      results.push({
        id: 'TRV-TEST-08',
        name: 'Post-Landing Service Activation (All 9 Modules)',
        category: 'Arrival Services',
        passed: false,
        expected: 'Activation of all 9 arrival modules',
        actual: `Exception: ${err.message}`,
        details: 'Error in Test 8'
      });
    }

    return results;
  }
}

export const travelPostLandingEngine = new TravelPostLandingEngine();
