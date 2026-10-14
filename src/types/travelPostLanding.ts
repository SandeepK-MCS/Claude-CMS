/**
 * Student Lifecycle CRM - Travel & Post-Landing Domain Types
 */

export interface BriefingTopic {
  id?: string;
  title?: string;
  completed?: boolean;
  [key: string]: any;
}

export interface PreDepartureBriefing {
  id?: string;
  briefingDate?: string;
  sessionMode?: 'in_person' | 'online_zoom' | string;
  attended?: boolean;
  conductedBy?: string;
  packReceived?: boolean;
  topicsCovered?: BriefingTopic[];
  notes?: string;
  lastUpdated?: string;
  [key: string]: any;
}

export interface TravelChecklistItem {
  id?: string;
  title?: string;
  category?: string;
  isMandatory?: boolean;
  completed?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  [key: string]: any;
}

export interface TravelReadinessRecord {
  id: string;
  studentId: string;
  studentRefNo: string;
  studentName: string;
  destinationCountry: string;
  readinessStatus: 'not_started' | 'in_progress' | 'ready' | 'departed' | 'arrived' | 'landed' | string;
  preDepartureBriefing: PreDepartureBriefing;
  checklist: TravelChecklistItem[];
  updatedAt?: string;
  [key: string]: any;
}

export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'waived' | 'failed' | string;

export interface FlightOption {
  id?: string;
  optionId?: string;
  airline?: string;
  flightNumber?: string;
  routing?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureDateTime?: string;
  arrivalDateTime?: string;
  departureTime?: string;
  arrivalTime?: string;
  stops?: number;
  fareInr?: number;
  fareINR?: number;
  cabinBaggageKg?: number;
  baggageAllowanceKg?: number;
  notes?: string;
  isSelected?: boolean;
  studentApproved?: boolean;
  [key: string]: any;
}

export interface DepartureReminderItem {
  id?: string;
  studentId?: string;
  studentRefNo?: string;
  studentName?: string;
  daysUntilDeparture?: number;
  scheduledDate?: string;
  subject?: string;
  channel?: 'email' | 'whatsapp' | 'sms' | string;
  isSent?: boolean;
  sent?: boolean;
  sentAt?: string;
  [key: string]: any;
}

export interface TravelDeskBooking {
  id?: string;
  bookingId?: string;
  studentId: string;
  studentRefNo: string;
  studentName: string;
  destinationCity?: string;
  destinationCountry?: string;
  travelDate?: string;
  flightOptions: FlightOption[];
  selectedOptionId?: string;
  pnrNumber?: string;
  eTicketUrl?: string;
  bookingStatus?: 'options_sent' | 'option_selected' | 'ticket_issued' | 'cancelled' | string;
  ticketIssuanceStatus?: string;
  paymentStatus: PaymentStatus;
  studentApprovalStatus?: string;
  departureReminders?: DepartureReminderItem[];
  airportPickupNotified?: boolean;
  issuedAt?: string;
  issuedBy?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface ArrivalServiceItem {
  key?: string;
  name?: string;
  status?: 'pending' | 'in_progress' | 'confirmed' | 'completed' | 'declined' | string;
  providerName?: string;
  contactNumber?: string;
  details?: string;
  scheduledTime?: string;
  completedAt?: string;
  completed?: boolean;
  [key: string]: any;
}

export interface ArrivalServicesRecord {
  id?: string;
  studentId: string;
  studentRefNo: string;
  studentName: string;
  destinationCountry: string;
  destinationCity?: string;
  universityName?: string;
  landingDate?: string;
  activationDate?: string;
  overallStatus?: string;
  services: Record<string, any>;
  allActivated?: boolean;
  activatedAt?: string;
  notes?: string[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export type TicketCategory = string;
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical' | string;
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | string;
export type EscalationLevel = string;

export interface SupportTicketRecord {
  id?: string;
  ticketId?: string;
  ticketRefNumber?: string;
  studentId: string;
  studentRefNo: string;
  studentName: string;
  studentPhone?: string;
  parentPhone?: string;
  destinationCountry?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  assignedTo?: string;
  escalationLevel?: EscalationLevel;
  escalation?: any;
  slaHours?: number;
  parentPermission?: any;
  communicationHistory?: any[];
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: any;
  updatedAt?: string;
  [key: string]: any;
}

export interface TravelTestScenarioResult {
  id: string;
  name: string;
  category?: string;
  passed: boolean;
  details: string;
  [key: string]: any;
}
