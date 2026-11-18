import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import api, { purgeLegacyTokens, readLegacyRefreshToken, refreshSessionCookies } from '@/services/api';
import { RootState, AppDispatch } from '@/store';
import {
  AuthProfile,
  AuthSession,
  loginThunk,
  verify2faThunk,
  registerThunk,
  refreshUserThunk,
  updateProfileThunk,
  logout as logoutAction,
  clearError as clearErrorAction,
  setError as setErrorAction,
  setSession,
  setRememberMe,
  SIGNED_IN_FLAG
} from '@/store/authSlice';

export interface JoinedProject {
  projectId: string;
  workspaceId: string | null;
  projectName: string | null;
  role: 'ADMIN' | 'MEMBER';
}

interface AuthContextValue {
  user: AuthProfile | null;
  session: AuthSession | null;
  /** True once the API has confirmed a signed-in person (sign-in is an HttpOnly cookie, never readable here). */
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  require2fa: boolean;
  tempEmail2fa: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginWithCompanionKey: (key: string) => Promise<void>;
  loginWithCompanionQr: (payload: { sessionId: string; token: string; device?: Record<string, unknown> }) => Promise<void>;
  /** With `inviteToken`, the new account also joins the invited project and workspace; `joined` says where. */
  register: (payload: { email: string; password: string; firstName: string; lastName: string; inviteToken?: string }) => Promise<{ joined: JoinedProject | null }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    geminiApiKey?: string;
  }) => Promise<void>;
  verify2fa: (email: string, code: string, rememberMe?: boolean) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthResponseData {
  user: AuthProfile;
  session?: AuthSession;
}

interface AuthResponse {
  message: string;
  data: AuthResponseData;
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * The page may have just come back from Google sign-in (the API set the cookies and added #signin=1), or the
 * person signed in earlier (flag), or still holds a pre-cookie token in browser storage that is moved into
 * cookies once. Any of these means: ask the API who this is. Anonymous visitors cause no request.
 */
const consumeSignInMarker = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  let fromRedirect = false;
  if (hashParams.get('signin') === '1') {
    fromRedirect = true;
    const url = new URL(window.location.href);
    // A sign-in that returns to the public landing page should open the app.
    if (url.pathname === '/') url.pathname = '/dashboard';
    url.hash = '';
    window.history.replaceState(window.history.state, '', url.toString());
  }
  let flagged: boolean;
  try {
    flagged = localStorage.getItem(SIGNED_IN_FLAG) === '1';
  } catch {
    flagged = false;
  }
  return fromRedirect || flagged || readLegacyRefreshToken() != null;
};

const shouldBootstrap = consumeSignInMarker();
// StrictMode runs effects twice in development; bootstrap once.
let bootstrapStarted = false;

function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  const { user, session, loading, error, require2fa, tempEmail2fa } = useSelector(
    (state: RootState) => state.auth
  );

  const [isBootstrapping, setIsBootstrapping] = useState(shouldBootstrap);

  useEffect(() => {
    if (!shouldBootstrap || bootstrapStarted) return;
    bootstrapStarted = true;
    void (async () => {
      try {
        // Move a pre-cookie sign-in into cookies once, then forget the old token.
        const legacy = readLegacyRefreshToken();
        if (legacy) {
          try {
            await api.post('/auth/refresh', { refreshToken: legacy });
          } catch {
            // the old session is gone: fall through to a signed-out start
          }
          purgeLegacyTokens();
        }
        let res;
        try {
          res = await api.get('/auth/me', { silent: true, noAuthRetry: true });
        } catch {
          // the short-lived cookie may have run out while the long one is still good: renew once and ask again
          if (!(await refreshSessionCookies())) throw new Error('signed out');
          res = await api.get('/auth/me', { silent: true, noAuthRetry: true });
        }
        dispatch(setSession({ user: res.data.data.user, session: res.data.data.session, rememberMe: true }));
      } catch {
        // not signed in (or signed out elsewhere): the flag is cleared and the person sees the login page
        localStorage.removeItem(SIGNED_IN_FLAG);
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, [dispatch]);

  const logout = useCallback((): void => {
    // Ends the session on the server (and clears the cookies), then forgets the person here.
    void api.post('/auth/logout', {}, { silent: true }).catch(() => undefined);
    dispatch(logoutAction());
  }, [dispatch]);

  const refreshUser = useCallback(async (): Promise<void> => {
    await dispatch(refreshUserThunk()).unwrap();
  }, [dispatch]);

  const login = async (email: string, password: string, rememberMe = false): Promise<void> => {
    dispatch(setRememberMe(rememberMe));
    await dispatch(loginThunk({ email, password, rememberMe })).unwrap();
  };

  const verify2fa = async (email: string, code: string, rememberMe = false): Promise<void> => {
    dispatch(setRememberMe(rememberMe));
    await dispatch(verify2faThunk({ email, code, rememberMe })).unwrap();
  };

  const register = async (payload: { email: string; password: string; firstName: string; lastName: string; inviteToken?: string }): Promise<{ joined: JoinedProject | null }> => {
    const result = (await dispatch(registerThunk(payload)).unwrap()) as { joined?: JoinedProject | null };
    return { joined: result?.joined ?? null };
  };

  const updateProfile = async (data: {
    firstName?: string;
    lastName?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    geminiApiKey?: string;
  }): Promise<void> => {
    await dispatch(updateProfileThunk(data)).unwrap();
  };

  const loginWithCompanionKey = async (key: string): Promise<void> => {
    try {
      await dispatch(setRememberMe(false));
      const response = await api.post<AuthResponse>('/auth/companion-login', { key });
      dispatch(setSession({
        user: response.data.data.user,
        session: response.data.data.session,
        rememberMe: false
      }));
    } catch (err) {
      const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
      const msg = errorObj.response?.data?.message || errorObj.message || 'Companion key pairing failed';
      dispatch(setErrorAction(msg));
      throw new Error(msg, { cause: err });
    }
  };

  const loginWithCompanionQr = async (payload: { sessionId: string; token: string; device?: Record<string, unknown> }): Promise<void> => {
    try {
      await dispatch(setRememberMe(false));
      const response = await api.post<AuthResponse>('/companion/pair/qr', payload);
      dispatch(setSession({
        user: response.data.data.user,
        session: response.data.data.session,
        rememberMe: false
      }));
    } catch (err) {
      const errorObj = err as { message?: string; response?: { data?: { message?: string } } };
      const msg = errorObj.response?.data?.message || errorObj.message || 'QR pairing failed. Please try scanning again.';
      dispatch(setErrorAction(msg));
      throw new Error(msg, { cause: err });
    }
  };

  const clearError = useCallback((): void => {
    dispatch(clearErrorAction());
  }, [dispatch]);

  const value = useMemo(
    () => ({
      user,
      session,
      isAuthenticated: user != null,
      loading: loading || isBootstrapping,
      error,
      require2fa,
      tempEmail2fa,
      login,
      loginWithCompanionKey,
      loginWithCompanionQr,
      register,
      logout,
      refreshUser,
      updateProfile,
      verify2fa,
      clearError
    }),
    [user, session, loading, isBootstrapping, error, require2fa, tempEmail2fa, logout, refreshUser, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context == null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default AuthProvider;
export { useAuth };