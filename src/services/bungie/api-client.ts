// Bungie API Client - DIM-Grade Implementation
// Handles all HTTP requests to the Bungie.net API with authentication, rate limiting, and resilience

import { BUNGIE_CONFIG } from '../../config/bungie.config';
import { db } from '../db/indexeddb.service';
import { debugLog, warnLog, errorLog, infoLog } from '../../utils/logger';
import { useAuthStore, useToastStore } from '../../store';

interface RequestConfig {
  method?: 'GET' | 'POST';
  body?: unknown;
  requiresAuth?: boolean;
  skipRetry?: boolean;
  /** Priority level for rate limiting (lower = higher priority) */
  priority?: number;
}

interface ApiResponse<T> {
  Response: T;
  ErrorCode: number;
  ThrottleSeconds: number;
  ErrorStatus: string;
  Message: string;
  MessageData: Record<string, string>;
}

// DIM-Aligned Platform Error Codes
export const PlatformErrorCodes = {
  Success: 1,
  // Authentication Errors
  AccessTokenHasExpired: 99,
  WebAuthRequired: 1618,
  WebAuthModuleAsyncFailed: 1619,
  AuthorizationRecordRevoked: 1627,
  AuthorizationRecordExpired: 1628,
  AuthorizationCodeStale: 1629,
  AuthorizationCodeInvalid: 1630,
  // Throttle Errors
  ThrottleLimitExceededMinutes: 31,
  ThrottleLimitExceededMomentarily: 32,
  ThrottleLimitExceededSeconds: 33,
  DestinyThrottledByGameServer: 1672,
  PerApplicationThrottleExceeded: 51,
  PerApplicationAnonymousThrottleExceeded: 52,
  PerApplicationAuthenticatedThrottleExceeded: 53,
  PerUserThrottleExceeded: 54,
  // Item Operation Errors
  DestinyNoRoomInDestination: 1622,
  DestinyItemNotFound: 1623,
  DestinyUniquenessViolation: 1648,
  DestinyItemUnequippable: 1642,
  DestinyCannotPerformActionOnEquippedItem: 1641,
  DestinyItemAlreadyEquipped: 1640,
  ActionOnlyInGame: 1663,
  DestinySocketActionNotAllowed: 1678,
  DestinyCannotPerformActionAtThisLocation: 1618,
  DestinyCharacterNotInTower: 1634,
  // System Errors
  SystemDisabled: 5,
  DestinyUnexpectedError: 1,
} as const;

// Auth error codes that indicate we need to refresh or re-login
const AUTH_ERROR_CODES: Set<number> = new Set([
  PlatformErrorCodes.AccessTokenHasExpired,
  PlatformErrorCodes.WebAuthRequired,
  PlatformErrorCodes.WebAuthModuleAsyncFailed,
  PlatformErrorCodes.AuthorizationRecordRevoked,
  PlatformErrorCodes.AuthorizationRecordExpired,
  PlatformErrorCodes.AuthorizationCodeStale,
  PlatformErrorCodes.AuthorizationCodeInvalid,
]);

// Throttle error codes for exponential backoff
const THROTTLE_ERROR_CODES: Set<number> = new Set([
  PlatformErrorCodes.ThrottleLimitExceededMinutes,
  PlatformErrorCodes.ThrottleLimitExceededMomentarily,
  PlatformErrorCodes.ThrottleLimitExceededSeconds,
  PlatformErrorCodes.DestinyThrottledByGameServer,
  PlatformErrorCodes.PerApplicationThrottleExceeded,
  PlatformErrorCodes.PerApplicationAnonymousThrottleExceeded,
  PlatformErrorCodes.PerApplicationAuthenticatedThrottleExceeded,
  PlatformErrorCodes.PerUserThrottleExceeded,
]);

// Enhanced Rate Limiter with priority queue and DIM-style timing
class RateLimitQueue {
  private lastPromise: Promise<unknown> = Promise.resolve();
  private lastRequestTimeByEndpoint: Map<string, number> = new Map();
  private lastGlobalRequestTime = 0;
  private depth = 0;

  private readonly intervals: Record<string, number> = {
    'TransferItem': 100,
    'EquipItem': 100,
    'EquipItems': 100,
    'PullFromPostmaster': 100,
    'InsertSocketPlug': 500,
    'InsertSocketPlugFree': 500,
    'SnapshotLoadout': 1000,
    'SetLockState': 100,
    'default': 50
  };

