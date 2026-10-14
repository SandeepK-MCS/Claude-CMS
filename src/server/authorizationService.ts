import { AuthenticatedUserSession, BusinessRole, PermissionAction } from '../types/security.ts';
import { StudentMasterProfile } from '../types/crm.ts';
import { LeadRecord, CounselorAssignmentProfile } from '../types/leadRegistration.ts';
import { securityEngine, SEED_SECURITY_USERS } from './securityEngine.ts';

export interface AuthorizedUserScope {
  userId: string;
  userName: string;
  userEmail: string;
  role: BusinessRole;
  roleId: number;
  permissions: PermissionAction[];
  reportsToUserId: string | null;
  directReportIds: string[];
  subordinateUserIds: string[];
  authorizedUserIds: string[];
  isOrganizationWide: boolean;
  canViewTeamAvailability: boolean;
  canManageAssignmentRules: boolean;
  canManageWorkingHours: boolean;
  canViewSubordinateData: boolean;
  canReassignLeads: boolean;
}

/**
 * Centralized AuthorizationService / UserAccessService
 * Enforces database-driven user-specific data isolation, permission checks,
 * reporting hierarchy traversal, and record ownership filtering across all APIs.
 */
export class AuthorizationService {
  /**
   * Resolves the authenticated user's exact access scope from their verified session.
   * Never trusts unverified frontend query parameters to escalate access.
   */
  public resolveUserAccess(session: AuthenticatedUserSession | null | undefined): AuthorizedUserScope {
    return securityEngine.getAuthorizedDataScope(session);
  }

  public hasPermission(session: AuthenticatedUserSession | null | undefined, permission: PermissionAction): boolean {
    if (!session) return false;
    return securityEngine.hasPermission(session, permission);
  }

  public userHasPermission(
    userIdOrSession: string | AuthenticatedUserSession | null | undefined,
    permission: PermissionAction
  ): boolean {
    if (!userIdOrSession) return false;
    if (typeof userIdOrSession === 'string') {
      const userRec = SEED_SECURITY_USERS.find(u => u.id === userIdOrSession);
      if (!userRec) return false;
      return securityEngine.getPermissionsForRole(userRec.role, userRec.roleId).includes(permission);
    }
    return this.hasPermission(userIdOrSession, permission);
  }

  /**
   * Filters leads strictly to those the authenticated user is authorized to view.
   * - Counsellor (without VIEW_SUBORDINATE_DATA): strictly AssignedToUserId === CurrentUserId
   * - Manager (with VIEW_SUBORDINATE_DATA): own leads + direct/indirect report leads
   * - Top-level Executive (with students:read_all): organization-wide leads
   */
  public filterAuthorizedLeads(
    session: AuthenticatedUserSession | null | undefined,
    leads: LeadRecord[]
  ): LeadRecord[] {
    const scope = this.resolveUserAccess(session);
    if (scope.isOrganizationWide) {
      return leads;
    }
    const allowedIds = new Set(scope.authorizedUserIds);
    const normalizedEmail = scope.userEmail.toLowerCase().trim();
    const normalizedName = scope.userName.toLowerCase().trim();

    return leads.filter(lead => {
      if (lead.assignedCounselorId && allowedIds.has(lead.assignedCounselorId)) {
        return true;
      }
      // Match by name if custom dynamically-created user
      if (
        scope.authorizedUserIds.length === 1 &&
        lead.assignedCounselorName &&
        lead.assignedCounselorName.toLowerCase().trim() === normalizedName
      ) {
        return true;
      }
      if (
        scope.role === 'student' &&
        lead.contact?.email &&
        lead.contact.email.toLowerCase().trim() === normalizedEmail
      ) {
        return true;
      }
      return false;
    });
  }

  /**
   * Evaluates if the authenticated user has record-level authorization to access an individual lead.
   */
  public canAccessLead(
    session: AuthenticatedUserSession | null | undefined,
    lead: LeadRecord
  ): boolean {
    if (!session) return true;
    const scope = this.resolveUserAccess(session);
    if (scope.isOrganizationWide) return true;
    if (lead.assignedCounselorId && scope.authorizedUserIds.includes(lead.assignedCounselorId)) {
      return true;
    }
    const normalizedEmail = scope.userEmail.toLowerCase().trim();
    const normalizedName = scope.userName.toLowerCase().trim();
    if (
      lead.assignedCounselorName &&
      (lead.assignedCounselorName.toLowerCase().trim() === normalizedName ||
       lead.assignedCounselorName.toLowerCase().trim() === normalizedEmail)
    ) {
      return true;
    }
    if (
      scope.role === 'student' &&
      lead.contact?.email &&
      lead.contact.email.toLowerCase().trim() === normalizedEmail
    ) {
      return true;
    }
    return false;
  }

  /**
   * Filters students strictly to those the authenticated user is authorized to view.
   */
  public filterAuthorizedStudents(
    session: AuthenticatedUserSession | null | undefined,
    students: StudentMasterProfile[]
  ): StudentMasterProfile[] {
    if (!session) return [];
    const scope = this.resolveUserAccess(session);
    if (scope.isOrganizationWide) {
      return students;
    }
    if (scope.role === 'student') {
      return students.filter(
        s =>
          s.id === session.studentId ||
          s.personal?.email?.toLowerCase() === scope.userEmail.toLowerCase()
      );
    }
    const allowedIds = new Set(scope.authorizedUserIds);
    const normalizedName = scope.userName.toLowerCase().trim();
    return students.filter(s => {
      if (s.assignedCounselorId && allowedIds.has(s.assignedCounselorId)) {
        return true;
      }
      if (
        scope.authorizedUserIds.length === 1 &&
        s.assignedCounselorName &&
        s.assignedCounselorName.toLowerCase().trim() === normalizedName
      ) {
        return true;
      }
      return false;
    });
  }

