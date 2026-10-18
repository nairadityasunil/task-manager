import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import api from '@/services/api';
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
  setTokens,
  setRememberMe
} from '@/store/authSlice';

interface AuthContextValue {
  user: AuthProfile | null;
  session: AuthSession | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  require2fa: boolean;
  tempEmail2fa: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginWithCompanionKey: (key: string) => Promise<void>;
  loginWithCompanionQr: (payload: { sessionId: string; token: string; device?: Record<string, unknown> }) => Promise<void>;
  authenticateWithToken: (token: string) => Promise<void>;
  register: (payload: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
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
  token: string;
  refreshToken?: string;
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

interface UrlAuthTokens {
  token: string;
  refreshToken: string | null;
}

/**
 * Reads Google sign-in tokens from the URL and removes them from the address
 * bar. This runs once when the module loads, before React renders: route
 * guards are children of AuthProvider, so their redirects (e.g. a protected
 * page sending a signed-out visitor to /login) run before AuthProvider's
 * effects and would otherwise discard the tokens.
 */
const consumeUrlAuthTokens = (): UrlAuthTokens | null => {
  if (typeof window === 'undefined') return null;
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const urlParams = new URLSearchParams(window.location.search);
  const hashToken = hashParams.get('token');
  // Older backends sent ?token=; pages like /accept-invitation and /login use
  // ?token= for their own purpose, so the query form is ignored there.
  const pageOwnsTokenParam = ['/accept-invitation', '/login'].includes(window.location.pathname);
  const token = hashToken ?? (pageOwnsTokenParam ? null : urlParams.get('token'));
  if (!token) return null;

  const url = new URL(window.location.href);
  if (hashToken) {
    url.hash = '';
  } else {
    url.searchParams.delete('token');
  }
  window.history.replaceState(window.history.state, '', url.toString());
  return { token, refreshToken: hashParams.get('refreshToken') };
};

const initialUrlTokens = consumeUrlAuthTokens();
// StrictMode runs effects twice in development; sign in from the URL once.
let urlLoginStarted = false;

function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const dispatch = useDispatch<AppDispatch>();
  const { user, session, token, loading, error, require2fa, tempEmail2fa } = useSelector(
    (state: RootState) => state.auth
  );

  const [isCompletingUrlLogin, setIsCompletingUrlLogin] = useState(initialUrlTokens != null);

  useEffect(() => {
    if (!initialUrlTokens || urlLoginStarted) return;
    urlLoginStarted = true;
    const { token: tokenFromUrl, refreshToken: refreshTokenFromUrl } = initialUrlTokens;

    // Treat redirect login as rememberMe = true
    api.get('/auth/me', {
      headers: { Authorization: `Bearer ${tokenFromUrl}` }
    })
      .then((res) => {
        dispatch(setTokens({
          token: tokenFromUrl,
          refreshToken: refreshTokenFromUrl ?? tokenFromUrl,
          user: res.data.data.user,
          session: res.data.data.session,
          rememberMe: true
        }));
      })
      .catch(() => {
        // The API client already reports the failure; the user stays signed out.
      })
      .finally(() => setIsCompletingUrlLogin(false));
  }, [dispatch]);

  const logout = useCallback((): void => {
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

  const register = async (payload: { email: string; password: string; firstName: string; lastName: string }): Promise<void> => {
    await dispatch(registerThunk(payload)).unwrap();
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
      dispatch(setTokens({
        token: response.data.data.token,
        refreshToken: response.data.data.refreshToken ?? response.data.data.token,
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
      dispatch(setTokens({
        token: response.data.data.token,
        refreshToken: response.data.data.refreshToken ?? response.data.data.token,
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

  const authenticateWithToken = useCallback(
    async (newToken: string): Promise<void> => {
      // Direct token injection
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${newToken}` }
      });
      dispatch(setTokens({
        token: newToken,
        refreshToken: newToken,
        user: response.data.data.user,
        session: response.data.data.session,
        rememberMe: false
      }));
    },
    [dispatch]
  );

  const clearError = useCallback((): void => {
    dispatch(clearErrorAction());
  }, [dispatch]);

  const value = useMemo(
    () => ({
      user,
      session,
      token,
      loading: loading || isCompletingUrlLogin,
      error,
      require2fa,
      tempEmail2fa,
      login,
      loginWithCompanionKey,
      loginWithCompanionQr,
      register,
      logout,
      refreshUser,
      authenticateWithToken,
      updateProfile,
      verify2fa,
      clearError
    }),
    [user, session, token, loading, isCompletingUrlLogin, error, require2fa, tempEmail2fa, logout, refreshUser, authenticateWithToken, clearError]
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