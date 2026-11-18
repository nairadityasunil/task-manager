import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/services/api';

export interface AuthProfile {
  id: string;
  email: string;
  /** Always null: keys are hashed server side and shown once on creation. */
  syncApiKey?: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  authProvider: 'local' | 'google';
  openaiApiKeyConfigured?: boolean;
  anthropicApiKeyConfigured?: boolean;
  geminiApiKeyConfigured?: boolean;
  /** Providers the server has its own key for, usable without a personal key. */
  aiPlatformProviders?: Array<'openai' | 'anthropic' | 'gemini'>;
  twoFactorEnabled?: boolean;
  /** Can open the platform admin panel. */
  isSuperAdmin?: boolean;
}

export interface AuthSession {
  sessionId: string | null;
  deviceId: string | null;
  deviceType: 'primary' | 'companion' | 'sync_key';
  deviceName: string | null;
  companionDeviceType: string | null;
  authMethod: 'access_token' | 'sync_api_key';
}

export interface AuthState {
  user: AuthProfile | null;
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
  require2fa: boolean;
  tempEmail2fa: string | null;
  rememberMe: boolean;
}

/**
 * Sign-in itself is an HttpOnly cookie the API sets, so no token is kept here or in browser storage. The only thing
 * remembered is this non-secret flag, which says "ask the API who I am" when the page loads.
 */
export const SIGNED_IN_FLAG = 'todo_signed_in';
const setSignedInFlag = (on: boolean): void => {
  try {
    if (on) localStorage.setItem(SIGNED_IN_FLAG, '1');
    else localStorage.removeItem(SIGNED_IN_FLAG);
  } catch {
    // storage unavailable: the page just asks the API each time
  }
};

const initialRememberMe = localStorage.getItem('todo_remember_me') === 'true';

const initialState: AuthState = {
  user: null,
  session: null,
  loading: false,
  error: null,
  require2fa: false,
  tempEmail2fa: null,
  rememberMe: initialRememberMe,
};

// Async Thunks
export const loginThunk = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string; rememberMe: boolean }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', {
        email: payload.email,
        password: payload.password,
        rememberMe: payload.rememberMe,
      });
      return { data: response.data.data, rememberMe: payload.rememberMe };
    } catch (err) {
      const errorObj = err as { message?: string };
      return rejectWithValue(errorObj.message || 'Login failed');
    }
  }
);

export const verify2faThunk = createAsyncThunk(
  'auth/verify2fa',
  async (payload: { email: string; code: string; rememberMe: boolean }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/verify-2fa', {
        email: payload.email,
        code: payload.code,
        rememberMe: payload.rememberMe,
      });
      return { data: response.data.data, rememberMe: payload.rememberMe };
    } catch (err) {
      const errorObj = err as { message?: string };
      return rejectWithValue(errorObj.message || '2FA code verification failed');
    }
  }
);

/** Sign-in for the platform admin console: only platform admins are accepted. */
export const adminLoginThunk = createAsyncThunk(
  'auth/adminLogin',
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/auth/login', { email: payload.email, password: payload.password, rememberMe: false });
      return { data: response.data.data, rememberMe: false };
    } catch (err) {
      const errorObj = err as { message?: string };
      return rejectWithValue(errorObj.message || 'Sign-in failed');
    }
  }
);

export const adminVerify2faThunk = createAsyncThunk(
  'auth/adminVerify2fa',
  async (payload: { email: string; code: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/admin/auth/verify-2fa', { email: payload.email, code: payload.code, rememberMe: false });
      return { data: response.data.data, rememberMe: false };
    } catch (err) {
      const errorObj = err as { message?: string };
      return rejectWithValue(errorObj.message || 'Code verification failed');
    }
  }
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (payload: { email: string; password: string; firstName: string; lastName: string; inviteToken?: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', payload);
      return response.data.data;
    } catch (err) {
      const errorObj = err as { message?: string };
      return rejectWithValue(errorObj.message || 'Registration failed');
    }
  }
);

export const refreshUserThunk = createAsyncThunk(
  'auth/refreshUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me');
      return response.data.data;
    } catch (err) {
      const errorObj = err as { message?: string };
      return rejectWithValue(errorObj.message || 'Unable to refresh session');
    }
  }
);

export const updateProfileThunk = createAsyncThunk(
  'auth/updateProfile',
  async (
    payload: {
      firstName?: string;
      lastName?: string;
      openaiApiKey?: string;
      anthropicApiKey?: string;
      geminiApiKey?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.patch('/auth/profile', payload);
      return response.data.data.user;
    } catch (err) {
      const errorObj = err as { message?: string };
      return rejectWithValue(errorObj.message || 'Failed to update profile');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      clearTokens(state);
    },
    clearError(state) {
      state.error = null;
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    /** Signed in (the cookies are already set by the API): keep who it is. */
    setSession(state, action: PayloadAction<{ user: AuthProfile; session?: AuthSession | null; rememberMe?: boolean }>) {
      if (action.payload.rememberMe !== undefined) state.rememberMe = action.payload.rememberMe;
      saveSession(state, action.payload);
    },
    setRememberMe(state, action: PayloadAction<boolean>) {
      state.rememberMe = action.payload;
      if (action.payload) {
        localStorage.setItem('todo_remember_me', 'true');
      } else {
        localStorage.removeItem('todo_remember_me');
      }
    }
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.rememberMe = action.payload.rememberMe;
      if (action.payload.data.require2fa) {
        state.require2fa = true;
        state.tempEmail2fa = action.payload.data.email;
      } else {
        saveSession(state, action.payload.data);
      }
    });
    builder.addCase(loginThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Platform admin sign-in (same handling as a normal sign-in)
    builder.addCase(adminLoginThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(adminLoginThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.rememberMe = false;
      if (action.payload.data.require2fa) {
        state.require2fa = true;
        state.tempEmail2fa = action.payload.data.email;
      } else {
        saveSession(state, action.payload.data);
      }
    });
    builder.addCase(adminLoginThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    builder.addCase(adminVerify2faThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(adminVerify2faThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.rememberMe = false;
      saveSession(state, action.payload.data);
    });
    builder.addCase(adminVerify2faThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Verify 2FA
    builder.addCase(verify2faThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(verify2faThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.rememberMe = action.payload.rememberMe;
      saveSession(state, action.payload.data);
    });
    builder.addCase(verify2faThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Register
    builder.addCase(registerThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(registerThunk.fulfilled, (state, action) => {
      state.loading = false;
      saveSession(state, action.payload);
    });
    builder.addCase(registerThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Refresh User
    builder.addCase(refreshUserThunk.fulfilled, (state, action) => {
      state.user = action.payload.user;
      state.session = action.payload.session ?? null;
      setSignedInFlag(true);
    });
    builder.addCase(refreshUserThunk.rejected, (state) => {
      clearTokens(state);
    });

    // Update Profile
    builder.addCase(updateProfileThunk.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateProfileThunk.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
    });
    builder.addCase(updateProfileThunk.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

function saveSession(state: AuthState, payload: { user: AuthProfile; session?: AuthSession | null }) {
  state.user = payload.user;
  state.session = payload.session ?? null;
  state.require2fa = false;
  state.tempEmail2fa = null;
  setSignedInFlag(true);
}

function clearTokens(state: AuthState) {
  state.user = null;
  state.session = null;
  state.require2fa = false;
  state.tempEmail2fa = null;
  setSignedInFlag(false);
  for (const key of ['todo_user', 'todo_session', 'todo_token', 'todo_refresh_token']) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

export const { logout, clearError, setError, setSession, setRememberMe } = authSlice.actions;
export default authSlice.reducer;
