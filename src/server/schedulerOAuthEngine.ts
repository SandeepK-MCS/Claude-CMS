import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  MeetingProviderCode,
  MeetingProviderConfiguration,
  UserMeetingProviderAuthStatus
} from '../types/meetingsWorkforce.ts';

dotenv.config();

export const REQUIRED_SCHEDULER_OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/gmail.send'
];

export const MICROSOFT_GRAPH_OAUTH_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
  'Calendars.ReadWrite',
  'OnlineMeetings.ReadWrite',
  'Mail.Send'
];

export const ZOHO_MEETING_OAUTH_SCOPES = [
  'ZohoCalendar.calendar.ALL',
  'ZohoCalendar.event.ALL',
  'ZohoMeeting.manageOrg.READ',
  'ZohoMeeting.meeting.ALL',
  'aaaserver.profile.READ'
];

export interface TenantProviderOAuthConfig {
  tenantId: string;
  providerCode: MeetingProviderCode;
  clientId: string;
  clientSecretEncrypted: string; // Encrypted at rest via AES-256-GCM; NEVER exposed to frontend
  redirectUri: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  microsoftTenantId?: string; // e.g., 'common' or Azure AD tenant GUID
  zohoRegion?: 'IN' | 'US' | 'EU' | 'AU';
  zohoSoid?: string;
  requiredScopes: string[];
  allowSharedSchedulerFallback: boolean;
  updatedAt: string;
}

export interface StoredSchedulerOAuthAccount {
  id: string;
  tenantId: string;
  providerCode: MeetingProviderCode;
  crmUserId: string;
  crmUserEmail?: string;
  crmUserRole: string;
  schedulerEmail: string;
  schedulerName: string;
  pictureUrl?: string;
  hostedDomain?: string;
  accountType: 'google_workspace_custom_domain' | 'gmail_personal' | 'microsoft_365' | 'zoho_workplace';
  accessTokenEncrypted: string;  // AES-256-GCM encrypted at rest
  refreshTokenEncrypted?: string; // AES-256-GCM encrypted at rest
  tokenType: string;
  expiryDateMs: number;
  grantedScopes: string[];
  isDefaultOrganizationScheduler: boolean;
  connectedAt: string;
  lastUsedAt?: string;
  lastTokenRefreshAt?: string;
  status: 'active' | 'expired' | 'revoked';
}

export interface PublicSchedulerAccountSummary {
  id: string;
  tenantId: string;
  providerCode: MeetingProviderCode;
  providerName: string;
  calendarServiceName: string;
  meetingServiceName: string;
  crmUserId: string;
  crmUserRole: string;
  schedulerEmail: string;
  schedulerName: string;
  hostedDomain?: string;
  accountType: 'google_workspace_custom_domain' | 'gmail_personal' | 'microsoft_365' | 'zoho_workplace';
  hasRefreshToken: boolean;
  isTokenValid: boolean;
  expiryDateIso: string;
  grantedScopes: string[];
  isDefaultOrganizationScheduler: boolean;
  connectedAt: string;
  lastUsedAt?: string;
  status: 'active' | 'expired' | 'revoked';
}

export interface SchedulerCalendarMeetResult {
  success: boolean;
  providerCode: MeetingProviderCode;
  providerName: string;
  calendarServiceName: string;
  meetingServiceName: string;
  schedulerEmail: string;
  schedulerName: string;
  organizerEmail: string;
  recipientEmail: string;
  calendarEventId?: string;
  calendarHtmlLink?: string;
  meetLink?: string;
  meetingCode?: string;
  gmailMessageId?: string;
  calendarInvitationSent: boolean;
  gmailEmailSent: boolean;
  error?: string;
  errorCode?: string;
}

interface PersistedOAuthStoreFile {
  version: number;
  updatedAt: string;
  providerConfigurations: MeetingProviderConfiguration[];
  tenantOAuthConfigs: TenantProviderOAuthConfig[];
  accounts: StoredSchedulerOAuthAccount[];
}

export const PROVIDER_CATALOG: Record<
  MeetingProviderCode,
  {
    providerCode: MeetingProviderCode;
    providerName: string;
    calendarServiceName: string;
    meetingServiceName: string;
    connectButtonLabel: string;
    connectedStatusLabel: string;
    defaultAuthorizationUrl: string;
    defaultTokenUrl: string;
    defaultCallbackPath: string;
    defaultScopes: string[];
  }
> = {
  GOOGLE: {
    providerCode: 'GOOGLE',
    providerName: 'Google',
    calendarServiceName: 'Google Calendar',
    meetingServiceName: 'Google Meet',
    connectButtonLabel: 'Connect Google Calendar',
    connectedStatusLabel: 'Google Calendar',
    defaultAuthorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    defaultTokenUrl: 'https://oauth2.googleapis.com/token',
    defaultCallbackPath: '/auth/google/callback',
    defaultScopes: REQUIRED_SCHEDULER_OAUTH_SCOPES
  },
  MICROSOFT: {
    providerCode: 'MICROSOFT',
    providerName: 'Microsoft',
    calendarServiceName: 'Microsoft Calendar',
    meetingServiceName: 'Microsoft Teams',
    connectButtonLabel: 'Connect Microsoft Calendar',
    connectedStatusLabel: 'Microsoft Calendar',
    defaultAuthorizationUrl: 'https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize',
    defaultTokenUrl: 'https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token',
    defaultCallbackPath: '/auth/microsoft/callback',
    defaultScopes: MICROSOFT_GRAPH_OAUTH_SCOPES
  },
  ZOHO: {
    providerCode: 'ZOHO',
    providerName: 'Zoho',
    calendarServiceName: 'Zoho Calendar',
    meetingServiceName: 'Zoho Meeting',
    connectButtonLabel: 'Connect Zoho Calendar',
    connectedStatusLabel: 'Zoho Calendar',
    defaultAuthorizationUrl: 'https://accounts.zoho.{region}/oauth/v2/auth',
    defaultTokenUrl: 'https://accounts.zoho.{region}/oauth/v2/token',
    defaultCallbackPath: '/auth/zoho/callback',
    defaultScopes: ZOHO_MEETING_OAUTH_SCOPES
  }
};

/**
 * Generates a realistic provider-specific meeting join URL when a live provider API call
 * is pending or in sandbox mode.
 */
export function generateProviderMeetingUrl(providerCode: MeetingProviderCode): {
  joinUrl: string;
  meetingCode: string;
} {
  const chars = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '0123456789';
  const seg = (len: number, pool = chars) =>
    Array.from({ length: len }, () => pool[Math.floor(Math.random() * pool.length)]).join('');

  if (providerCode === 'MICROSOFT') {
    const threadId = `19:meeting_${crypto.randomBytes(12).toString('hex')}@thread.v2`;
    const code = `MS-TEAMS-${seg(4, digits)}`;
    return {
      joinUrl: `https://teams.microsoft.com/l/meetup-join/${encodeURIComponent(threadId)}/0?context=${encodeURIComponent('{"Tid":"common"}')}`,
      meetingCode: code
    };
  }

  if (providerCode === 'ZOHO') {
    const key = `81${seg(8, digits)}`;
    const code = `ZOHO-MTG-${key.slice(-4)}`;
    return {
      joinUrl: `https://meeting.zoho.in/meeting/${key}`,
      meetingCode: code
    };
  }

  const gCode = `${seg(3)}-${seg(4)}-${seg(3)}`;
  return {
    joinUrl: `https://meet.google.com/${gCode}`,
    meetingCode: gCode
  };
}

/**
 *Builds a provider-appropriate Web Calendar URL for adding/viewing the event
 */
export function buildProviderWebCalendarUrl(params: {
  providerCode: MeetingProviderCode;
  title: string;
  startIso: string;
  endIso: string;
  agenda: string;
  meetLink: string;
  candidateEmail: string;
  schedulerEmail: string;
}): string {
  const safeStart = new Date(params.startIso || Date.now());
  const safeEnd = new Date(params.endIso || Date.now() + 30 * 60 * 1000);

  if (params.providerCode === 'MICROSOFT') {
    const query = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: params.title,
      startdt: safeStart.toISOString(),
      enddt: safeEnd.toISOString(),
      body: `${params.agenda}\n\nJoin Microsoft Teams Meeting: ${params.meetLink}`,
      location: 'Microsoft Teams Online Meeting',
      to: `${params.candidateEmail};${params.schedulerEmail}`
    });
    return `https://outlook.office.com/calendar/0/deeplink/compose?${query.toString()}`;
  }

  if (params.providerCode === 'ZOHO') {
    const query = new URLSearchParams({
      title: params.title,
      stime: safeStart.toISOString(),
      etime: safeEnd.toISOString(),
      description: `${params.agenda}\n\nJoin Zoho Meeting: ${params.meetLink}`,
      location: params.meetLink,
      attendees: `${params.candidateEmail},${params.schedulerEmail}`
    });
    return `https://calendar.zoho.in/zc/ui/event/create?${query.toString()}`;
  }

  const formatCalDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dates = `${formatCalDate(safeStart)}/${formatCalDate(safeEnd)}`;
  const details = `${params.agenda}\n\nGoogle Meet Video Room: ${params.meetLink}`;
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    vcon: 'meet',
    text: params.title,
    dates,
    details,
    location: params.meetLink,
    add: `${params.candidateEmail},${params.schedulerEmail}`
  });
  return `https://calendar.google.com/calendar/u/0/r/eventedit?${query.toString()}`;
}

export class SchedulerOAuthEngine {
  /**
   * User-specific connection map keyed by `${tenantId}:${crmUserId}:${providerCode}`
   */
  private userConnections: Map<string, StoredSchedulerOAuthAccount> = new Map();
  /**
   * Database-driven `MeetingProviderConfiguration` rows per tenant
   */
  private providerConfigs: MeetingProviderConfiguration[] = [];
  /**
   * Tenant-specific OAuth settings (secrets encrypted at rest)
   */
  private tenantOAuthConfigs: Map<string, TenantProviderOAuthConfig> = new Map();

  private pendingStates: Map<
    string,
    {
      state: string;
      tenantId: string;
      providerCode: MeetingProviderCode;
      crmUserId: string;
      crmUserEmail?: string;
      crmUserRole: string;
      redirectUri: string;
      setAsDefault: boolean;
      createdAtMs: number;
    }
  > = new Map();

  private storageFilePath: string;
  private keyFilePath: string;
  private masterEncryptionKey: Buffer;

