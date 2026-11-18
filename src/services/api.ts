import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { showGlobalToast } from '@/context/ToastContext';
import { startGlobalLoading, stopGlobalLoading } from '@/context/LoadingContext';
import { isAgentForbidden, normalizeApiError } from '@/utils/apiError';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';
const baseURL = API_BASE_URL;
const TOKEN_STORAGE_KEY = 'todo_token';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Don't show the global progress bar for this request (e.g. background polling). */
    silent?: boolean;
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

  const token = localStorage.getItem(TOKEN_STORAGE_KEY) ?? sessionStorage.getItem(TOKEN_STORAGE_KEY);

  // Keep an explicit Authorization header, e.g. verifying a fresh sign-in
  // token while an older session is still in storage.
  if (token && config.headers && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

interface FailedRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
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
    url.includes('/admin/auth/') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/verify-2fa') ||
    url.includes('/auth/companion-login') ||
    url.includes('/companion/pair/qr')
  );
};

const readStoredToken = (key: string): string | null => localStorage.getItem(key) ?? sessionStorage.getItem(key);

const bearerOf = (config: InternalAxiosRequestConfig): string | null => {
  const header = config.headers?.Authorization;
  return typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : null;
};

const clearAuthStorage = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem('todo_refresh_token');
  localStorage.removeItem('todo_user');
  localStorage.removeItem('todo_session');
  localStorage.removeItem('todo_remember_me');

  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem('todo_refresh_token');
  sessionStorage.removeItem('todo_user');
  sessionStorage.removeItem('todo_session');
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
      !isAuthEndpoint(originalRequest.url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;

      // A newer sign-in (e.g. returning from Google) may have stored a new
      // token after this request went out with the old one. Retry with the
      // new token instead of refreshing, or failing, the old session.
      const latestToken = readStoredToken(TOKEN_STORAGE_KEY);
      if (latestToken && latestToken !== bearerOf(originalRequest)) {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${latestToken}`;
        }
        return api(originalRequest);
      }

      isRefreshing = true;

      const refreshToken = readStoredToken('todo_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          const { token: newAccessToken, refreshToken: newRefreshToken, user, session } = res.data.data;
          
          const rememberMe = localStorage.getItem('todo_remember_me') === 'true';
          const storage = rememberMe ? localStorage : sessionStorage;
          storage.setItem(TOKEN_STORAGE_KEY, newAccessToken);
          storage.setItem('todo_refresh_token', newRefreshToken);
          storage.setItem('todo_user', JSON.stringify(user));
          if (session) {
            storage.setItem('todo_session', JSON.stringify(session));
          }

          processQueue(null, newAccessToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return api(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          // Only sign out if no newer session replaced this one meanwhile.
          if (readStoredToken('todo_refresh_token') === refreshToken) {
            clearAuthStorage();
            const loginPath = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
            if (window.location.pathname !== loginPath) {
              window.location.assign(loginPath);
            }
          }
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      } else {
        isRefreshing = false;
        processQueue(error, null);
        clearAuthStorage();
        const loginPath = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
        if (window.location.pathname !== loginPath) {
          window.location.assign(loginPath);
        }
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

export { TOKEN_STORAGE_KEY };

export default api;
