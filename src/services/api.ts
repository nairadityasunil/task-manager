import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { showGlobalToast } from '@/context/ToastContext';
import { startGlobalLoading, stopGlobalLoading } from '@/context/LoadingContext';
import { isAgentForbidden, normalizeApiError } from '@/utils/apiError';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const baseURL = API_BASE_URL;

/**
 * Sign-in lives in HttpOnly cookies set by the API, so no script here ever sees a token. Every request sends
 * them (withCredentials), and X-Auth-Mode keeps tokens out of the API's JSON answers.
 */
const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Auth-Mode': 'cookie'
  }
});

/** Browser storage used before cookies: removed on load so an old token never lingers. */
const LEGACY_AUTH_KEYS = ['todo_token', 'todo_refresh_token'];
export const readLegacyRefreshToken = (): string | null =>
  localStorage.getItem('todo_refresh_token') ?? sessionStorage.getItem('todo_refresh_token');
export const purgeLegacyTokens = (): void => {
  for (const key of LEGACY_AUTH_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Don't show the global progress bar for this request (e.g. background polling). */
    silent?: boolean;
    /** On a 401, report it as is: no token refresh, no redirect to the login page (used when the page loads). */
    noAuthRetry?: boolean;
  }
}

// Requests currently counted by the global progress bar.
const trackedRequests = new WeakSet<object>();

const finishTracking = (config: InternalAxiosRequestConfig | undefined) => {
  if (config && trackedRequests.has(config)) {
    trackedRequests.delete(config);
    stopGlobalLoading();
  }
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!config.silent && !trackedRequests.has(config)) {
    trackedRequests.add(config);
    startGlobalLoading();
  }

  return config;
});

interface FailedRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(null);
    }
  });
  failedQueue = [];
};

interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const isAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/verify-2fa') ||
    url.includes('/auth/companion-login') ||
    url.includes('/companion/pair/qr')
  );
};

/** Forget the signed-in profile kept for a fast first paint (it holds no secrets). */
const clearAuthStorage = () => {
  for (const key of ['todo_user', 'todo_session', 'todo_remember_me', 'todo_signed_in']) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
  purgeLegacyTokens();
};

/** Asks the API to renew the cookies. Resolves true when the session continues. */
export const refreshSessionCookies = async (): Promise<boolean> => {
  try {
    await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true, headers: { 'X-Auth-Mode': 'cookie' } });
    return true;
  } catch {
    return false;
  }
};

/** Fired when the API says this session's agent is suspended or revoked. */
export const SESSION_BLOCKED_EVENT = 'pristine:session-blocked';

api.interceptors.response.use(
  (response) => {
    finishTracking(response.config);
    // An agent's change held for a person's approval (HTTP 202): nothing changed yet, so callers must not treat it
    // as done. Say so once (pages that also report the error share the dedupe key) and reject.
    const held = response.data as { error?: string; message?: string } | undefined;
    if (response.status === 202 && held?.error === 'approval_required') {
      const message = held.message || 'Sent for approval. It runs once a person approves it.';
      // Stays on screen: the form it came from is still open, and the outcome must not be missed.
      showGlobalToast({ variant: 'info', message: `Sent for approval, not done yet. ${message}`, dedupeKey: `error:${message.trim()}`, sticky: true });
      return Promise.reject(new AxiosError(message, 'APPROVAL_REQUIRED', response.config, response.request, response));
    }
    return response;
  },
  async (error: AxiosError) => {
    finishTracking(error.config);
    const originalRequest = error.config as CustomRequestConfig | undefined;
    const normalizedError = normalizeApiError(error);

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.noAuthRetry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const renewed = await refreshSessionCookies();
        if (renewed) {
          processQueue(null);
          return api(originalRequest);
        }
        processQueue(error);
        clearAuthStorage();
        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // Background requests (polling, optional widgets) handle their own
    // failures quietly. The key matches the one pages use for the same
    // message, so a page that also reports the error shows it once.
    // Pages that load governance data explain an automated-browser refusal
    // themselves; refused actions are still reported.
    const explainedByPage = isAgentForbidden(error) && originalRequest?.method?.toLowerCase() === 'get';
    // This session's agent was suspended or revoked: every request is refused. One page-wide notice says so
    // (see SessionBlockedNotice) instead of an error for each request.
    const blocked = (error.response?.data as { error?: string } | undefined)?.error === 'agent_blocked';
    if (blocked) {
      window.dispatchEvent(new CustomEvent(SESSION_BLOCKED_EVENT, { detail: normalizedError.message }));
    } else if (!originalRequest?.silent && !explainedByPage) {
      showGlobalToast({
        variant: 'error',
        message: normalizedError.message,
        dedupeKey: `error:${normalizedError.message.trim()}`,
        // A change an agent session may not make: keep it visible while the form stays open.
        sticky: isAgentForbidden(error)
      });
    }

    // Reject with the axios error itself (callers read response.data), its
    // message replaced by the server's so it can be shown as is.
    error.message = normalizedError.message;
    return Promise.reject(error);
  }
);


export default api;
