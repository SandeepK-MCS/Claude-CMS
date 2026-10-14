# Student Lifecycle CRM — Architecture & Technical Documentation

> **Status:** Production-Ready & Database Synchronized  
> **Schema:** Neon PostgreSQL (`crm` schema)  
> **Backend Framework:** Node.js / Express 4 with TypeScript (`tsx`)  
> **Frontend Framework:** React 19 SPA (Vite + Tailwind CSS + Lucide Icons)  
> **Last Synchronized:** October 2026

---

## 1. Executive Summary & System Overview

The **Student Lifecycle CRM** is an enterprise-grade platform tailored for international education consultancies. It orchestrates the complete student journey—from multi-channel lead capture, automated round-robin counselor assignment, and structured counseling sessions, to university course shortlisting, application filing, offer management, visa processing (including Germany APS verification), education loans, forex, accommodation, and post-landing support.

The application adheres to high-security data isolation standards:
- **Hierarchical Access Control (RBAC):** Organization tree traversal where staff visibility is strictly scoped to direct and indirect reporting subordinates according to `ReportsToUserId`, while executive leadership retains organization-wide read access.
- **DPDP Act 2023 & GDPR Compliance:** Field-level masking for Government IDs (Passport, Aadhaar, PAN) and immutable audit logging for every profile view, edit, and export.
- **Multi-Calendar & Meeting Workforce Scheduling:** Direct integrations with Google Meet, Zoom, Zoho Meeting, Microsoft Teams, and customized corporate SMTP gateways.
- **Authoritative Neon PostgreSQL Persistence:** Real-time synchronization across 45+ relational tables under the `crm` schema, eliminating transient in-memory drift.

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             Client Tier (React 19 SPA)                           │
│  Lead Intake • Counselor Cockpit • Student 360° Portal • Master Updates • Admin  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ HTTPS / Bearer Token & Session Cookie
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       Application Gateway (`server-app.ts`)                      │
│  - Express REST APIs (/api/*)                                                    │
│  - Session Extraction & Header Recovery (x-authenticated-user-*)                 │
│  - Database Startup State Synchronization                                        │
│  - JSON Error & Unmatched Route Safeguards (Zero HTML leak on /api)               │
└─────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────┬─────┘
      │              │              │              │              │          │
      ▼              ▼              ▼              ▼              ▼          ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ ┌──────────┐
│ Security  │  │ Authorize │  │   Lead    │  │  Meeting  │  │Document  │ │Service  │
│  Engine   │  │  Service  │  │  Engine   │  │ Workforce │  │  Engine  │ │ & Visa  │
└─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────┬─────┘ └────┬─────┘
      │              │              │              │             │           │
      └──────────────┴──────────────┼──────────────┴─────────────┴───────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   Data Persistence Tier (`src/server/db.ts`)                     │
│           Neon Cloud PostgreSQL (`crm.*` schema tables, FKs, Triggers)           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure & Component Architecture

### 3.1 Server-Side Engines (`src/server/`)

| File | Purpose & Responsibilities |
| :--- | :--- |
| `server-app.ts` | **Primary Application Controller**: Declares all REST API endpoints, parses sessions, mounts Express middlewares, initializes Vite dev server in non-prod, and serves pre-compiled bundles in production. |
| `src/server/db.ts` | **Database Connection Manager**: Manages PostgreSQL connection pools via `pg.Pool`, parses SSL certificates, and handles automatic retry and connection liveness health checks. |
| `src/server/dbService.ts` | **Database Query Service**: Contains all parameterized SQL queries for users (`crm."GMI-users"`), leads (`crm."GMI-leads"`), students (`crm."GMI-students"`), OTP verification, and stored procedure calls. |
| `src/server/securityEngine.ts` | **Identity, Authentication & RBAC**: Maintains password verification, active sessions, OTP generation, 42 catalogued permissions, and reporting manager resolution via `ReportsToUserId`. |
| `src/server/authorizationService.ts` | **Data Isolation & Scope Enforcement**: Inspects verified user sessions and filters leads, students, applications, and counselor bandwidth based on reporting lines. |
| `src/server/leadRegistrationEngine.ts` | **Inbound Leads & Round-Robin**: Handles phone/email deduplication, multi-rule round-robin assignment, counselor workload limits (max 35 leads), status updates, and reassignment logic. |
| `src/server/meetingWorkforceEngine.ts` | **Workforce Availability & Shift Planning**: Computes staff working hours (e.g. `09:00 - 18:00 IST`), slot durations (15/30/45/60 mins), buffer gaps, presence states (`available`, `on_leave`, `offline`), and schedule compliance. |
| `src/server/schedulerOAuthEngine.ts` | **Calendar & Meeting Provider OAuth**: Handles tenant and user-level OAuth credentials for Google Meet, Microsoft Teams, Zoom, Zoho Meeting, and custom SMTP invitations. |
| `src/server/documentationEngine.ts` | **Document Verification & Country Checklists**: Manages country-specific compliance checklists (Germany, UK, USA, etc.), Bavarian GPA conversion formulas, and document verification/rejection. |
| `src/server/applicationEngine.ts` | **University Applications & Admissions**: Manages university selections (Ambitious, Moderate, Safe), course program applications, offer letters (Conditional/Unconditional), and CAS/I-20 visa issuance. |
| `src/server/serviceEngine.ts` | **Ancillary Student Services**: Parallel tracks for Education Loans (HDFC Credila, SBI), IELTS/GRE Test Prep, International Forex Cards, and Student Accommodation. |
| `src/server/travelPostLandingEngine.ts` | **Visa Processing & Relocation**: Embassy interview slots, German APS tracking, mock interview scorecards, flight ticketing, airport pickups, and arrival checklists. |
| `src/server/dashboardReportingEngine.ts` | **Analytics & Audit Reporting**: Role-specific KPI metrics (Super Admin, Branch Manager, Counselor, Student) and DPDP-compliant CSV/JSON audit export logs. |

### 3.2 Modular Frontend Architecture (`src/pages/` & `src/components/`)

The client tier has been completely restructured into distinct, modular `.tsx` pages and UI components:

```
src/
├── main.tsx                    # Vite React 19 bootstrap entry point
├── App.tsx                     # Master layout coordinator & view dispatcher
├── index.css                   # Tailwind CSS v4 styling rules
│
├── context/
│   └── AuthContext.tsx         # Active session, role switching & permission checks
│
├── components/layout/
│   ├── Header.tsx              # Application header, Neon DB indicator & role switcher
│   └── Sidebar.tsx             # Navigation drawer with active view states & badges
│
└── pages/
    ├── LeadsPage.tsx           # Lead intake, round-robin bandwidth cards & reassignments
    ├── StudentsPage.tsx        # Student 360° master profile & 13 lifecycle stage milestones
    ├── MasterUpdatesPage.tsx   # Roles, 42 permissions catalog, users, reporting & working hours
    ├── MeetingsPage.tsx        # Video scheduling (Meet/Zoom/Teams) & staff shift availability
    ├── ApplicationsPage.tsx    # University course submissions & admissions offer tracking
    ├── ServicesPage.tsx        # Parallel ancillary services (Loans, Forex, SIM, Housing)
    ├── VisaPage.tsx            # Germany APS tracking, embassy slots & airport greeting
    ├── AnalyticsPage.tsx       # Executive KPIs & DPDP compliance audit log exports
    └── DocumentationPage.tsx   # Live viewer loading TECHNICAL_DOCUMENTATION.md
```

---

## 4. Database Architecture & PostgreSQL Schema

All core entities reside in the `crm` schema inside PostgreSQL.

### Core Tables Summary

```sql
-- 1. Staff & System Users
crm."GMI-users" (
    id UUID PRIMARY KEY,
    first_name VARCHAR,
    last_name VARCHAR,
    email VARCHAR UNIQUE NOT NULL,
    normalized_email VARCHAR,
    phone VARCHAR,
    role_id VARCHAR REFERENCES crm."GMI-roles"(role_code),
    reports_to_user_id UUID REFERENCES crm."GMI-users"(id),
    branch VARCHAR,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- 2. Inbound Prospective Leads
crm."GMI-leads" (
    id UUID PRIMARY KEY,
    first_name VARCHAR,
    last_name VARCHAR,
    email VARCHAR NOT NULL,
    phone VARCHAR NOT NULL,
    source_code VARCHAR,
    priority VARCHAR CHECK (priority IN ('hot', 'warm', 'cold')),
    assigned_counselor_id UUID REFERENCES crm."GMI-users"(id),
    assigned_counselor_name VARCHAR,
    assigned_branch VARCHAR,
    lead_score INT,
    status VARCHAR DEFAULT 'new',
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    payload JSONB
);

-- 3. Master Enrolled Student Profiles
crm."GMI-students" (
    id UUID PRIMARY KEY,
    student_ref_no VARCHAR UNIQUE NOT NULL,
    originating_lead_id UUID,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    phone VARCHAR NOT NULL,
    current_stage VARCHAR NOT NULL,
    assigned_counselor_id UUID REFERENCES crm."GMI-users"(id),
    assigned_counselor_name VARCHAR,
    branch VARCHAR,
    passport_number VARCHAR,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    payload JSONB
);

-- 4. Roles & Granular Permission Actions
crm."GMI-roles" (
    id SERIAL PRIMARY KEY,
    role_code VARCHAR UNIQUE NOT NULL,
    role_name VARCHAR NOT NULL,
    parent_role_id INT REFERENCES crm."GMI-roles"(id),
    is_active BOOLEAN DEFAULT true
);
```

---

## 5. Security Architecture, RBAC & Data Isolation

### 5.1 Organizational Reporting Hierarchy

The hierarchy is dynamically calculated via `reportsToUserId`:

```
           [CEO / Executive Leadership] (Level 1)
                        │
         [Super Admin / Branch Managers] (Level 2)
                        │
         [Senior & Operational Counselors] (Level 3)
                        │
             [Enrolled Students] (Level 4)
```

### 5.2 Record-Level Authorization Rules (`authorizationService.ts`)

1. **Counselor Scope:**
   - Filtered strictly to leads and students where `assignedCounselorId === session.userId`.
   - Cannot view other counselors' student files or confidential loan documents.
2. **Manager Scope (`VIEW_SUBORDINATE_DATA`):**
   - Automatically resolves all direct reports and transitive indirect reports via recursive tree traversal.
   - Authorizes managers to monitor team caseloads, review call notes, and reassign leads.
3. **Executive Scope (`students:read_all`):**
   - Organization-wide visibility across all branches (Hyderabad, Bangalore, Delhi, Chennai, Corporate HQ).
4. **Student Scope (`students:read_own`):**
   - Strictly confined to their own single profile, university selections, document vault, and offer decisions.

---

## 6. Detailed Explanation of Recent Technical Modifications

### 6.1 Issue 1: Lead Reassignment Showing Only "Sandeep"

#### The Root Cause:
1. `leadRegistrationEngine.ts` was initialized with a static default counselor (`usr_c1` - Sandeep Koteshwara).
2. The server had 6 active counselors registered in PostgreSQL (`crm."GMI-users"`), namely:
   - **Manu S K** (`22222222-2222-2222-2222-222222222222`)
   - **Sandeep Koteshwara** (`515faba9-fa10-4ab7-9243-60ef024fbea9`)
   - **Pooja Sharma** (`33333333-3333-3333-3333-333333333333`)
   - **Sneha Patel** (`44444444-4444-4444-4444-444444444444`)
   - **Rajesh Kumar** (`55555555-5555-5555-5555-555555555555`)
   - **Ananya Sen** (`77777777-7777-7777-7777-777777777777`)
3. Because `syncCounselorsFromDb` was never called on server startup or when loading assignment rules, the in-memory counselor catalog only held 1 entry.
4. When `authorizationService.filterAuthorizedCounselorAvailability` filtered the list, non-admin sessions were restricted to their own ID.

#### The Architectural Fix:
1. **Startup Synchronization:** Added database pre-sync in `bootstrap()` in `server-app.ts` to populate all active counselors from `crm."GMI-users"` into `leadRegistrationEngine` and `securityEngine` before requests are accepted.
2. **Live Synchronization in Assignment Rules:** Updated `GET /api/leads/assignment-rules` to query PostgreSQL on demand and synchronize active counselors.
3. **Authorized Reassignment Scope:** Updated `filterAuthorizedCounselorAvailability` so that any user with `REASSIGN_LEADS`, `VIEW_TEAM_AVAILABILITY`, or management credentials receives the full roster of counselors.
4. **PostgreSQL Persistence on Reassign:** Updated `POST /api/leads/:id/reassign-counselor` and `POST /api/students/:id/reassign-counselor` to update `assigned_counselor_id`, `assigned_counselor_name`, and `branch` in PostgreSQL immediately.

---

### 6.2 Issue 2: `404` Errors on `/api/permissions` and `/api/meetings/availability`

#### The Root Cause:
When opening the **Master Updates** or **Lead Management** screens, the client fired parallel requests via `Promise.all`:
```javascript
[roles, permissions, students, users, availability, providers] = await Promise.all([
  fetch('/api/roles?includeInactive=true'),
  fetch('/api/permissions'),
  fetch('/api/students'),
  fetch('/api/users'),
  fetch('/api/meetings/availability'),
  fetch('/api/meetings/providers?role=...')
]);
```
Neither `/api/permissions` nor `/api/meetings/availability` existed on the server, producing HTTP 404 responses that interrupted the Master Updates interface.

#### The Architectural Fix:
1. **Added `GET /api/permissions`**:
   - Directly exports the authoritative 42-item catalog (`PERMISSIONS_CATALOG` in `src/types/security.ts`).
2. **Added `GET /api/meetings/availability`**:
   - Queries all internal staff members from `crm."GMI-users"`.
   - Returns staff details with configured working hours (`09:00 - 18:00`), working days (`Mon` through `Sat`), slot duration, buffer times, and timezone.
3. **Added `POST /api/meetings/availability`**:
   - Validates incoming parameters (`workingHoursStart`, `workingHoursEnd`, `workingDays`, `slotDurationMinutes`, `bufferMinutes`).
   - Updates the in-memory and engine availability schedules and logs an audit security event.

---

## 7. Complete Core REST API Catalog

### 7.1 Authentication & Security
- `POST /api/auth/login` — Authenticate using email and password. Returns session token and user profile.
- `POST /api/auth/verify-otp` — Verify 6-digit OTP for 2FA or password reset.
- `GET /api/auth/me` — Return current verified session, assigned branch, and granted permissions.
- `POST /api/auth/logout` — Terminate session.

### 7.2 Lead Management
- `GET /api/leads` — Query leads with filters (`status`, `source`, `priority`, `counselorId`, `search`).
- `POST /api/leads` — Ingest new lead with duplicate checking and round-robin assignment. Persists to PostgreSQL.
- `PUT /api/leads/:id` — Update lead contact information, study preferences, and degree.
- `POST /api/leads/:id/reassign-counselor` — Reassign lead to another counselor. Persists to `crm."GMI-leads"`.
- `GET /api/leads/assignment-rules` — Retrieve assignment algorithm (round-robin) and live counselor availability profiles.
- `PUT /api/leads/assignment-rules` — Update routing rules (e.g., Round Robin vs Workload Capacity).

### 7.3 Student Master Profile
- `GET /api/students` — Fetch students subject to record-level isolation filters.
- `GET /api/students/:id` — Fetch complete student profile with application history, documents, and audit logs.
- `PUT /api/students/:id` — Update student personal details, academic scores, and study preferences. Persists to `crm."GMI-students"`.
- `POST /api/students/:id/reassign-counselor` — Reassign student's counselor. Persists to `crm."GMI-students"`.
- `PATCH /api/students/:id/stage` — Advance lifecycle milestone (1 of 13 stages) with audit trail.

### 7.4 Master Updates, Roles & Permissions
- `GET /api/roles` — Retrieve all database roles (`CEO`, `Super Admin`, `Branch Manager`, `Counselor`, `Student`).
- `GET /api/permissions` — Returns complete 42-item permissions catalog.
- `GET /api/users` — Fetch all system user accounts from PostgreSQL.
- `POST /api/users` / `PUT /api/users/:id` — Create or update user account with validated `reportsToUserId`.

### 7.5 Meetings & Workforce Working Hours
- `GET /api/meetings/availability` — Retrieve working hours and availability status for all staff.
- `POST /api/meetings/availability` — Configure working hours, working days, and slot intervals for a staff member.
- `GET /api/meetings/providers` — Retrieve configured meeting providers (Google Meet, Zoom, Teams, Zoho).
- `POST /api/meetings/generate-link` — Provision instant video meeting link for counseling.

### 7.6 Documentation
- `GET /api/documentation/technical` — Serves this live technical documentation markdown file to the UI.

---

## 8. Instructions for Adding New Modules or Modifying Existing Ones

### 8.1 Adding a New Frontend Module
To introduce a new functional module (e.g., `PartnerUniversitiesPage` or `VisaCompliancePage`) without creating monoliths:
1. **Define Domain Types (`src/types/`):**
   - Create a dedicated file under `src/types/<moduleName>.ts` for all entities, data contracts, and status enums.
2. **Implement API Service (`src/api/`):**
   - Create `src/api/<moduleName>Api.ts` using `apiRequest` and `getAuthHeaders(session)` from `src/api/client.ts`.
   - Ensure all network calls pass session authorization headers.
3. **Create the Page Component (`src/pages/`):**
   - Create `src/pages/<ModuleName>Page.tsx`.
   - Use `useAuth()` from `src/context/AuthContext` for user session and role-tailored rendering.
   - Utilize shared reusable components from `src/components/common/` (`StatusBadge`, `DataTable`, `Modal`) rather than duplicating markup.
4. **Register in Navigation (`src/types/navigation.ts` & `src/components/layout/Sidebar.tsx`):**
   - Add the new page identifier to `NavigationPage` union in `Sidebar.tsx`.
   - Add a navigation item with title, icon, and `allowedRoles` to `NAV_ITEMS` in `src/types/navigation.ts`.
5. **Mount in Layout (`src/App.tsx`):**
   - Add the case in `renderCurrentPage()` in `src/App.tsx`.

### 8.2 Adding New Backend Endpoints
1. If the entity requires PostgreSQL persistence, add or use helper functions in `src/server/dbService.ts`.
2. Add the route handler in `server-app.ts` under the appropriate section.
3. Enforce role checking via `isAuthorized...` or verify against `securityEngine.resolveReportingManagerForUser`.
4. Run `npm run lint` (`tsc --noEmit`) to verify strict type safety.

---

## 9. Verification & Health Monitoring

The server runs on port `3000`. To verify the health of the application and its integrations:

```bash
# 1. Check database connectivity
curl -s http://localhost:3000/api/health | jq .

# 2. Verify all 6 counselors in assignment rules
curl -s http://localhost:3000/api/leads/assignment-rules | jq '.counselors[] | {id, name, branch}'

# 3. Verify permissions catalog endpoint
curl -s http://localhost:3000/api/permissions | jq '.permissions | length'

# 4. Verify staff availability endpoint
curl -s http://localhost:3000/api/meetings/availability | jq '.[0]'
```

---
*Maintained by the Student Lifecycle CRM Core Engineering Team.*