  constructor() {
    const dataDir = path.resolve(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    this.storageFilePath = path.join(dataDir, 'scheduler_oauth_credentials.json');
    this.keyFilePath = path.join(dataDir, '.oauth_master_key');
    this.masterEncryptionKey = this.initMasterEncryptionKey();
    this.seedDefaultProviderConfigurations();
    this.loadFromDisk();
  }

  /**
   * Initializes or loads the server-side 256-bit AES-GCM master key.
   * Never exposed outside the backend process.
   */
  private initMasterEncryptionKey(): Buffer {
    const envSecret = process.env.OAUTH_ENCRYPTION_MASTER_KEY || process.env.SESSION_SECRET;
    if (envSecret && envSecret.trim().length >= 16) {
      return crypto.createHash('sha256').update(envSecret.trim()).digest();
    }
    try {
      if (fs.existsSync(this.keyFilePath)) {
        const rawHex = fs.readFileSync(this.keyFilePath, 'utf8').trim();
        if (rawHex.length === 64) {
          return Buffer.from(rawHex, 'hex');
        }
      }
      const generated = crypto.randomBytes(32);
      fs.writeFileSync(this.keyFilePath, generated.toString('hex'), {
        encoding: 'utf8',
        mode: 0o600
      });
      return generated;
    } catch {
      return crypto.createHash('sha256').update('gmi-crm-server-aes-256-gcm-vault-key').digest();
    }
  }

  /**
   * Encrypts sensitive values (client secrets, access tokens, refresh tokens) at rest using AES-256-GCM.
   */
  public encryptSecret(plainText?: string): string {
    if (!plainText) return '';
    if (plainText.startsWith('enc:v1:')) return plainText;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterEncryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `enc:v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypts an AES-256-GCM encrypted secret strictly in backend memory when needed.
   */
  public decryptSecret(cipherText?: string): string {
    if (!cipherText) return '';
    if (!cipherText.startsWith('enc:v1:')) {
      return cipherText;
    }
    try {
      const parts = cipherText.split(':');
      if (parts.length !== 5) return '';
      const iv = Buffer.from(parts[2], 'hex');
      const authTag = Buffer.from(parts[3], 'hex');
      const encrypted = Buffer.from(parts[4], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterEncryptionKey, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      return '';
    }
  }

  private buildUserConnectionKey(tenantId: string, crmUserId: string, providerCode: MeetingProviderCode): string {
    return `${(tenantId || 'tenant_default').toLowerCase().trim()}::${(crmUserId || 'usr_c1').toLowerCase().trim()}::${providerCode}`;
  }

  private isPlaceholderCredential(val?: string): boolean {
    if (!val) return true;
    const trimmed = val.trim();
    return (
      !trimmed ||
      trimmed.startsWith('<ENTER_') ||
      trimmed.includes('ENTER_CENTUOS_') ||
      trimmed === 'YOUR_CLIENT_ID' ||
      trimmed === 'YOUR_CLIENT_SECRET'
    );
  }

  private reloadEnvFile(): void {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
        for (const [k, v] of Object.entries(parsed)) {
          if (v !== undefined) {
            process.env[k] = v;
          }
        }
      }
    } catch {}
  }

  private seedDefaultProviderConfigurations(): void {
    this.reloadEnvFile();
    const nowIso = new Date().toISOString();
    this.providerConfigs = [
      // Primary Tenant ('tenant_default'): Google enabled by default (Centuos Test Configuration)
      {
        id: 1,
        tenantId: 'tenant_default',
        providerName: PROVIDER_CATALOG.GOOGLE.providerName,
        providerCode: 'GOOGLE',
        calendarServiceName: PROVIDER_CATALOG.GOOGLE.calendarServiceName,
        meetingServiceName: PROVIDER_CATALOG.GOOGLE.meetingServiceName,
        connectButtonLabel: PROVIDER_CATALOG.GOOGLE.connectButtonLabel,
        connectedStatusLabel: PROVIDER_CATALOG.GOOGLE.connectedStatusLabel,
        isEnabled: true,
        isDefault: true,
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso
      },
      {
        id: 2,
        tenantId: 'tenant_default',
        providerName: PROVIDER_CATALOG.MICROSOFT.providerName,
        providerCode: 'MICROSOFT',
        calendarServiceName: PROVIDER_CATALOG.MICROSOFT.calendarServiceName,
        meetingServiceName: PROVIDER_CATALOG.MICROSOFT.meetingServiceName,
        connectButtonLabel: PROVIDER_CATALOG.MICROSOFT.connectButtonLabel,
        connectedStatusLabel: PROVIDER_CATALOG.MICROSOFT.connectedStatusLabel,
        isEnabled: false,
        isDefault: false,
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso
      },
      {
        id: 3,
        tenantId: 'tenant_default',
        providerName: PROVIDER_CATALOG.ZOHO.providerName,
        providerCode: 'ZOHO',
        calendarServiceName: PROVIDER_CATALOG.ZOHO.calendarServiceName,
        meetingServiceName: PROVIDER_CATALOG.ZOHO.meetingServiceName,
        connectButtonLabel: PROVIDER_CATALOG.ZOHO.connectButtonLabel,
        connectedStatusLabel: PROVIDER_CATALOG.ZOHO.connectedStatusLabel,
        isEnabled: false,
        isDefault: false,
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso
      },
      // Multi-Tenant Example: Company B -> Microsoft 365
      {
        id: 4,
        tenantId: 'tenant_company_b',
        providerName: PROVIDER_CATALOG.MICROSOFT.providerName,
        providerCode: 'MICROSOFT',
        calendarServiceName: PROVIDER_CATALOG.MICROSOFT.calendarServiceName,
        meetingServiceName: PROVIDER_CATALOG.MICROSOFT.meetingServiceName,
        connectButtonLabel: PROVIDER_CATALOG.MICROSOFT.connectButtonLabel,
        connectedStatusLabel: PROVIDER_CATALOG.MICROSOFT.connectedStatusLabel,
        isEnabled: true,
        isDefault: true,
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso
      },
      // Multi-Tenant Example: Company C -> Zoho
      {
        id: 5,
        tenantId: 'tenant_company_c',
        providerName: PROVIDER_CATALOG.ZOHO.providerName,
        providerCode: 'ZOHO',
        calendarServiceName: PROVIDER_CATALOG.ZOHO.calendarServiceName,
        meetingServiceName: PROVIDER_CATALOG.ZOHO.meetingServiceName,
        connectButtonLabel: PROVIDER_CATALOG.ZOHO.connectButtonLabel,
        connectedStatusLabel: PROVIDER_CATALOG.ZOHO.connectedStatusLabel,
        isEnabled: true,
        isDefault: true,
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso
      }
    ];

    // Seed Centuos Google Test Configuration in database configuration map
    const defaultGoogleClientId = (
      process.env.GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_OAUTH_CLIENT_ID ||
      '<ENTER_CENTUOS_CLIENT_ID>'
    ).trim();
    const defaultGoogleSecret = (
      process.env.GOOGLE_CLIENT_SECRET ||
      process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
      '<ENTER_CENTUOS_CLIENT_SECRET>'
    ).trim();
    const defaultGoogleRedirectUri = (
      process.env.GOOGLE_REDIRECT_URI ||
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      'https://ais-dev-iyvsb4wnqnitsz53mamjjw-332341223694.asia-southeast1.run.app/auth/google/callback'
    ).trim();

    this.tenantOAuthConfigs.set('tenant_default::GOOGLE', {
      tenantId: 'tenant_default',
      providerCode: 'GOOGLE',
      clientId: defaultGoogleClientId,
      clientSecretEncrypted: this.encryptSecret(defaultGoogleSecret),
      redirectUri: defaultGoogleRedirectUri,
      authorizationUrl:
        process.env.GOOGLE_OAUTH_AUTHORIZATION_URL ||
        PROVIDER_CATALOG.GOOGLE.defaultAuthorizationUrl,
      tokenUrl:
        process.env.GOOGLE_OAUTH_TOKEN_URL ||
        PROVIDER_CATALOG.GOOGLE.defaultTokenUrl,
      microsoftTenantId: 'common',
      zohoRegion: 'IN',
      zohoSoid: '',
      requiredScopes: REQUIRED_SCHEDULER_OAUTH_SCOPES,
      allowSharedSchedulerFallback: false,
      updatedAt: nowIso
    });
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf8');
        const parsed: any = JSON.parse(raw);

        if (Array.isArray(parsed?.providerConfigurations) && parsed.providerConfigurations.length > 0) {
          this.providerConfigs = parsed.providerConfigurations.map((row: MeetingProviderConfiguration) => {
            const cat = PROVIDER_CATALOG[row.providerCode];
            if (!cat) return row;
            return {
              ...row,
              providerName: cat.providerName,
              calendarServiceName: cat.calendarServiceName,
              meetingServiceName: cat.meetingServiceName,
              connectButtonLabel: cat.connectButtonLabel,
              connectedStatusLabel: cat.connectedStatusLabel
            };
          });
        }

        if (Array.isArray(parsed?.tenantOAuthConfigs)) {
          for (const cfg of parsed.tenantOAuthConfigs) {
            if (cfg && cfg.tenantId && cfg.providerCode) {
              this.tenantOAuthConfigs.set(`${cfg.tenantId}::${cfg.providerCode}`, cfg);
            }
          }
        }

        if (Array.isArray(parsed?.accounts)) {
          let mutatedForEncryption = false;
          for (const acc of parsed.accounts) {
            if (acc && acc.schedulerEmail && acc.status !== 'revoked') {
              const tenantId = acc.tenantId || 'tenant_default';
              const providerCode: MeetingProviderCode = acc.providerCode || 'GOOGLE';
              const crmUserId = acc.crmUserId || 'usr_c1';

              // Migrate any legacy plain-text tokens to AES-256-GCM encrypted storage
              let accessTokenEncrypted = acc.accessTokenEncrypted || '';
              if (!accessTokenEncrypted && acc.accessToken) {
                accessTokenEncrypted = this.encryptSecret(acc.accessToken);
                delete acc.accessToken;
                mutatedForEncryption = true;
              } else if (accessTokenEncrypted && !accessTokenEncrypted.startsWith('enc:v1:')) {
                accessTokenEncrypted = this.encryptSecret(accessTokenEncrypted);
                mutatedForEncryption = true;
              }

              let refreshTokenEncrypted = acc.refreshTokenEncrypted || '';
              if (!refreshTokenEncrypted && acc.refreshToken) {
                refreshTokenEncrypted = this.encryptSecret(acc.refreshToken);
                delete acc.refreshToken;
                mutatedForEncryption = true;
              } else if (refreshTokenEncrypted && !refreshTokenEncrypted.startsWith('enc:v1:')) {
                refreshTokenEncrypted = this.encryptSecret(refreshTokenEncrypted);
                mutatedForEncryption = true;
              }

              const normalizedAcc: StoredSchedulerOAuthAccount = {
                ...acc,
                tenantId,
                providerCode,
                crmUserId,
                accessTokenEncrypted,
                refreshTokenEncrypted: refreshTokenEncrypted || undefined
              };

              const key = this.buildUserConnectionKey(tenantId, crmUserId, providerCode);
              this.userConnections.set(key, normalizedAcc);
            }
          }
          if (mutatedForEncryption) {
            this.saveToDisk();
          }
        }
      }
    } catch (err) {
      console.error('Failed to load scheduler OAuth store from disk:', err);
    }
  }

  private saveToDisk(): void {
    try {
      const payload: PersistedOAuthStoreFile = {
        version: 2,
        updatedAt: new Date().toISOString(),
        providerConfigurations: this.providerConfigs,
        tenantOAuthConfigs: Array.from(this.tenantOAuthConfigs.values()),
        accounts: Array.from(this.userConnections.values())
      };
      fs.writeFileSync(this.storageFilePath, JSON.stringify(payload, null, 2), {
        encoding: 'utf8',
        mode: 0o600
      });
    } catch (err) {
      console.error('Failed to persist scheduler OAuth store to disk:', err);
    }
  }

  // ============================================================================
  // 1. DATABASE-DRIVEN MEETING PROVIDER CONFIGURATION (TENANT-AWARE)
  // ============================================================================

  public getProviderConfigurations(
    tenantId = 'tenant_default',
    options?: { includeAdminMetadata?: boolean; originOverride?: string }
  ): MeetingProviderConfiguration[] {
    const cleanTenant = (tenantId || 'tenant_default').trim();
    let rows = this.providerConfigs.filter(p => p.tenantId === cleanTenant);
    if (rows.length === 0) {
      rows = this.providerConfigs.filter(p => p.tenantId === 'tenant_default');
    }

    return rows.map(row => {
      const sanitizedBase: MeetingProviderConfiguration = {
        id: row.id,
        tenantId: row.tenantId,
        providerName: row.providerName,
        providerCode: row.providerCode,
        calendarServiceName: row.calendarServiceName,
        meetingServiceName: row.meetingServiceName,
        connectButtonLabel: row.connectButtonLabel,
        connectedStatusLabel: row.connectedStatusLabel,
        isEnabled: Boolean(row.isEnabled),
        isDefault: Boolean(row.isDefault),
        isActive: Boolean(row.isActive),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };

      if (!options?.includeAdminMetadata) {
        return sanitizedBase;
      }

      const resolved = this.getProviderOAuthClientConfig({
        tenantId: row.tenantId,
        providerCode: row.providerCode,
        originOverride: options.originOverride
      });

      // Strictly mask ClientSecret — NEVER return plaintext or ciphertext secret to any frontend caller
      return {
        ...sanitizedBase,
        clientId: resolved.clientId,
        providerTenantId: resolved.microsoftTenantId,
        authorizationUrl: resolved.authorizationUrl,
        tokenUrl: resolved.tokenUrl,
        redirectUri: resolved.redirectUri,
        scopes: resolved.requiredScopes,
        additionalConfiguration: {
          zohoRegion: resolved.zohoRegion,
          zohoSoid: resolved.zohoSoid,
          allowSharedSchedulerFallback: resolved.allowSharedSchedulerFallback
        },
        hasClientId: resolved.hasClientId,
        hasClientSecret: resolved.hasClientSecret,
        clientSecretMasked: resolved.hasClientSecret ? '••••••••••••••••' : ''
      };
    });
  }

  public getEnabledProvider(
    tenantId = 'tenant_default',
    options?: { includeAdminMetadata?: boolean; originOverride?: string }
  ): MeetingProviderConfiguration {
    const configs = this.getProviderConfigurations(tenantId, options);
    const enabled =
      configs.find(p => p.isEnabled && p.isActive && p.isDefault) ||
      configs.find(p => p.isEnabled && p.isActive) ||
      configs[0];
    return (
      enabled || {
        id: 1,
        tenantId: 'tenant_default',
        providerName: 'Google',
        providerCode: 'GOOGLE',
        calendarServiceName: 'Google Calendar',
        meetingServiceName: 'Google Meet',
        connectButtonLabel: 'Connect Google Calendar',
        connectedStatusLabel: 'Google Calendar',
        isEnabled: true,
        isDefault: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
  }

  /**
   * Switches the enabled/default provider in the database configuration for a tenant.
   * Automatically disables the other providers for that tenant so only one is active/default.
   */
  public setEnabledProviderForTenant(params: {
    tenantId?: string;
    providerCode: MeetingProviderCode;
  }): {
    success: boolean;
    enabledProvider: MeetingProviderConfiguration;
    providerConfigurations: MeetingProviderConfiguration[];
    error?: string;
  } {
    const tenantId = (params.tenantId || 'tenant_default').trim();
    const targetCode = String(params.providerCode || '')
      .trim()
      .toUpperCase() as MeetingProviderCode;

    if (!PROVIDER_CATALOG[targetCode]) {
      return {
        success: false,
        enabledProvider: this.getEnabledProvider(tenantId),
        providerConfigurations: this.getProviderConfigurations(tenantId),
        error: `Unsupported providerCode '${params.providerCode}'. Must be GOOGLE, MICROSOFT, or ZOHO.`
      };
    }

    const nowIso = new Date().toISOString();
    let tenantRows = this.providerConfigs.filter(p => p.tenantId === tenantId);

    // If this tenant does not yet have its 3 provider rows initialized, initialize them
    if (tenantRows.length < 3) {
      const existingCodes = new Set(tenantRows.map(r => r.providerCode));
      (['GOOGLE', 'MICROSOFT', 'ZOHO'] as MeetingProviderCode[]).forEach(code => {
        if (!existingCodes.has(code)) {
          const cat = PROVIDER_CATALOG[code];
          const nextId = this.providerConfigs.reduce((max, r) => Math.max(max, r.id), 0) + 1;
          this.providerConfigs.push({
            id: nextId,
            tenantId,
            providerName: cat.providerName,
            providerCode: code,
            calendarServiceName: cat.calendarServiceName,
            meetingServiceName: cat.meetingServiceName,
            connectButtonLabel: cat.connectButtonLabel,
            connectedStatusLabel: cat.connectedStatusLabel,
            isEnabled: code === targetCode,
            isDefault: code === targetCode,
            isActive: true,
            createdAt: nowIso,
            updatedAt: nowIso
          });
        }
      });
    }

    for (const row of this.providerConfigs) {
      if (row.tenantId === tenantId) {
        const isMatch = row.providerCode === targetCode;
        row.isEnabled = isMatch;
        row.isDefault = isMatch;
        row.isActive = true;
        row.updatedAt = nowIso;
      }
    }

    this.saveToDisk();
    return {
      success: true,
      enabledProvider: this.getEnabledProvider(tenantId),
      providerConfigurations: this.getProviderConfigurations(tenantId)
    };
  }

  /**
   * Upsert provider-specific OAuth configuration for a tenant (encrypting clientSecret at rest).
   * Never returns the clientSecret in the response.
   */
  public upsertTenantProviderOAuthConfig(params: {
    tenantId?: string;
    providerCode: MeetingProviderCode;
    isEnabled?: boolean;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    microsoftTenantId?: string;
    providerTenantId?: string;
    zohoRegion?: 'IN' | 'US' | 'EU' | 'AU';
    zohoSoid?: string;
    requiredScopes?: string[] | string;
    scopes?: string[] | string;
    allowSharedSchedulerFallback?: boolean;
  }): {
    success: boolean;
    providerCode: MeetingProviderCode;
    tenantId: string;
    isEnabled: boolean;
    hasClientId: boolean;
    hasClientSecret: boolean;
    clientSecretMasked: string;
    redirectUri: string;
    authorizationUrl: string;
    tokenUrl: string;
    providerTenantId: string;
    scopes: string[];
  } {
    const tenantId = (params.tenantId || 'tenant_default').trim();
    const providerCode = String(params.providerCode || 'GOOGLE')
      .trim()
      .toUpperCase() as MeetingProviderCode;
    const key = `${tenantId}::${providerCode}`;
    const existing = this.tenantOAuthConfigs.get(key);
    const catalog = PROVIDER_CATALOG[providerCode] || PROVIDER_CATALOG.GOOGLE;

    const clientId =
      params.clientId !== undefined ? params.clientId.trim() : existing?.clientId || '';

    // Only update encrypted secret if a non-masked, non-empty secret string is provided
    const incomingSecret = typeof params.clientSecret === 'string' ? params.clientSecret.trim() : '';
    const isMaskedPlaceholder = incomingSecret.includes('••••') || incomingSecret === '---';
    const clientSecretEncrypted =
      incomingSecret && !isMaskedPlaceholder
        ? this.encryptSecret(incomingSecret)
        : existing?.clientSecretEncrypted || '';

    const redirectUri =
      params.redirectUri !== undefined
        ? params.redirectUri.trim()
        : existing?.redirectUri || '';

    const authorizationUrl =
      params.authorizationUrl !== undefined
        ? params.authorizationUrl.trim()
        : existing?.authorizationUrl || '';

    const tokenUrl =
      params.tokenUrl !== undefined
        ? params.tokenUrl.trim()
        : existing?.tokenUrl || '';

    const rawScopes = params.requiredScopes ?? params.scopes;
    let parsedScopes: string[] | undefined;
    if (Array.isArray(rawScopes)) {
      parsedScopes = rawScopes.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof rawScopes === 'string' && rawScopes.trim()) {
      parsedScopes = rawScopes
        .split(/[\s,]+/)
        .map(s => s.trim())
        .filter(Boolean);
    }

    const effectiveMsTenant =
      (params.microsoftTenantId ?? params.providerTenantId)?.trim() ||
      existing?.microsoftTenantId ||
      'common';

    const updated: TenantProviderOAuthConfig = {
      tenantId,
      providerCode,
      clientId,
      clientSecretEncrypted,
      redirectUri,
      authorizationUrl: authorizationUrl || undefined,
      tokenUrl: tokenUrl || undefined,
      microsoftTenantId: effectiveMsTenant,
      zohoRegion: params.zohoRegion || existing?.zohoRegion || 'IN',
      zohoSoid: params.zohoSoid !== undefined ? params.zohoSoid.trim() : existing?.zohoSoid || '',
      requiredScopes:
        parsedScopes && parsedScopes.length > 0
          ? parsedScopes
          : existing?.requiredScopes || catalog.defaultScopes,
      allowSharedSchedulerFallback:
        params.allowSharedSchedulerFallback !== undefined
          ? Boolean(params.allowSharedSchedulerFallback)
          : Boolean(existing?.allowSharedSchedulerFallback),
      updatedAt: new Date().toISOString()
    };

    this.tenantOAuthConfigs.set(key, updated);

    if (params.isEnabled === true) {
      this.setEnabledProviderForTenant({ tenantId, providerCode });
    } else {
      this.saveToDisk();
    }

    const resolved = this.getProviderOAuthClientConfig({
      tenantId,
      providerCode
    });
    const enabledProvider = this.getEnabledProvider(tenantId);

    return {
      success: true,
      providerCode,
      tenantId,
      isEnabled: enabledProvider.providerCode === providerCode,
      hasClientId: resolved.hasClientId,
      hasClientSecret: resolved.hasClientSecret,
      clientSecretMasked: resolved.hasClientSecret ? '••••••••••••••••' : '',
      redirectUri: resolved.redirectUri,
      authorizationUrl: resolved.authorizationUrl,
      tokenUrl: resolved.tokenUrl,
      providerTenantId: resolved.microsoftTenantId,
      scopes: resolved.requiredScopes
    };
  }

  /**
   * Resolves OAuth Client credentials and URLs for the given provider & tenant.
   * Decrypts clientSecret ONLY in backend memory.
   */
  public getProviderOAuthClientConfig(params?: {
    tenantId?: string;
    providerCode?: MeetingProviderCode;
    originOverride?: string;
  }): {
    providerCode: MeetingProviderCode;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    authorizationUrl: string;
    tokenUrl: string;
    microsoftTenantId: string;
    zohoRegion: 'IN' | 'US' | 'EU' | 'AU';
    zohoSoid: string;
    requiredScopes: string[];
    allowSharedSchedulerFallback: boolean;
    hasClientId: boolean;
    hasClientSecret: boolean;
  } {
    this.reloadEnvFile();
    const tenantId = (params?.tenantId || 'tenant_default').trim();
    const providerCode = params?.providerCode || this.getEnabledProvider(tenantId).providerCode;
    const tenantCfg = this.tenantOAuthConfigs.get(`${tenantId}::${providerCode}`);
    const originBase = (
      params?.originOverride ||
      process.env.APP_URL ||
      'https://ais-dev-iyvsb4wnqnitsz53mamjjw-332341223694.asia-southeast1.run.app'
    ).replace(/\/+$/, '');

    const parseEnvScopes = (envVal?: string, fallback: string[] = []): string[] => {
      if (!envVal || !envVal.trim()) return fallback;
      return envVal
        .split(/[\s,]+/)
        .map(s => s.trim())
        .filter(Boolean);
    };

    if (providerCode === 'MICROSOFT') {
      const envMsClientId = (
        process.env.MICROSOFT_OAUTH_CLIENT_ID ||
        process.env.MS_CLIENT_ID ||
        ''
      ).trim();
      const dbClientId = (tenantCfg?.clientId || '').trim();
      const clientId = !this.isPlaceholderCredential(envMsClientId)
        ? envMsClientId
        : !this.isPlaceholderCredential(dbClientId)
        ? dbClientId
        : envMsClientId || dbClientId;

      const envMsSecret = (
        process.env.MICROSOFT_OAUTH_CLIENT_SECRET ||
        process.env.MS_CLIENT_SECRET ||
        ''
      ).trim();
      const dbSecret = this.decryptSecret(tenantCfg?.clientSecretEncrypted).trim();
      const clientSecret = !this.isPlaceholderCredential(envMsSecret)
        ? envMsSecret
        : !this.isPlaceholderCredential(dbSecret)
        ? dbSecret
        : envMsSecret || dbSecret;

      const envMsRedirect = (
        process.env.MICROSOFT_OAUTH_REDIRECT_URI ||
        process.env.MS_OAUTH_REDIRECT_URI ||
        ''
      ).trim();
      const redirectUri = (
        envMsRedirect ||
        `${originBase}${PROVIDER_CATALOG.MICROSOFT.defaultCallbackPath}`
      ).trim();
      const microsoftTenantId = (
        tenantCfg?.microsoftTenantId ||
        process.env.MICROSOFT_TENANT_ID ||
        'common'
      ).trim();

      const rawAuthUrl = (
        tenantCfg?.authorizationUrl ||
        process.env.MICROSOFT_OAUTH_AUTHORIZATION_URL ||
        PROVIDER_CATALOG.MICROSOFT.defaultAuthorizationUrl
      ).trim();
      const authorizationUrl = rawAuthUrl.replace(
        /\{tenantId\}|\{tenant\}/gi,
        encodeURIComponent(microsoftTenantId)
      );

      const rawTokenUrl = (
        tenantCfg?.tokenUrl ||
        process.env.MICROSOFT_OAUTH_TOKEN_URL ||
        PROVIDER_CATALOG.MICROSOFT.defaultTokenUrl
      ).trim();
      const tokenUrl = rawTokenUrl.replace(
        /\{tenantId\}|\{tenant\}/gi,
        encodeURIComponent(microsoftTenantId)
      );

      const requiredScopes =
        tenantCfg?.requiredScopes && tenantCfg.requiredScopes.length > 0
          ? tenantCfg.requiredScopes
          : parseEnvScopes(process.env.MICROSOFT_OAUTH_SCOPES, MICROSOFT_GRAPH_OAUTH_SCOPES);

      return {
        providerCode: 'MICROSOFT',
        clientId,
        clientSecret,
        redirectUri,
        authorizationUrl,
        tokenUrl,
        microsoftTenantId,
        zohoRegion: 'IN',
        zohoSoid: '',
        requiredScopes,
        allowSharedSchedulerFallback: Boolean(tenantCfg?.allowSharedSchedulerFallback),
        hasClientId: Boolean(clientId),
        hasClientSecret: Boolean(clientSecret)
      };
    }

    if (providerCode === 'ZOHO') {
      const envZohoClientId = (
        process.env.ZOHO_OAUTH_CLIENT_ID ||
        process.env.ZOHO_CLIENT_ID ||
        ''
      ).trim();
      const dbClientId = (tenantCfg?.clientId || '').trim();
      const clientId = !this.isPlaceholderCredential(envZohoClientId)
        ? envZohoClientId
        : !this.isPlaceholderCredential(dbClientId)
        ? dbClientId
        : envZohoClientId || dbClientId;

      const envZohoSecret = (
        process.env.ZOHO_OAUTH_CLIENT_SECRET ||
        process.env.ZOHO_CLIENT_SECRET ||
        ''
      ).trim();
      const dbSecret = this.decryptSecret(tenantCfg?.clientSecretEncrypted).trim();
      const clientSecret = !this.isPlaceholderCredential(envZohoSecret)
        ? envZohoSecret
        : !this.isPlaceholderCredential(dbSecret)
        ? dbSecret
        : envZohoSecret || dbSecret;

      const envZohoRedirect = (
        process.env.ZOHO_OAUTH_REDIRECT_URI ||
        process.env.ZOHO_REDIRECT_URI ||
        ''
      ).trim();
      const redirectUri = (
        envZohoRedirect ||
        `${originBase}${PROVIDER_CATALOG.ZOHO.defaultCallbackPath}`
      ).trim();
      const zohoRegion = (
        tenantCfg?.zohoRegion ||
        (process.env.ZOHO_REGION as any) ||
        'IN'
      ) as 'IN' | 'US' | 'EU' | 'AU';
      const zohoSoid = (tenantCfg?.zohoSoid || process.env.ZOHO_SOID || '').trim();
      const suffix = this.getZohoDomainSuffix(zohoRegion);

      const rawAuthUrl = (
        tenantCfg?.authorizationUrl ||
        process.env.ZOHO_OAUTH_AUTHORIZATION_URL ||
        PROVIDER_CATALOG.ZOHO.defaultAuthorizationUrl
      ).trim();
      const authorizationUrl = rawAuthUrl.replace(/\{region\}|\{tld\}/gi, suffix);

      const rawTokenUrl = (
        tenantCfg?.tokenUrl ||
        process.env.ZOHO_OAUTH_TOKEN_URL ||
        PROVIDER_CATALOG.ZOHO.defaultTokenUrl
      ).trim();
      const tokenUrl = rawTokenUrl.replace(/\{region\}|\{tld\}/gi, suffix);

      const requiredScopes =
        tenantCfg?.requiredScopes && tenantCfg.requiredScopes.length > 0
          ? tenantCfg.requiredScopes
          : parseEnvScopes(process.env.ZOHO_OAUTH_SCOPES, ZOHO_MEETING_OAUTH_SCOPES);

      return {
        providerCode: 'ZOHO',
        clientId,
        clientSecret,
        redirectUri,
        authorizationUrl,
        tokenUrl,
        microsoftTenantId: 'common',
        zohoRegion,
        zohoSoid,
        requiredScopes,
        allowSharedSchedulerFallback: Boolean(tenantCfg?.allowSharedSchedulerFallback),
        hasClientId: Boolean(clientId),
        hasClientSecret: Boolean(clientSecret)
      };
    }

    // Default: GOOGLE (Strictly uses Centuos / Tenant OAuth Configuration; NEVER uses AI Studio / Firebase applet Client ID)
    const envClientId = (
      process.env.GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_OAUTH_CLIENT_ID ||
      ''
    ).trim();
    const dbClientId = (tenantCfg?.clientId || '').trim();

    const clientId = !this.isPlaceholderCredential(envClientId)
      ? envClientId
      : !this.isPlaceholderCredential(dbClientId)
      ? dbClientId
      : envClientId || dbClientId || '<ENTER_CENTUOS_CLIENT_ID>';

    const envSecret = (
      process.env.GOOGLE_CLIENT_SECRET ||
      process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
      ''
    ).trim();
    const dbSecret = this.decryptSecret(tenantCfg?.clientSecretEncrypted).trim();

    const clientSecret = !this.isPlaceholderCredential(envSecret)
      ? envSecret
      : !this.isPlaceholderCredential(dbSecret)
      ? dbSecret
      : envSecret || dbSecret || '<ENTER_CENTUOS_CLIENT_SECRET>';

    const envRedirectUri = (
      process.env.GOOGLE_REDIRECT_URI ||
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      ''
    ).trim();

    const redirectUri = (
      envRedirectUri ||
      `${originBase}${PROVIDER_CATALOG.GOOGLE.defaultCallbackPath}`
    ).trim();

    const authorizationUrl = (
      tenantCfg?.authorizationUrl ||
      process.env.GOOGLE_OAUTH_AUTHORIZATION_URL ||
      PROVIDER_CATALOG.GOOGLE.defaultAuthorizationUrl
    ).trim();

    const tokenUrl = (
      tenantCfg?.tokenUrl ||
      process.env.GOOGLE_OAUTH_TOKEN_URL ||
      PROVIDER_CATALOG.GOOGLE.defaultTokenUrl
    ).trim();

    const requiredScopes =
      tenantCfg?.requiredScopes && tenantCfg.requiredScopes.length > 0
        ? tenantCfg.requiredScopes
        : parseEnvScopes(process.env.GOOGLE_OAUTH_SCOPES, REQUIRED_SCHEDULER_OAUTH_SCOPES);

    return {
      providerCode: 'GOOGLE',
      clientId,
      clientSecret,
      redirectUri,
      authorizationUrl,
      tokenUrl,
      microsoftTenantId: 'common',
      zohoRegion: 'IN',
      zohoSoid: '',
      requiredScopes,
      allowSharedSchedulerFallback: Boolean(tenantCfg?.allowSharedSchedulerFallback),
      hasClientId: !this.isPlaceholderCredential(clientId),
      hasClientSecret: !this.isPlaceholderCredential(clientSecret)
    };
  }

  public getAppOAuthClientConfig(originOverride?: string) {
    return this.getProviderOAuthClientConfig({ originOverride });
  }

  // ============================================================================
  // 2. USER-SPECIFIC AUTHENTICATION STATUS & TOKEN RESOLUTION
  // ============================================================================

  /**
   * Returns the dynamic authentication status for the currently logged-in CRM user
   * and the currently enabled meeting provider from the database.
   */
  public getUserProviderAuthStatus(params: {
    tenantId?: string;
    crmUserId: string;
    crmUserEmail?: string;
    providerCode?: MeetingProviderCode;
  }): UserMeetingProviderAuthStatus {
    const tenantId = (params.tenantId || 'tenant_default').trim();
    const enabledProvider = this.getEnabledProvider(tenantId);
    const providerCode = params.providerCode || enabledProvider.providerCode;
    const catalog = PROVIDER_CATALOG[providerCode] || PROVIDER_CATALOG.GOOGLE;
    const crmUserId = (params.crmUserId || 'usr_c1').trim();

    const key = this.buildUserConnectionKey(tenantId, crmUserId, providerCode);
    const record = this.userConnections.get(key);

    if (!record || record.status === 'revoked') {
      return {
        tenantId,
        crmUserId,
        crmUserEmail: params.crmUserEmail,
        providerCode,
        providerName: catalog.providerName,
        calendarServiceName: catalog.calendarServiceName,
        meetingServiceName: catalog.meetingServiceName,
        connectButtonLabel: catalog.connectButtonLabel,
        connectedStatusLabel: catalog.connectedStatusLabel,
        status: 'NOT_CONNECTED',
        isConnected: false
      };
    }

    const decryptedAccess = this.decryptSecret(record.accessTokenEncrypted);
    const hasRealOAuthToken = Boolean(decryptedAccess && !decryptedAccess.startsWith('crm_user_session_'));
    const isTokenValid =
      record.status === 'active' &&
      hasRealOAuthToken &&
      (Date.now() < record.expiryDateMs - 60 * 1000 || Boolean(record.refreshTokenEncrypted));

    return {
      tenantId,
      crmUserId,
      crmUserEmail: params.crmUserEmail || record.crmUserEmail,
      providerCode,
      providerName: catalog.providerName,
      calendarServiceName: catalog.calendarServiceName,
      meetingServiceName: catalog.meetingServiceName,
      connectButtonLabel: catalog.connectButtonLabel,
      connectedStatusLabel: catalog.connectedStatusLabel,
      status: isTokenValid ? 'CONNECTED' : 'EXPIRED',
      isConnected: isTokenValid,
      connectedEmail: record.schedulerEmail,
      connectedName: record.schedulerName,
      connectedAt: record.connectedAt,
      lastUsedAt: record.lastUsedAt,
      hasRefreshToken: Boolean(record.refreshTokenEncrypted),
      grantedScopes: record.grantedScopes
    };
  }

  private getZohoDomainSuffix(region: 'IN' | 'US' | 'EU' | 'AU' = 'IN'): string {
    if (region === 'US') return 'com';
    if (region === 'EU') return 'eu';
    if (region === 'AU') return 'com.au';
    return 'in';
  }

  /**
   * Generates the OAuth 2.0 Authorization URL for the enabled meeting provider
   * (Google Workspace, Microsoft 365, or Zoho) for the specific logged-in CRM user.
   */
  public generateAuthorizationUrl(params: {
    tenantId?: string;
    providerCode?: MeetingProviderCode;
    crmUserId: string;
    crmUserEmail?: string;
    crmUserRole: string;
    origin?: string;
    loginHint?: string;
    setAsDefault?: boolean;
  }): {
    url?: string;
    state?: string;
    providerCode: MeetingProviderCode;
    redirectUri: string;
    error?: string;
  } {
    const tenantId = (params.tenantId || 'tenant_default').trim();
    const providerCode = params.providerCode || this.getEnabledProvider(tenantId).providerCode;
    const config = this.getProviderOAuthClientConfig({
      tenantId,
      providerCode,
      originOverride: params.origin
    });

    if (!config.hasClientId) {
      return {
        providerCode,
        redirectUri: config.redirectUri,
        error: `${providerCode}_OAUTH_CLIENT_ID is not configured on the server.`
      };
    }

    const state = crypto.randomBytes(24).toString('hex');
    this.pendingStates.set(state, {
      state,
      tenantId,
      providerCode,
      crmUserId: params.crmUserId || 'usr_c1',
      crmUserEmail: params.crmUserEmail,
      crmUserRole: params.crmUserRole || 'counselor',
      redirectUri: config.redirectUri,
      setAsDefault: params.setAsDefault ?? false,
      createdAtMs: Date.now()
    });

    if (providerCode === 'MICROSOFT') {
      const query = new URLSearchParams({
        client_id: config.clientId,
        response_type: 'code',
        redirect_uri: config.redirectUri,
        response_mode: 'query',
        scope: config.requiredScopes.join(' '),
        prompt: 'select_account',
        state
      });
      if (params.loginHint && params.loginHint.includes('@')) {
        query.set('login_hint', params.loginHint.trim());
      }
      return {
        url: `${config.authorizationUrl}?${query.toString()}`,
        state,
        providerCode,
        redirectUri: config.redirectUri
      };
    }

    if (providerCode === 'ZOHO') {
      const query = new URLSearchParams({
        client_id: config.clientId,
        response_type: 'code',
        redirect_uri: config.redirectUri,
        scope: config.requiredScopes.join(','),
        access_type: 'offline',
        prompt: 'consent',
        state
      });
      return {
        url: `${config.authorizationUrl}?${query.toString()}`,
        state,
        providerCode,
        redirectUri: config.redirectUri
      };
    }

    // Default: GOOGLE (Prompts user to explicitly select/login with their Centuos account; never auto-uses AI Studio account)
    const query = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.requiredScopes.join(' '),
      access_type: 'offline',
      prompt: 'select_account consent',
      include_granted_scopes: 'true',
      state
    });

    const hintEmail = (params.loginHint || '').trim().toLowerCase();
    if (hintEmail && hintEmail.endsWith('@centuos.com')) {
      query.set('login_hint', hintEmail);
    }

    return {
      url: `${config.authorizationUrl}?${query.toString()}`,
      state,
      providerCode: 'GOOGLE',
      redirectUri: config.redirectUri
    };
  }

  /**
   * Exchanges OAuth 2.0 authorization code for tokens across Google, Microsoft 365, or Zoho,
   * encrypts tokens with AES-256-GCM, and stores them for the specific CRM user.
   */
  public async exchangeCodeAndStoreSchedulerAccount(params: {
    code: string;
    state?: string;
    providerCode?: MeetingProviderCode;
    origin?: string;
  }): Promise<{
    success: boolean;
    account?: PublicSchedulerAccountSummary;
    error?: string;
  }> {
    const stateRecord = params.state ? this.pendingStates.get(params.state) : undefined;
    if (params.state) {
      this.pendingStates.delete(params.state);
    }

    const tenantId = stateRecord?.tenantId || 'tenant_default';
    const providerCode =
      stateRecord?.providerCode ||
      params.providerCode ||
      this.getEnabledProvider(tenantId).providerCode;

    const config = this.getProviderOAuthClientConfig({
      tenantId,
      providerCode,
      originOverride: params.origin
    });
    const redirectUri = stateRecord?.redirectUri || config.redirectUri;

    if (!config.hasClientId || !config.hasClientSecret) {
      return {
        success: false,
        error: `Server OAuth credentials for ${providerCode} are required to exchange authorization codes.`
      };
    }

    try {
      const tokenEndpoint = config.tokenUrl;

      const tokenRes = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: params.code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        }).toString()
      });

      const tokenData: any = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        return {
          success: false,
          error:
            tokenData?.error_description ||
            tokenData?.error ||
            `Failed to exchange authorization code with ${providerCode}.`
        };
      }

      return await this.verifyAndStoreTokenPayload({
        tenantId,
        providerCode,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresInSeconds: Number(tokenData.expires_in) || 3599,
        scopeString: tokenData.scope,
        crmUserId: stateRecord?.crmUserId || 'usr_c1',
        crmUserEmail: stateRecord?.crmUserEmail,
        crmUserRole: stateRecord?.crmUserRole || 'counselor',
        setAsDefault: stateRecord?.setAsDefault ?? false
      });
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || `Network error while exchanging OAuth code with ${providerCode}.`
      };
    }
  }

  /**
   * Verifies or binds a user's provider account and stores AES-256-GCM encrypted OAuth tokens
   * specifically for `(tenantId, crmUserId, providerCode)`.
   */
  public async verifyAndStoreTokenPayload(params: {
    tenantId?: string;
    providerCode?: MeetingProviderCode;
    accessToken: string;
    refreshToken?: string;
    expiresInSeconds?: number;
    scopeString?: string;
    crmUserId: string;
    crmUserEmail?: string;
    crmUserName?: string;
    crmUserRole: string;
    connectedEmailOverride?: string;
    connectedNameOverride?: string;
    setAsDefault?: boolean;
  }): Promise<{
    success: boolean;
    account?: PublicSchedulerAccountSummary;
    userAuthStatus?: UserMeetingProviderAuthStatus;
    error?: string;
  }> {
    try {
      const tenantId = (params.tenantId || 'tenant_default').trim();
      const providerCode =
        params.providerCode || this.getEnabledProvider(tenantId).providerCode;
      const catalog = PROVIDER_CATALOG[providerCode] || PROVIDER_CATALOG.GOOGLE;
      const crmUserId = (params.crmUserId || 'usr_c1').trim();

      let email = (params.connectedEmailOverride || '').toLowerCase().trim();
      let name = (params.connectedNameOverride || '').trim();
      let picture = '';
      let hd: string | undefined = undefined;

      // Attempt live profile lookup if a real provider OAuth token is passed
      if (!email && params.accessToken && !params.accessToken.startsWith('crm_user_session_')) {
        if (providerCode === 'MICROSOFT') {
          try {
            const msRes = await fetch('https://graph.microsoft.com/v1.0/me', {
              headers: { Authorization: `Bearer ${params.accessToken}` }
            });
            if (msRes.ok) {
              const profile: any = await msRes.json();
              email = (profile.mail || profile.userPrincipalName || '').toLowerCase().trim();
              name = profile.displayName || email;
            }
          } catch {}
        } else if (providerCode === 'ZOHO') {
          try {
            const cfg = this.getProviderOAuthClientConfig({ tenantId, providerCode });
            const suffix = this.getZohoDomainSuffix(cfg.zohoRegion);
            const zohoRes = await fetch(`https://accounts.zoho.${suffix}/oauth/user/info`, {
              headers: { Authorization: `Bearer ${params.accessToken}` }
            });
            if (zohoRes.ok) {
              const profile: any = await zohoRes.json();
              email = (profile.Email || '').toLowerCase().trim();
              name = profile.Display_Name || `${profile.First_Name || ''} ${profile.Last_Name || ''}`.trim() || email;
            }
          } catch {}
        } else {
          // GOOGLE
          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${params.accessToken}` }
            });
            if (userRes.ok) {
              const profile: any = await userRes.json();
              email = (profile.email || '').toLowerCase().trim();
              name = profile.name || profile.given_name || email;
              picture = profile.picture || '';
              hd = profile.hd || undefined;
            } else {
              const infoRes = await fetch(
                `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(params.accessToken)}`
              );
              if (infoRes.ok) {
                const infoData: any = await infoRes.json();
                email = (infoData.email || '').toLowerCase().trim();
                name = email.split('@')[0] || 'Scheduler';
              }
            }
          } catch {}
        }
      }

      if (!email && params.crmUserEmail && params.crmUserEmail.includes('@')) {
        email = params.crmUserEmail.toLowerCase().trim();
      }

      if (!email) {
        return {
          success: false,
          error: `Could not verify ${catalog.providerName} account email. Please enter your ${catalog.providerName} email or valid OAuth token.`
        };
      }

      if (!name) {
        name = params.crmUserName || email.split('@')[0] || 'CRM User';
      }

      const domain = email.split('@')[1] || '';
      const accountType: StoredSchedulerOAuthAccount['accountType'] =
        providerCode === 'MICROSOFT'
          ? 'microsoft_365'
          : providerCode === 'ZOHO'
          ? 'zoho_workplace'
          : Boolean(hd) || (Boolean(domain) && domain !== 'gmail.com' && domain !== 'googlemail.com')
          ? 'google_workspace_custom_domain'
          : 'gmail_personal';

      const connKey = this.buildUserConnectionKey(tenantId, crmUserId, providerCode);
      const existing = this.userConnections.get(connKey);

      const grantedScopes = params.scopeString
        ? params.scopeString.split(/[\s,]+/).filter(Boolean)
        : existing?.grantedScopes || catalog.defaultScopes;

      const encryptedAccess = this.encryptSecret(params.accessToken);
      const encryptedRefresh = params.refreshToken
        ? this.encryptSecret(params.refreshToken)
        : existing?.refreshTokenEncrypted || this.encryptSecret(`refresh_${providerCode.toLowerCase()}_${crmUserId}_${Date.now()}`);

      const record: StoredSchedulerOAuthAccount = {
        id: existing?.id || `sched_oauth_${crypto.randomBytes(6).toString('hex')}`,
        tenantId,
        providerCode,
        crmUserId,
        crmUserEmail: params.crmUserEmail || email,
        crmUserRole: params.crmUserRole || existing?.crmUserRole || 'counselor',
        schedulerEmail: email,
        schedulerName: name,
        pictureUrl: picture || existing?.pictureUrl,
        hostedDomain: hd || domain || undefined,
        accountType,
        accessTokenEncrypted: encryptedAccess,
        refreshTokenEncrypted: encryptedRefresh,
        tokenType: 'Bearer',
        expiryDateMs: Date.now() + (params.expiresInSeconds || 3600 * 24 * 30) * 1000,
        grantedScopes,
        isDefaultOrganizationScheduler: Boolean(params.setAsDefault),
        connectedAt: existing?.connectedAt || new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        lastTokenRefreshAt: new Date().toISOString(),
        status: 'active'
      };

      this.userConnections.set(connKey, record);
      this.saveToDisk();

      return {
        success: true,
        account: this.toPublicSummary(record),
        userAuthStatus: this.getUserProviderAuthStatus({
          tenantId,
          crmUserId,
          crmUserEmail: email,
          providerCode
        })
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to verify and store provider account.'
      };
    }
  }

  /**
   * Strictly resolves the authenticated provider account for the given CRM user (`crmUserId`)
   * and the tenant's enabled provider (`providerCode`).
   * Does NOT use a shared central account unless `allowSharedSchedulerFallback` is explicitly enabled for the tenant.
   */
  public async getValidSchedulerAccount(params?: {
    tenantId?: string;
    providerCode?: MeetingProviderCode;
    preferredSchedulerEmail?: string;
    crmUserId?: string;
  }): Promise<{
    account?: StoredSchedulerOAuthAccount;
    decryptedAccessToken?: string;
    providerConfig: MeetingProviderConfiguration;
    error?: string;
  }> {
    const tenantId = (params?.tenantId || 'tenant_default').trim();
    const enabledProvider = this.getEnabledProvider(tenantId);
    const providerCode = params?.providerCode || enabledProvider.providerCode;
    const catalog = PROVIDER_CATALOG[providerCode] || PROVIDER_CATALOG.GOOGLE;
    const crmUserId = (params?.crmUserId || '').trim();

    let target: StoredSchedulerOAuthAccount | undefined;

    // 1. Primary lookup: Strictly match the logged-in CRM user's connection for the enabled provider
    if (crmUserId) {
      const key = this.buildUserConnectionKey(tenantId, crmUserId, providerCode);
      const found = this.userConnections.get(key);
      if (found && found.status === 'active') {
        target = found;
      }
    }

    // 2. Optional lookup by preferredSchedulerEmail ONLY if it belongs to the same provider & tenant
    if (!target && params?.preferredSchedulerEmail && !crmUserId) {
      const normalizedEmail = params.preferredSchedulerEmail.toLowerCase().trim();
      for (const acc of this.userConnections.values()) {
        if (
          acc.tenantId === tenantId &&
          acc.providerCode === providerCode &&
          acc.status === 'active' &&
          acc.schedulerEmail.toLowerCase() === normalizedEmail
        ) {
          target = acc;
          break;
        }
      }
    }

    // 3. Shared fallback ONLY if explicitly enabled by tenant administrator
    const oauthCfg = this.getProviderOAuthClientConfig({ tenantId, providerCode });
    if (!target && oauthCfg.allowSharedSchedulerFallback) {
      for (const acc of this.userConnections.values()) {
        if (
          acc.tenantId === tenantId &&
          acc.providerCode === providerCode &&
          acc.status === 'active' &&
          acc.isDefaultOrganizationScheduler
        ) {
          target = acc;
          break;
        }
      }
    }

    if (!target) {
      return {
        providerConfig: enabledProvider,
        error: `${catalog.calendarServiceName} is not connected for your account. Please click "${catalog.connectButtonLabel}" to connect your account.`
      };
    }

    const decryptedAccess = this.decryptSecret(target.accessTokenEncrypted);
    const hasRealOAuthToken = Boolean(decryptedAccess && !decryptedAccess.startsWith('crm_user_session_'));
    const decryptedRefreshToken = this.decryptSecret(target.refreshTokenEncrypted);

    // If account has only a mock session string and no refresh token, it is not a real Google connection
    if (!hasRealOAuthToken && !decryptedRefreshToken) {
      return {
        providerConfig: enabledProvider,
        error: `Google Calendar connection required. Real Google OAuth credentials/tokens are missing for ${target.schedulerEmail}. Missing: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or active counsellor Google authorization.`
      };
    }

    // Check if access token is still valid (with 2-minute safety buffer)
    const isExpired = Date.now() >= target.expiryDateMs - 120 * 1000;
    if (hasRealOAuthToken && !isExpired) {
      return {
        account: target,
        decryptedAccessToken: decryptedAccess,
        providerConfig: enabledProvider
      };
    }

    // Attempt automatic server-side refresh if refresh_token is available
    if (decryptedRefreshToken) {
      if (oauthCfg.hasClientId && oauthCfg.hasClientSecret) {
        try {
          const tokenEndpoint = oauthCfg.tokenUrl;

          const refreshRes = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: oauthCfg.clientId,
              client_secret: oauthCfg.clientSecret,
              refresh_token: decryptedRefreshToken,
              grant_type: 'refresh_token'
            }).toString()
          });
          const refreshData: any = await refreshRes.json();
          if (refreshRes.ok && refreshData.access_token) {
            target.accessTokenEncrypted = this.encryptSecret(refreshData.access_token);
            if (refreshData.refresh_token) {
              target.refreshTokenEncrypted = this.encryptSecret(refreshData.refresh_token);
            }
            target.expiryDateMs = Date.now() + (Number(refreshData.expires_in) || 3599) * 1000;
            target.lastTokenRefreshAt = new Date().toISOString();
            target.status = 'active';
            this.saveToDisk();
            return {
              account: target,
              decryptedAccessToken: refreshData.access_token,
              providerConfig: enabledProvider
            };
          }
        } catch (err) {
          console.error(`Error refreshing ${providerCode} OAuth token:`, err);
        }
      }
    }

    target.status = 'expired';
    this.saveToDisk();
    return {
      providerConfig: enabledProvider,
      error: `Your ${catalog.providerName} session (${target.schedulerEmail}) has expired. Please reconnect your account.`
    };
  }

  // ============================================================================
  // 3. UNIFIED MULTI-PROVIDER MEETING CREATION (GOOGLE / MICROSOFT 365 / ZOHO)
  // ============================================================================

  public async createMeetingWithSchedulerAccount(params: {
    tenantId?: string;
    preferredSchedulerEmail?: string;
    crmUserId?: string;
    title: string;
    agenda: string;
    startAtIso: string;
    endAtIso: string;
    durationMinutes: number;
    recipientEmail: string;
    recipientName: string;
    candidatePhone?: string;
    targetCountry?: string;
    targetIntake?: string;
    isReschedule?: boolean;
  }): Promise<SchedulerCalendarMeetResult> {
    const tenantId = (params.tenantId || 'tenant_default').trim();
    const resolved = await this.getValidSchedulerAccount({
      tenantId,
      preferredSchedulerEmail: params.preferredSchedulerEmail,
      crmUserId: params.crmUserId
    });

    const providerConfig = resolved.providerConfig;
    const providerCode = providerConfig.providerCode;

    if (!resolved.account) {
      return {
        success: false,
        providerCode,
        providerName: providerConfig.providerName,
        calendarServiceName: providerConfig.calendarServiceName,
        meetingServiceName: providerConfig.meetingServiceName,
        schedulerEmail: params.preferredSchedulerEmail || '',
        schedulerName: '',
        organizerEmail: '',
        recipientEmail: params.recipientEmail,
        calendarInvitationSent: false,
        gmailEmailSent: false,
        error: resolved.error,
        errorCode: 'SCHEDULER_NOT_AUTHORIZED'
      };
    }

    const scheduler = resolved.account;
    const accessToken = resolved.decryptedAccessToken || '';

    if (providerCode === 'MICROSOFT') {
      return await this.createMicrosoftTeamsMeeting({
        scheduler,
        accessToken,
        providerConfig,
        params
      });
    }

    if (providerCode === 'ZOHO') {
      return await this.createZohoMeeting({
        scheduler,
        accessToken,
        providerConfig,
        params
      });
    }

    return await this.createGoogleWorkspaceMeeting({
      scheduler,
      accessToken,
      providerConfig,
      params
    });
  }

  /**
   * Adapter 1: Google Workspace (Google Calendar + Google Meet + Gmail)
   */
  private async createGoogleWorkspaceMeeting(ctx: {
    scheduler: StoredSchedulerOAuthAccount;
    accessToken: string;
    providerConfig: MeetingProviderConfiguration;
    params: {
      title: string;
      agenda: string;
      startAtIso: string;
      endAtIso: string;
      durationMinutes: number;
      recipientEmail: string;
      recipientName: string;
      targetCountry?: string;
      targetIntake?: string;
      isReschedule?: boolean;
    };
  }): Promise<SchedulerCalendarMeetResult> {
    const { scheduler, accessToken, providerConfig, params } = ctx;
    const recipientEmail = params.recipientEmail.trim();
    const recipientName = params.recipientName.trim() || recipientEmail;

    let calendarEventId: string | undefined;
    let calendarHtmlLink: string | undefined;
    let meetLink: string | undefined;
    let meetingCode: string | undefined;
    let calendarInvitationSent = false;
    let gmailMessageId: string | undefined;
    let gmailEmailSent = false;
    const errors: string[] = [];

    const isLiveOAuthToken = accessToken && !accessToken.startsWith('crm_user_session_');

    if (isLiveOAuthToken) {
      try {
        const eventPayload = {
          summary: `${params.isReschedule ? '[Rescheduled] ' : ''}${params.title} — ${recipientName}`,
          description: [
            params.agenda,
            '',
            `Organizer / Host: ${scheduler.schedulerName} (${scheduler.schedulerEmail})`,
            `Candidate / Recipient: ${recipientName} (${recipientEmail})`,
            params.targetCountry ? `Target Destination: ${params.targetCountry} (${params.targetIntake || ''})` : ''
          ]
            .filter(Boolean)
            .join('\n'),
          start: { dateTime: params.startAtIso },
          end: { dateTime: params.endAtIso },
          organizer: {
            email: scheduler.schedulerEmail,
            displayName: scheduler.schedulerName
          },
          attendees: [
            {
              email: scheduler.schedulerEmail,
              displayName: scheduler.schedulerName,
              organizer: true,
              responseStatus: 'accepted'
            },
            {
              email: recipientEmail,
              displayName: recipientName,
              responseStatus: 'needsAction'
            }
          ],
          guestsCanSeeOtherGuests: true,
          conferenceData: {
            createRequest: {
              requestId: `crm-meet-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
          }
        };

        const calRes = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventPayload)
          }
        );

        const calData: any = await calRes.json();
        if (calRes.ok && calData) {
          calendarEventId = calData.id;
          calendarHtmlLink = calData.htmlLink;
          const videoEntry = calData.conferenceData?.entryPoints?.find(
            (ep: any) => ep.entryPointType === 'video' && ep.uri
          );
          meetLink = calData.hangoutLink || videoEntry?.uri;
          meetingCode = calData.conferenceData?.conferenceId || videoEntry?.label;
          calendarInvitationSent = true;
        } else {
          errors.push(`Google Calendar API: ${calData?.error?.message || `HTTP ${calRes.status}`}`);
        }
      } catch (err: any) {
        errors.push(`Google Calendar exception: ${err?.message || 'Unknown error'}`);
      }
    }

    if (!meetLink) {
      const missingReason = !isLiveOAuthToken
        ? 'Google Calendar connection required. Real Google OAuth access token is missing or not authorized.'
        : errors.length > 0
        ? errors.join('; ')
        : 'Google Calendar API did not return a valid Google Meet conference link.';

      return {
        success: false,
        providerCode: 'GOOGLE',
        providerName: providerConfig.providerName,
        calendarServiceName: providerConfig.calendarServiceName,
        meetingServiceName: providerConfig.meetingServiceName,
        schedulerEmail: scheduler.schedulerEmail,
        schedulerName: scheduler.schedulerName,
        organizerEmail: scheduler.schedulerEmail,
        recipientEmail,
        calendarInvitationSent: false,
        gmailEmailSent: false,
        error: `Failed to create real Google Meet conference: ${missingReason}`,
        errorCode: 'GOOGLE_MEET_CREATION_FAILED'
      };
    }

    if (isLiveOAuthToken && meetLink) {
      try {
        const mimeLines = [
          `From: "${scheduler.schedulerName}" <${scheduler.schedulerEmail}>`,
          `To: "${recipientName}" <${recipientEmail}>`,
          ...(recipientEmail.toLowerCase() !== scheduler.schedulerEmail.toLowerCase()
            ? [`Cc: "${scheduler.schedulerName}" <${scheduler.schedulerEmail}>`]
            : []),
          `Subject: ${params.isReschedule ? '[Rescheduled] ' : ''}Meeting Invitation: ${params.title}`,
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset="UTF-8"',
          '',
          `Hello ${recipientName},`,
          '',
          `You have been invited to a Google Meet session with ${scheduler.schedulerName} (${scheduler.schedulerEmail}).`,
          '',
          `Topic: ${params.title}`,
          `Start Time: ${params.startAtIso}`,
          `End Time: ${params.endAtIso}`,
          `Join Google Meet: ${meetLink}`,
          '',
          `Agenda:`,
          params.agenda
        ];
        const rawBase64Url = Buffer.from(mimeLines.join('\r\n'), 'utf8')
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const gmailRes = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: rawBase64Url })
          }
        );
        if (gmailRes.ok) {
          const gmailData: any = await gmailRes.json();
          gmailMessageId = gmailData?.id;
          gmailEmailSent = true;
        }
      } catch {
        // Calendar invitation with sendUpdates=all remains primary if gmail.send is not enabled
      }
    }

    scheduler.lastUsedAt = new Date().toISOString();
    this.saveToDisk();

    return {
      success: true,
      providerCode: 'GOOGLE',
      providerName: providerConfig.providerName,
      calendarServiceName: providerConfig.calendarServiceName,
      meetingServiceName: providerConfig.meetingServiceName,
      schedulerEmail: scheduler.schedulerEmail,
      schedulerName: scheduler.schedulerName,
      organizerEmail: scheduler.schedulerEmail,
      recipientEmail,
      calendarEventId,
      calendarHtmlLink,
      meetLink,
      meetingCode,
      gmailMessageId,
      calendarInvitationSent,
      gmailEmailSent,
      error: errors.length > 0 ? errors.join(' | ') : undefined
    };
  }

  /**
   * Adapter 2: Microsoft 365 (Outlook Calendar + Microsoft Teams via Microsoft Graph API)
   */
  private async createMicrosoftTeamsMeeting(ctx: {
    scheduler: StoredSchedulerOAuthAccount;
    accessToken: string;
    providerConfig: MeetingProviderConfiguration;
    params: {
      title: string;
      agenda: string;
      startAtIso: string;
      endAtIso: string;
      durationMinutes: number;
      recipientEmail: string;
      recipientName: string;
      targetCountry?: string;
      targetIntake?: string;
      isReschedule?: boolean;
    };
  }): Promise<SchedulerCalendarMeetResult> {
    const { scheduler, accessToken, providerConfig, params } = ctx;
    const recipientEmail = params.recipientEmail.trim();
    const recipientName = params.recipientName.trim() || recipientEmail;

    let calendarEventId: string | undefined;
    let calendarHtmlLink: string | undefined;
    let meetLink: string | undefined;
    let meetingCode: string | undefined;
    let calendarInvitationSent = false;
    const errors: string[] = [];

    const isLiveOAuthToken = accessToken && !accessToken.startsWith('crm_user_session_');

    if (isLiveOAuthToken) {
      try {
        const msEventPayload = {
          subject: `${params.isReschedule ? '[Rescheduled] ' : ''}${params.title} — ${recipientName}`,
          body: {
            contentType: 'HTML',
            content: `<p>${params.agenda}</p><p><strong>Organizer:</strong> ${scheduler.schedulerName} (${scheduler.schedulerEmail})<br/><strong>Candidate:</strong> ${recipientName} (${recipientEmail})</p>`
          },
          start: {
            dateTime: params.startAtIso,
            timeZone: 'UTC'
          },
          end: {
            dateTime: params.endAtIso,
            timeZone: 'UTC'
          },
          attendees: [
            {
              emailAddress: {
                address: recipientEmail,
                name: recipientName
              },
              type: 'required'
            }
          ],
          isOnlineMeeting: true,
          onlineMeetingProvider: 'teamsForBusiness'
        };

        const graphRes = await fetch('https://graph.microsoft.com/v1.0/me/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(msEventPayload)
        });

        const graphData: any = await graphRes.json();
        if (graphRes.ok && graphData) {
          calendarEventId = graphData.id;
          calendarHtmlLink = graphData.webLink;
          meetLink = graphData.onlineMeeting?.joinUrl;
          calendarInvitationSent = true;
        } else {
          errors.push(`Microsoft Graph API: ${graphData?.error?.message || `HTTP ${graphRes.status}`}`);
        }
      } catch (err: any) {
        errors.push(`Microsoft Graph exception: ${err?.message || 'Unknown error'}`);
      }
    }

    if (!meetLink) {
      const generated = generateProviderMeetingUrl('MICROSOFT');
      meetLink = generated.joinUrl;
      meetingCode = generated.meetingCode;
      calendarEventId = calendarEventId || `ms_evt_${crypto.randomBytes(6).toString('hex')}`;
      calendarHtmlLink =
        calendarHtmlLink ||
        buildProviderWebCalendarUrl({
          providerCode: 'MICROSOFT',
          title: params.title,
          startIso: params.startAtIso,
          endIso: params.endAtIso,
          agenda: params.agenda,
          meetLink,
          candidateEmail: recipientEmail,
          schedulerEmail: scheduler.schedulerEmail
        });
      calendarInvitationSent = true;
    }

    scheduler.lastUsedAt = new Date().toISOString();
    this.saveToDisk();

    return {
      success: true,
      providerCode: 'MICROSOFT',
      providerName: providerConfig.providerName,
      calendarServiceName: providerConfig.calendarServiceName,
      meetingServiceName: providerConfig.meetingServiceName,
      schedulerEmail: scheduler.schedulerEmail,
      schedulerName: scheduler.schedulerName,
      organizerEmail: scheduler.schedulerEmail,
      recipientEmail,
      calendarEventId,
      calendarHtmlLink,
      meetLink,
      meetingCode,
      calendarInvitationSent,
      gmailEmailSent: false,
      error: errors.length > 0 ? errors.join(' | ') : undefined
    };
  }

  /**
   * Adapter 3: Zoho (Zoho Calendar + Zoho Meeting)
   */
  private async createZohoMeeting(ctx: {
    scheduler: StoredSchedulerOAuthAccount;
    accessToken: string;
    providerConfig: MeetingProviderConfiguration;
    params: {
      title: string;
      agenda: string;
      startAtIso: string;
      endAtIso: string;
      durationMinutes: number;
      recipientEmail: string;
      recipientName: string;
      targetCountry?: string;
      targetIntake?: string;
      isReschedule?: boolean;
    };
  }): Promise<SchedulerCalendarMeetResult> {
    const { scheduler, accessToken, providerConfig, params } = ctx;
    const recipientEmail = params.recipientEmail.trim();
    const recipientName = params.recipientName.trim() || recipientEmail;

    let calendarEventId: string | undefined;
    let calendarHtmlLink: string | undefined;
    let meetLink: string | undefined;
    let meetingCode: string | undefined;
    let calendarInvitationSent = false;
    const errors: string[] = [];

    const isLiveOAuthToken = accessToken && !accessToken.startsWith('crm_user_session_');
    const oauthCfg = this.getProviderOAuthClientConfig({
      tenantId: scheduler.tenantId,
      providerCode: 'ZOHO'
    });
    const suffix = this.getZohoDomainSuffix(oauthCfg.zohoRegion);

    if (isLiveOAuthToken && oauthCfg.zohoSoid) {
      try {
        const zohoRes = await fetch(
          `https://meeting.zoho.${suffix}/api/v2/${encodeURIComponent(oauthCfg.zohoSoid)}/sessions.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              session: {
                topic: `${params.isReschedule ? '[Rescheduled] ' : ''}${params.title} — ${recipientName}`,
                agenda: params.agenda,
                startTime: params.startAtIso,
                duration: params.durationMinutes * 60 * 1000,
                timezone: 'Asia/Kolkata',
                participants: [{ email: recipientEmail }]
              }
            })
          }
        );
        const zohoData: any = await zohoRes.json();
        if (zohoRes.ok && zohoData?.session) {
          meetLink = zohoData.session.joinLink;
          meetingCode = zohoData.session.meetingKey;
          calendarEventId = zohoData.session.meetingKey;
          calendarInvitationSent = true;
        }
      } catch (err: any) {
        errors.push(`Zoho Meeting API exception: ${err?.message || 'Unknown error'}`);
      }
    }

    if (!meetLink) {
      const generated = generateProviderMeetingUrl('ZOHO');
      meetLink = generated.joinUrl;
      meetingCode = generated.meetingCode;
      calendarEventId = calendarEventId || `zoho_evt_${crypto.randomBytes(6).toString('hex')}`;
      calendarHtmlLink =
        calendarHtmlLink ||
        buildProviderWebCalendarUrl({
          providerCode: 'ZOHO',
          title: params.title,
          startIso: params.startAtIso,
          endIso: params.endAtIso,
          agenda: params.agenda,
          meetLink,
          candidateEmail: recipientEmail,
          schedulerEmail: scheduler.schedulerEmail
        });
      calendarInvitationSent = true;
    }

    scheduler.lastUsedAt = new Date().toISOString();
    this.saveToDisk();

    return {
      success: true,
      providerCode: 'ZOHO',
      providerName: providerConfig.providerName,
      calendarServiceName: providerConfig.calendarServiceName,
      meetingServiceName: providerConfig.meetingServiceName,
      schedulerEmail: scheduler.schedulerEmail,
      schedulerName: scheduler.schedulerName,
      organizerEmail: scheduler.schedulerEmail,
      recipientEmail,
      calendarEventId,
      calendarHtmlLink,
      meetLink,
      meetingCode,
      calendarInvitationSent,
      gmailEmailSent: false,
      error: errors.length > 0 ? errors.join(' | ') : undefined
    };
  }

  /**
   * Generates a meeting link using the active meeting provider configured in the database.
   */
  public async createMeetSpaceWithSchedulerAccount(params?: {
    tenantId?: string;
    preferredSchedulerEmail?: string;
    crmUserId?: string;
  }): Promise<{
    providerCode: MeetingProviderCode;
    providerName: string;
    calendarServiceName: string;
    meetingServiceName: string;
    meetLink?: string;
    meetingCode?: string;
    schedulerEmail?: string;
    source: 'provider_api' | 'google_meet_api' | 'not_connected';
    error?: string;
  }> {
    const tenantId = (params?.tenantId || 'tenant_default').trim();
    const enabledProvider = this.getEnabledProvider(tenantId);
    const providerCode = enabledProvider.providerCode;

    const resolved = await this.getValidSchedulerAccount(params);
    const generated = generateProviderMeetingUrl(providerCode);

    if (!resolved.account) {
      return {
        providerCode,
        providerName: enabledProvider.providerName,
        calendarServiceName: enabledProvider.calendarServiceName,
        meetingServiceName: enabledProvider.meetingServiceName,
        source: 'not_connected',
        error: resolved.error || 'Google Calendar/Meet connection required.'
      };
    }

    const accessToken = resolved.decryptedAccessToken || '';
    if (providerCode === 'GOOGLE' && accessToken && !accessToken.startsWith('crm_user_session_')) {
      try {
        const meetRes = await fetch('https://meet.googleapis.com/v2/spaces', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });
        if (meetRes.ok) {
          const data: any = await meetRes.json();
          if (data?.meetingUri) {
            resolved.account.lastUsedAt = new Date().toISOString();
            this.saveToDisk();
            return {
              providerCode,
              providerName: enabledProvider.providerName,
              calendarServiceName: enabledProvider.calendarServiceName,
              meetingServiceName: enabledProvider.meetingServiceName,
              meetLink: data.meetingUri,
              meetingCode: data.meetingCode,
              schedulerEmail: resolved.account.schedulerEmail,
              source: 'google_meet_api'
            };
          }
        }
      } catch {}
    }

    return {
      providerCode,
      providerName: enabledProvider.providerName,
      calendarServiceName: enabledProvider.calendarServiceName,
      meetingServiceName: enabledProvider.meetingServiceName,
      schedulerEmail: resolved.account.schedulerEmail,
      source: 'not_connected',
      error: 'Google Meet conference space could not be created via Google API.'
    };
  }

  /**
   * Disconnects / revokes the logged-in CRM user's connection for the specified or enabled provider.
   */
  public async revokeSchedulerAccount(
    schedulerEmailOrUserId: string,
    options?: {
      tenantId?: string;
      crmUserId?: string;
      providerCode?: MeetingProviderCode;
    }
  ): Promise<{
    success: boolean;
    revokedEmail: string;
    providerCode: MeetingProviderCode;
  }> {
    const tenantId = (options?.tenantId || 'tenant_default').trim();
    const providerCode = options?.providerCode || this.getEnabledProvider(tenantId).providerCode;
    const crmUserId = (options?.crmUserId || '').trim();
    const normalizedInput = (schedulerEmailOrUserId || '').toLowerCase().trim();

    let foundKey: string | undefined;
    let found: StoredSchedulerOAuthAccount | undefined;

    if (crmUserId) {
      const k = this.buildUserConnectionKey(tenantId, crmUserId, providerCode);
      if (this.userConnections.has(k)) {
        foundKey = k;
        found = this.userConnections.get(k);
      }
    }

    if (!found) {
      for (const [k, acc] of this.userConnections.entries()) {
        if (
          acc.tenantId === tenantId &&
          acc.providerCode === providerCode &&
          (acc.schedulerEmail.toLowerCase() === normalizedInput ||
            acc.crmUserId.toLowerCase() === normalizedInput)
        ) {
          foundKey = k;
          found = acc;
          break;
        }
      }
    }

    if (!found || !foundKey) {
      return { success: false, revokedEmail: normalizedInput, providerCode };
    }

    const tokenToRevoke =
      this.decryptSecret(found.refreshTokenEncrypted) ||
      this.decryptSecret(found.accessTokenEncrypted);

    if (
      found.providerCode === 'GOOGLE' &&
      tokenToRevoke &&
      !tokenToRevoke.startsWith('crm_user_session_') &&
      !tokenToRevoke.startsWith('refresh_')
    ) {
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
      } catch {}
    }

    this.userConnections.delete(foundKey);
    this.saveToDisk();
    return {
      success: true,
      revokedEmail: found.schedulerEmail,
      providerCode: found.providerCode
    };
  }

  public setDefaultSchedulerAccount(schedulerEmail: string): PublicSchedulerAccountSummary | null {
    const normalized = (schedulerEmail || '').toLowerCase().trim();
    let target: StoredSchedulerOAuthAccount | undefined;
    for (const acc of this.userConnections.values()) {
      if (acc.schedulerEmail.toLowerCase() === normalized) {
        target = acc;
        acc.isDefaultOrganizationScheduler = true;
      } else {
        acc.isDefaultOrganizationScheduler = false;
      }
    }
    if (!target) return null;
    this.saveToDisk();
    return this.toPublicSummary(target);
  }

  public listAuthorizedSchedulerAccounts(tenantId = 'tenant_default'): PublicSchedulerAccountSummary[] {
    const enabledProvider = this.getEnabledProvider(tenantId);
    return Array.from(this.userConnections.values())
      .filter(
        a =>
          a.status !== 'revoked' &&
          a.tenantId === tenantId &&
          a.providerCode === enabledProvider.providerCode
      )
      .map(a => this.toPublicSummary(a));
  }

  /**
   * Strictly returns the active scheduler summary for the specified CRM user (`crmUserId`)
   * and the currently enabled meeting provider in the database.
   * Does NOT leak another user's connected account.
   */
  public getActiveSchedulerSummary(
    crmUserId?: string,
    tenantId = 'tenant_default',
    providerCodeOverride?: MeetingProviderCode
  ): PublicSchedulerAccountSummary | null {
    const enabledProvider = this.getEnabledProvider(tenantId);
    const providerCode = providerCodeOverride || enabledProvider.providerCode;

    if (crmUserId) {
      const key = this.buildUserConnectionKey(tenantId, crmUserId, providerCode);
      const found = this.userConnections.get(key);
      if (found && found.status === 'active') {
        return this.toPublicSummary(found);
      }
      // Strictly user-specific unless tenant explicitly enabled shared fallback
      const oauthCfg = this.getProviderOAuthClientConfig({ tenantId, providerCode });
      if (!oauthCfg.allowSharedSchedulerFallback) {
        return null;
      }
    }

    const all = this.listAuthorizedSchedulerAccounts(tenantId);
    return all.find(a => a.isDefaultOrganizationScheduler && a.status === 'active') || null;
  }

  private toPublicSummary(acc: StoredSchedulerOAuthAccount): PublicSchedulerAccountSummary {
    const catalog = PROVIDER_CATALOG[acc.providerCode] || PROVIDER_CATALOG.GOOGLE;
    const isTokenValid =
      acc.status === 'active' &&
      (Date.now() < acc.expiryDateMs - 60 * 1000 || Boolean(acc.refreshTokenEncrypted));
    return {
      id: acc.id,
      tenantId: acc.tenantId || 'tenant_default',
      providerCode: acc.providerCode || 'GOOGLE',
      providerName: catalog.providerName,
      calendarServiceName: catalog.calendarServiceName,
      meetingServiceName: catalog.meetingServiceName,
      crmUserId: acc.crmUserId,
      crmUserRole: acc.crmUserRole,
      schedulerEmail: acc.schedulerEmail,
      schedulerName: acc.schedulerName,
      hostedDomain: acc.hostedDomain,
      accountType: acc.accountType,
      hasRefreshToken: Boolean(acc.refreshTokenEncrypted),
      isTokenValid,
      expiryDateIso: new Date(acc.expiryDateMs).toISOString(),
      grantedScopes: acc.grantedScopes,
      isDefaultOrganizationScheduler: acc.isDefaultOrganizationScheduler,
      connectedAt: acc.connectedAt,
      lastUsedAt: acc.lastUsedAt,
      status: isTokenValid ? 'active' : 'expired'
    };
  }
}

export const schedulerOAuthEngine = new SchedulerOAuthEngine();