  /**
   * Record-level access check for a single student record (and all associated university selections,
   * recommendations, applications, offers, documents, and change requests).
   */
  public canAccessStudent(
    session: AuthenticatedUserSession | null | undefined,
    student: StudentMasterProfile
  ): { allowed: boolean; reason?: string } {
    if (!session) {
      return { allowed: false, reason: 'Authentication required to access student records.' };
    }
    if (session.role === 'student') {
      const isOwnStudent =
        session.studentId === student.id ||
        student.personal?.email?.toLowerCase() === (session.email || '').toLowerCase();
      if (isOwnStudent) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Access Denied: Students can only view their own university selection and profile records.'
      };
    }
    if (session.role === 'parent') {
      return securityEngine.canAccessStudentRecord(session, student);
    }

    const scope = this.resolveUserAccess(session);
    if (scope.isOrganizationWide) {
      return { allowed: true };
    }
    const allowedIds = new Set(scope.authorizedUserIds);
    const normalizedName = scope.userName.toLowerCase().trim();
    if (student.assignedCounselorId && allowedIds.has(student.assignedCounselorId)) {
      return { allowed: true };
    }
    if (
      scope.authorizedUserIds.length === 1 &&
      student.assignedCounselorName &&
      student.assignedCounselorName.toLowerCase().trim() === normalizedName
    ) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason:
        scope.role === 'counselor'
          ? `Access Denied: Counsellor ${scope.userName} can only access students assigned to them.`
          : `Access Denied: Student ${student.studentRefNo} is outside your reporting hierarchy.`
    };
  }

  /**
   * Record-level access check for a single lead record returning detailed object.
   */
  public canAccessLeadRecord(
    session: AuthenticatedUserSession | null | undefined,
    lead: LeadRecord
  ): { allowed: boolean; reason?: string } {
    if (!session) {
      return { allowed: false, reason: 'Authentication required to access lead records.' };
    }
    const matched = this.filterAuthorizedLeads(session, [lead]);
    if (matched.length > 0) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Access Denied: You are not authorized to access this lead record.'
    };
  }

  /**
   * Filters counsellor availability profiles:
   * - Without VIEW_TEAM_AVAILABILITY: returns ONLY the logged-in counsellor's own availability profile.
   * - With VIEW_TEAM_AVAILABILITY: returns permitted team members according to the reporting hierarchy.
   */
  public filterAuthorizedCounselorAvailability(
    session: AuthenticatedUserSession | null | undefined,
    counselors: CounselorAssignmentProfile[],
    activeLeads?: LeadRecord[]
  ): CounselorAssignmentProfile[] {
    const scope = this.resolveUserAccess(session);

    // Recompute live lead counts from actual leads if provided
    const computeLiveCount = (counselorId: string, fallbackCount: number) => {
      if (!activeLeads) return fallbackCount;
      return activeLeads.filter(
        l =>
          l.assignedCounselorId === counselorId &&
          l.status !== 'lost' &&
          l.status !== 'merged'
      ).length;
    };

    // If session is absent, or user is an admin/manager, or has reassign/team/rules permissions:
    // Return all counselors with live computed counts.
    const canSeeAll =
      !session ||
      scope.isOrganizationWide ||
      scope.canViewTeamAvailability ||
      scope.canReassignLeads ||
      scope.canManageAssignmentRules ||
      ['master_super_admin', 'super_admin', 'branch_manager', 'ceo', 'cfo', 'cso', 'operations'].includes(scope.role as string) ||
      ['master_super_admin', 'super_admin', 'branch_manager', 'ceo', 'cfo', 'cso', 'operations'].includes(session?.role as string);

    if (canSeeAll) {
      return counselors.map(c => ({
        ...c,
        activeLeadCount: computeLiveCount(c.id, c.activeLeadCount)
      }));
    }

    if (!scope.canViewTeamAvailability && !scope.canReassignLeads) {
      // Strictly own availability only!
      const ownProfile = counselors.find(
        c =>
          c.id === scope.userId ||
          c.email.toLowerCase() === scope.userEmail.toLowerCase()
      );
      if (ownProfile) {
        return [
          {
            ...ownProfile,
            activeLeadCount: computeLiveCount(ownProfile.id, ownProfile.activeLeadCount)
          }
        ];
      }
      // If logged-in counsellor is a newly created user not yet in counselors array, synthesize their own card
      if (scope.role === 'counselor') {
        const userRec = SEED_SECURITY_USERS.find(u => u.id === scope.userId);
        return [
          {
            id: scope.userId,
            name: scope.userName,
            email: scope.userEmail,
            branch: userRec?.branch || 'Hyderabad - Head Office',
            specializedCountries: ['Germany', 'UK', 'USA'],
            activeLeadCount: computeLiveCount(scope.userId, 0),
            maxLeadCapacity: 35,
            isAvailable: true,
            availabilityStatus: 'available',
            statusDurationMode: 'today'
          }
        ];
      }
      return [];
    }

    // User has VIEW_TEAM_AVAILABILITY: filter by reporting hierarchy unless organization-wide
    if (scope.isOrganizationWide) {
      return counselors.map(c => ({
        ...c,
        activeLeadCount: computeLiveCount(c.id, c.activeLeadCount)
      }));
    }

    const allowedIds = new Set(scope.authorizedUserIds);
    return counselors
      .filter(c => allowedIds.has(c.id))
      .map(c => ({
        ...c,
        activeLeadCount: computeLiveCount(c.id, c.activeLeadCount)
      }));
  }
}

export const authorizationService = new AuthorizationService();
export const userAccessService = authorizationService;