  private getInterval(endpoint: string): number {
    for (const [key, value] of Object.entries(this.intervals)) {
      if (endpoint.includes(key)) return value;
    }
    return this.intervals.default;
  }

  async add<T>(requestFn: () => Promise<T>, endpoint: string): Promise<T> {
    this.depth++;
    // DIM Standard: Ensure the next operation waits for the previous one completely
    const wrappedFn = async (): Promise<T> => {
      // 1. Device Reliability: Acquire screen wake lock if available
      let sentinel: any = undefined;
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        try { sentinel = await (navigator as any).wakeLock.request('screen'); } catch { }
      }

      try {
        // 2. DIM Throttling: Enforce settle intervals
        const now = Date.now();
        const endpointKey = Object.keys(this.intervals).find(k => endpoint.includes(k)) || 'default';
        const endpointLastTime = this.lastRequestTimeByEndpoint.get(endpointKey) || 0;

        // Global gap between ANY requests (DIM standard is 50ms)
        const globalWait = Math.max(0, 50 - (now - this.lastGlobalRequestTime));
        // Endpoint-specific gap (e.g. 100ms for moves, 500ms for sockets)
        const endpointWait = Math.max(0, this.getInterval(endpoint) - (now - endpointLastTime));
        const waitTime = Math.max(globalWait, endpointWait);

        if (waitTime > 0) await new Promise(r => setTimeout(r, waitTime));

        // 3. Execution
        const result = await requestFn();

        // 4. Update Timestamps
        const requestTime = Date.now();
        this.lastGlobalRequestTime = requestTime;
        this.lastRequestTimeByEndpoint.set(endpointKey, requestTime);

        return result;
      } finally {
        this.depth--;
        // 5. Cleanup
        if (sentinel) await sentinel.release();
      }
    };

    // Chain the promise to the last one (Absolute Sequential Integrity)
    const nextPromise = this.lastPromise.then(wrappedFn, wrappedFn);
    this.lastPromise = nextPromise;
    return nextPromise as Promise<T>;
  }

  getQueueDepth(): number {
    return this.depth;
  }
}

class BungieApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private limiter = new RateLimitQueue();
  private onMaintenance: ((isMaintenance: boolean) => void) | null = null;

  // Exponential backoff state (DIM-style with healing)
  private timesThrottled = 0;
  private lastThrottleTime = 0;
  private readonly MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes max
  private readonly THROTTLE_HEAL_INTERVAL = 30000; // Heal every 30 seconds of success

  private async getHeaders(requiresAuth: boolean): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'X-API-Key': BUNGIE_CONFIG.apiKey,
      'Content-Type': 'application/json',
    };

    if (requiresAuth) {
      const tokens = await db.getAuthTokens();
      if (tokens) {
        // Check token expiration with 60 second buffer
        if (tokens.expiresAt < Date.now() + 60000) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            const newTokens = await db.getAuthTokens();
            if (newTokens) {
              headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
            }
          }
          headers['Authorization'] = `Bearer ${tokens.accessToken}`;
        } else {
          headers['Authorization'] = `Bearer ${tokens.accessToken}`;
        }
        // Auth header attached - no token logging for security
      }
    }

    return headers;
  }

  private async applyThrottleBackoff(): Promise<void> {
    // Heal throttle count over time (DIM pattern)
    const timeSinceLastThrottle = Date.now() - this.lastThrottleTime;
    if (timeSinceLastThrottle > this.THROTTLE_HEAL_INTERVAL && this.timesThrottled > 0) {
      this.timesThrottled = Math.max(0, this.timesThrottled - 1);
    }

    if (this.timesThrottled > 0) {
      // Exponential backoff: 500ms, 1s, 2s, 4s, 8s... up to 5 minutes
      const waitTime = Math.min(this.MAX_BACKOFF_MS, Math.pow(2, this.timesThrottled) * 500);

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { method = 'GET', body, requiresAuth = false, skipRetry = false } = config;

    return this.limiter.add(async () => {
      let retryCount = 0;
      const effectiveSkipRetry = skipRetry || (config as any)._skipRetryInternal;

      while (true) {
        // Apply throttle backoff before each attempt
        await this.applyThrottleBackoff();

        const url = `${BUNGIE_CONFIG.apiBase}${endpoint}`;
        const headers = await this.getHeaders(requiresAuth);

        if (method === 'POST') {
          infoLog('API', `→ ${method} ${endpoint}`);
        } else {
          debugLog('API', `→ ${method} ${endpoint}`);
        }

        const slowApiTimeout = setTimeout(() => {
          useToastStore.getState().addToast({
            type: 'warning',
            message: 'Bungie API is slow. ExoEngine is still waiting for a response...',
            duration: 10000
          });
        }, 15000);

        try {
          const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            credentials: 'omit',
          });
          clearTimeout(slowApiTimeout);

          // DIM Standard: Handle HTTP transient errors (502-526)
          // Note: We DO NOT retry 500 errors for state-changing operations (Transfer, Socketing)
          // because Bungie often returns 500 for legitimate game conditions (like full inventory)
          // and retrying can cause race conditions or desync in our space-making logic.
          const isStateChanging = endpoint.includes('TransferItem') ||
            endpoint.includes('InsertSocketPlug') ||
            endpoint.includes('EquipItem');

          if (response.status >= 502 && response.status <= 526 && !effectiveSkipRetry && retryCount < 3) {
            const delay = 1000 * Math.pow(2, retryCount);
            warnLog('API', `Transient network error (${response.status}) at ${endpoint}. Retrying in ${delay}ms...`, { retryCount });
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            continue;
          }

          // Handle HTTP 500 specially: Only retry if it's NOT a state-changing operation
          // OR if it's a known transient Bungie error code (handled below in ErrorCode check)
          if (response.status === 500 && !isStateChanging && !effectiveSkipRetry && retryCount < 2) {
            const delay = 1000 * Math.pow(2, retryCount);
            warnLog('API', `Server error (500) at ${endpoint}. Retrying in ${delay}ms...`, { retryCount });
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            continue;
          }

          // Handle HTTP 429 (Rate Limited)
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
            infoLog('API', `Rate limited (429). Retrying after ${retryAfter}s...`);
            this.timesThrottled++;
            this.lastThrottleTime = Date.now();
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            // Loop for retry if allowed
            if (effectiveSkipRetry) throw new Error('Rate limited and skipRetry is set');
            continue;
          }

          // DIM Standard: If response is not OK, we try to parse it as JSON first to get Bungie Error Codes
          let data: ApiResponse<T>;
          try {
            data = await response.json();
          } catch (e) {
            // Non-JSON response (e.g. raw 500 error that wasn't caught above or Cloudflare error)
            if (response.status >= 500) {
              const apiError = new BungieApiError('Bungie server error', -1, 'HttpError', endpoint, response.status);
              if (isStateChanging) {
                apiError.isPotentialSuccess = true;
              }
              throw apiError;
            }
            throw e;
          }

          // Handle Bungie-specific errors
          if (data.ErrorCode !== PlatformErrorCodes.Success) {
            // DIM-grade: Identify transient vs hard failures
            // Bungie Error 1 (UnexpectedError) and 1672 (DestinyThrottledByGameServer) are transient
            // We allow retries for these even on state-changing operations if they come with a 500 status
            const isTransientError = data.ErrorCode === PlatformErrorCodes.DestinyUnexpectedError ||
              data.ErrorCode === PlatformErrorCodes.DestinyThrottledByGameServer;

            if (isTransientError && !effectiveSkipRetry && retryCount < 3) {
              const delay = 1000 * Math.pow(2, retryCount);
              warnLog('API', `Transient Bungie error (${data.ErrorCode}) at ${endpoint}. Retrying in ${delay}ms...`, { retryCount });
              await new Promise(resolve => setTimeout(resolve, delay));
              retryCount++;
              continue;
            }

            // Log full error details - use debugLog for transient errors to keep console clean
            const logFn = response.status === 500 || data.ErrorCode === PlatformErrorCodes.DestinyItemNotFound ? debugLog : errorLog;
            logFn('API', 'Full error response:', {
              endpoint,
              errorCode: data.ErrorCode,
              errorStatus: data.ErrorStatus,
              message: data.Message,
              messageData: data.MessageData,
              throttleSeconds: data.ThrottleSeconds
            });

            // Check for throttle errors - apply exponential backoff
            if (THROTTLE_ERROR_CODES.has(data.ErrorCode)) {
              this.timesThrottled++;
              this.lastThrottleTime = Date.now();
              const waitTime = data.ThrottleSeconds > 0 ? data.ThrottleSeconds * 1000 : 5000;
              warnLog('API', `Bungie throttle (${data.ErrorCode}). Waiting ${waitTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              if (effectiveSkipRetry) throw new BungieApiError(data.Message, data.ErrorCode, data.ErrorStatus, endpoint, response.status);
              continue; // Re-attempt after throttle wait
            }

            // Check for maintenance - trigger handler but do NOT clear auth
            if (data.ErrorCode === PlatformErrorCodes.SystemDisabled) {
              const { isMaintenance } = useAuthStore.getState();
              if (!isMaintenance) {
                warnLog('API', 'Bungie API Maintenance Detected (SystemDisabled)');
                if (this.onMaintenance) this.onMaintenance(true);
              }
              // If we reached here, it's a hard Bungie error
              throw new BungieApiError(data.Message, data.ErrorCode, data.ErrorStatus, endpoint, response.status);
            }

            // Check for auth errors - try refresh
            if (AUTH_ERROR_CODES.has(data.ErrorCode) && !effectiveSkipRetry && requiresAuth) {

              const refreshed = await this.refreshAccessToken();
              if (refreshed) {
                // If token refreshed, try one more time immediately
                // We set a flag to avoid infinite loops
                (config as any)._skipRetryInternal = true;
                continue;
              }
            }

            // Handle "already contains plug" as success
            if (data.ErrorCode === 1671 || data.ErrorCode === 1679) {
              return data.Response as T;
            }

            // Log specific error details for debugging
            if (data.ErrorCode === PlatformErrorCodes.DestinyUniquenessViolation) {
              errorLog('API', 'Uniqueness violation: Multiple exotics in equip request');
            } else if (data.ErrorCode === PlatformErrorCodes.DestinyNoRoomInDestination) {
              warnLog('API', 'No room in destination bucket');
            }

            throw new BungieApiError(
              data.Message || 'Unknown Bungie API error',
              data.ErrorCode,
              data.ErrorStatus,
              endpoint
            );
          }

          // Success - heal throttle count quickly (DIM pattern)
          if (this.timesThrottled > 0) {
            this.timesThrottled = Math.floor(this.timesThrottled / 2);
          }

          return data.Response;
        } catch (error) {
          if (error instanceof BungieApiError) throw error;

          // DIM-aligned: Check for TypeError (network failure)
          // These should NOT trigger auth clearing - it's just a network hiccup
          if (error instanceof TypeError && !effectiveSkipRetry && retryCount < 2) {
            warnLog('API', 'Network failure, retrying...', { endpoint, retryCount });
            await new Promise(resolve => setTimeout(resolve, 1000));
            retryCount++;
            continue;
          }

          // Handle other network/timeout errors
          throw new BungieApiError(
            error instanceof Error ? error.message : 'Request failed',
            -1,
            'NetworkError',
            endpoint
          );
        }
      }
    }, endpoint);
  }

  async get<T>(endpoint: string, requiresAuth = false, priority = 5): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', requiresAuth, priority });
  }

  async post<T>(endpoint: string, body: unknown, requiresAuth = false, priority = 5): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, requiresAuth, priority });
  }

  // OAuth Authorization URL with state protection
  async getAuthorizationUrl(): Promise<string> {
    const state = crypto.randomUUID ? crypto.randomUUID() :
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    infoLog('Auth', 'Generating OAuth state', { state, origin: window.location.origin });

    try {
      await db.saveOAuthState(state);
      // Double-check save succeeded
      const verified = await db.getOAuthState();
      if (verified === state) {
        infoLog('Auth', 'OAuth state successfully persisted to DB', { state });
      } else {
        warnLog('Auth', 'OAuth state verification failed! Data was not found after save.', { expected: state, actual: verified });
      }
    } catch (err) {
      errorLog('Auth', 'Failed to save OAuth state to DB!', err);
    }

    const params = new URLSearchParams({
      client_id: BUNGIE_CONFIG.clientId,
      response_type: 'code',
      redirect_uri: BUNGIE_CONFIG.redirectUri,
      state: state,
      // CRITICAL: Request offline access to get a refresh token
      // Without this, Bungie only returns a short-lived access token
      access_type: 'offline'
    });

    return `${BUNGIE_CONFIG.authorizationUrl}?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async exchangeCode(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    membershipId: string;
  }> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: BUNGIE_CONFIG.clientId,
      redirect_uri: BUNGIE_CONFIG.redirectUri,
    });

    const response = await fetch(BUNGIE_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-API-Key': BUNGIE_CONFIG.apiKey,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BungieApiError(`Failed to exchange code: ${error}`, 0, 'AuthError', 'token');
    }

    const data = await response.json();

    // Validate that we received a refresh token (required for long-term auth)
    if (!data.refresh_token) {
      warnLog('API', 'Initial auth did not include refresh_token - sessions will be short-lived');
    }

    const tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
      expiresIn: data.expires_in,
      membershipId: data.membership_id,
    };

    await db.setAuthTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
      membershipId: tokens.membershipId,
    });

    return tokens;
  }

  // Refresh access token with DIM-aligned resilience
  async refreshAccessToken(): Promise<boolean> {
    // Prevent concurrent refresh attempts (promise lock pattern)
    if (this.isRefreshing) {
      return this.refreshPromise || Promise.resolve(false);
    }

    this.isRefreshing = true;
    this.refreshPromise = this.doRefreshToken();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async doRefreshToken(): Promise<boolean> {
    const tokens = await db.getAuthTokens();
    if (!tokens?.refreshToken) {
      errorLog('API', 'No refresh token available - User must re-authenticate');
      // Force auth clear to ensure UI updates
      await this.triggerAuthFailure();
      return false;
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        client_id: BUNGIE_CONFIG.clientId,
        redirect_uri: BUNGIE_CONFIG.redirectUri,
      });

      const response = await fetch(BUNGIE_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-API-Key': BUNGIE_CONFIG.apiKey,
        },
        body: body.toString(),
      });

      if (!response.ok) {
        // Try to parse error response for more context
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch { }

        // DIM-aligned: Check for specific refresh errors
        if (errorData?.error === 'server_error') {
          const desc = errorData.error_description;
          if (desc === 'SystemDisabled') {
            warnLog('API', 'Bungie API maintenance detected. Preserving tokens.');
            throw new Error('Bungie API is under maintenance');
          }
          // Fatal refresh errors - must re-authenticate
          if (['RefreshTokenNotYetValid', 'AccessTokenHasExpired', 'AuthorizationCodeInvalid',
            'AuthorizationRecordExpired', 'AuthorizationRecordRevoked', 'AuthorizationCodeStale'].includes(desc)) {
            errorLog('API', `Fatal refresh error: ${desc}. Clearing auth.`);
            await this.triggerAuthFailure();
            return false;
          }
        }

        // Check HTTP status for auth failures
        if (response.status === 401 || response.status === 403) {
          errorLog('API', 'Refresh token rejected (401/403). Clearing auth.');
          await this.triggerAuthFailure();
          return false;
        }

        // DIM-CRITICAL: Transient server errors (502, 503, 504, 500) should NOT clear auth
        // These are Bungie's fault, not ours - preserve tokens for retry
        if (response.status >= 500) {
          warnLog('API', `Bungie server error during refresh (${response.status}). Preserving tokens.`);
          throw new Error(`Bungie API transient error: ${response.status}`);
        }

        // For other 4xx errors (except 401/403), log but don't clear immediately
        errorLog('API', 'Token refresh failed with status:', response.status);
        // Only clear auth on definitive client-side failures
        if (response.status >= 400 && response.status < 500) {
          await this.triggerAuthFailure();
        }
        return false;
      }

      const data = await response.json();

      // DIM-CRITICAL: Bungie may NOT return a new refresh_token during refresh.
      // We MUST preserve the existing refresh token if a new one isn't provided!
      const currentTokens = await db.getAuthTokens();
      const newRefreshToken = data.refresh_token || currentTokens?.refreshToken;

      if (!newRefreshToken) {
        errorLog('API', 'No refresh token available after refresh. Auth will fail.');
      }

      await db.setAuthTokens({
        accessToken: data.access_token,
        refreshToken: newRefreshToken || '',
        expiresAt: Date.now() + data.expires_in * 1000,
        membershipId: data.membership_id,
      });

      return true;
    } catch (error) {
      // DIM-CRITICAL: TypeError = network failure, do NOT clear auth
      if (error instanceof TypeError) {
        warnLog('API', 'Network error during token refresh. Preserving tokens for retry.', error);
        throw error; // Re-throw but don't clear auth
      }

      // For other errors, log but don't necessarily clear
      errorLog('API', 'Token refresh error:', error);

      // Only clear auth for definitive auth failures, not transient errors
      if (error instanceof Error && error.message.includes('maintenance')) {
        throw error; // Don't clear auth during maintenance
      }

      await this.triggerAuthFailure();
      return false;
    }
  }

  // Maintenance Handling
  setMaintenanceHandler(handler: (isMaintenance: boolean) => void) {
    this.onMaintenance = handler;
  }

  // Auth Failure Callback Handling
  private onAuthFailure: (() => void) | null = null;

  setAuthFailureHandler(handler: () => void) {
    this.onAuthFailure = handler;
  }

  private async triggerAuthFailure() {
    warnLog('API', 'Triggering global auth failure handler');
    await db.clearAuth();
    if (this.onAuthFailure) {
      this.onAuthFailure();
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const tokens = await db.getAuthTokens();
    if (!tokens) return false;

    // If token is expired but we have refresh token, try to refresh
    if (tokens.expiresAt < Date.now()) {
      return this.refreshAccessToken();
    }

    return true;
  }

  // Logout
  async logout(): Promise<void> {
    await db.clearAuth();
    this.timesThrottled = 0; // Reset throttle state
  }

  // Get current membership ID
  async getMembershipId(): Promise<string | null> {
    const tokens = await db.getAuthTokens();
    return tokens?.membershipId || null;
  }

  // Get current throttle state (for UI feedback)
  getThrottleState(): { level: number; queueDepth: number } {
    return {
      level: this.timesThrottled,
      queueDepth: this.limiter.getQueueDepth()
    };
  }

  // Cloud Sync: User Application Data (DIM Parity)
  // NOTE: Bungie does not actually provide a public 'UserApplicationData' endpoint for 3rd parties.
  // DIM uses its own backend for this. We'll return empty to prevent 404s.
  async getUserApplicationData(): Promise<Record<string, any>> {
    return {};
  }

  async setUserApplicationData(_data: Record<string, any>): Promise<boolean> {
    // No-op to prevent 404s.
    return true;
  }
}

