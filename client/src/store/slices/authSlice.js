import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/client.js';

// Initial state restored from localStorage if available
const initialToken = typeof window !== 'undefined' ? localStorage.getItem('bookleaf_token') : null;
const initialUser =
  typeof window !== 'undefined' && localStorage.getItem('bookleaf_user')
    ? JSON.parse(localStorage.getItem('bookleaf_user'))
    : null;

// Async Thunk for User Login
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      if (res.success && res.token) {
        localStorage.setItem('bookleaf_token', res.token);
        localStorage.setItem('bookleaf_user', JSON.stringify(res.user));
        return { user: res.user, token: res.token };
      }
      return rejectWithValue(res.message || 'Login failed');
    } catch (err) {
      return rejectWithValue(err.message || 'Login failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: initialUser,
    token: initialToken,
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bookleaf_token');
        localStorage.removeItem('bookleaf_user');
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to authenticate';
      });
  },
});

export const { logout, clearError } = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => !!state.auth.token && !!state.auth.user;
export const selectIsAuthor = (state) => state.auth.user?.role === 'AUTHOR';
export const selectIsAdmin = (state) => state.auth.user?.role === 'ADMIN';

export default authSlice.reducer;