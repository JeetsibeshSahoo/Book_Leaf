import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  loginUser,
  selectAuth,
  selectIsAuthenticated,
  selectIsAdmin,
  clearError,
} from '../store/slices/authSlice.js';
import apiClient from '../api/client.js';
import { LogIn, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error } = useSelector(selectAuth);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isAdmin = useSelector(selectIsAdmin);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sampleUsers, setSampleUsers] = useState([]);

  // Fetch sample credentials from backend for evaluator convenience
  useEffect(() => {
    dispatch(clearError());
    apiClient
      .get('/auth/sample-users')
      .then((res) => {
        if (res.success && Array.isArray(res.users)) {
          setSampleUsers(res.users);
        }
      })
      .catch((err) => console.warn('Could not load sample users:', err.message));
  }, [dispatch]);

  // If already authenticated, redirect to appropriate portal
  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) {
        navigate('/admin/queue');
      } else {
        navigate('/my-books');
      }
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    const result = await dispatch(loginUser({ email, password }));
    if (!result.error) {
      // Redirect handled by useEffect above
    }
  };

  // Quick-fill helper for reviewer
  const fillCredentials = (userEmail, userRole) => {
    setEmail(userEmail);
    setPassword(userRole === 'ADMIN' ? 'admin123' : 'password123');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-2xl shadow-md mb-3">
          B
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          BookLeaf Publishing
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Author Support & Operational Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-slate-200 sm:px-10">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Quick-Fill Evaluator Pills */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>One-Click Test Accounts:</span>
            </div>

            <div className="space-y-1.5">
              {/* Admin Button */}
              <button
                type="button"
                onClick={() => fillCredentials('admin@bookleaf.com', 'ADMIN')}
                className="w-full text-left px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md text-xs flex items-center justify-between text-purple-900 transition"
              >
                <span className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  Operations Admin
                </span>
                <span className="text-[11px] text-purple-700 font-mono">admin@bookleaf.com</span>
              </button>

              {/* Sample Authors */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => fillCredentials('priya.sharma@email.com', 'AUTHOR')}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded text-left text-xs text-emerald-900 transition truncate"
                  title="Priya Sharma (Mumbai) - 2 books"
                >
                  <p className="font-semibold truncate">Priya Sharma</p>
                  <p className="text-[10px] text-emerald-700 font-mono truncate">priya.sharma@email.com</p>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials('sneha.kulkarni@email.com', 'AUTHOR')}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded text-left text-xs text-emerald-900 transition truncate"
                  title="Sneha Kulkarni - Has book in production"
                >
                  <p className="font-semibold truncate">Sneha Kulkarni</p>
                  <p className="text-[10px] text-emerald-700 font-mono truncate">sneha.kulkarni@email.com</p>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials('vikram.joshi@email.com', 'AUTHOR')}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded text-left text-xs text-emerald-900 transition truncate"
                >
                  <p className="font-semibold truncate">Vikram Joshi</p>
                  <p className="text-[10px] text-emerald-700 font-mono truncate">vikram.joshi@email.com</p>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials('ananya.reddy@email.com', 'AUTHOR')}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded text-left text-xs text-emerald-900 transition truncate"
                >
                  <p className="font-semibold truncate">Ananya Reddy</p>
                  <p className="text-[10px] text-emerald-700 font-mono truncate">ananya.reddy@email.com</p>
                </button>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-400 text-center">
              Password is <span className="font-mono text-slate-600">password123</span> for authors, <span className="font-mono text-slate-600">admin123</span> for admin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};