// Custom error class with enhanced context
export class BungieApiError extends Error {
  public errorCode: number;
  public errorStatus: string;
  public endpoint: string;
  public httpStatus: number;
  public isPotentialSuccess: boolean = false;

  constructor(message: string, errorCode: number, errorStatus: string, endpoint: string = '', httpStatus: number = 0) {
    // DIM Standard: Professional, helpful error messages
    let userMessage = message;
    if (errorCode === PlatformErrorCodes.ActionOnlyInGame ||
      errorCode === PlatformErrorCodes.DestinyCannotPerformActionAtThisLocation ||
      errorCode === PlatformErrorCodes.DestinyCharacterNotInTower) {
      userMessage = "This action requires you to be logged into Destiny 2 and in Orbit or a Social Space. If you're in an activity or offline, please return to Orbit to continue.";
    } else if (errorCode === PlatformErrorCodes.DestinyNoRoomInDestination) {
      userMessage = "Not enough room in the destination bucket. Try moving some items aside first.";
    } else if (errorCode === PlatformErrorCodes.DestinyUniquenessViolation) {
      userMessage = "You can only equip one piece of exotic armor and one exotic weapon at a time.";
    } else if (errorCode === PlatformErrorCodes.ThrottleLimitExceededSeconds) {
      userMessage = "You're moving items too fast! Bungie is slowing us down. Waiting a few seconds...";
    } else if (errorCode === PlatformErrorCodes.SystemDisabled) {
      userMessage = "Bungie's servers are currently undergoing maintenance. Most API features are temporarily unavailable.";
    }

    super(userMessage);
    this.errorCode = errorCode;
    this.errorStatus = errorStatus;
    this.endpoint = endpoint;
    this.httpStatus = httpStatus;
    this.name = 'BungieApiError';

    // DIM Standard: Log specific endpoint and error for precise tracing
    debugLog('API', `Bungie Error [${errorCode}] at ${endpoint}: ${message}`);
  }

  // Helper to check if this is a specific error type
  isNoRoomError(): boolean {
    return this.errorCode === PlatformErrorCodes.DestinyNoRoomInDestination;
  }

  isAuthError(): boolean {
    return AUTH_ERROR_CODES.has(this.errorCode);
  }

  isThrottleError(): boolean {
    return THROTTLE_ERROR_CODES.has(this.errorCode) || this.errorCode === -1;
  }

  isNetworkError(): boolean {
    return this.errorStatus === 'NetworkError';
  }
}

// Export singleton instance
export const bungieApi = new BungieApiClient();
