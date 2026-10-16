import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectCurrentUser,
  selectIsAuthor,
  selectIsAdmin,
  logout,
} from '../store/slices/authSlice.js';
import { BookOpen, LifeBuoy, Inbox, LogOut, User, PlusCircle } from 'lucide-react';

export const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useSelector(selectCurrentUser);
  const isAuthor = useSelector(selectIsAuthor);
  const isAdmin = useSelector(selectIsAdmin);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to={isAdmin ? '/admin/queue' : '/my-books'} className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-xs group-hover:bg-emerald-700 transition">
              B
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight block leading-tight">
                BookLeaf
              </span>
              <span className="text-[10px] uppercase font-semibold text-emerald-700 tracking-wider">
                Publishing
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {isAuthor && (
              <>
                <Link
                  to="/my-books"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition ${
                    isActive('/my-books')
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  My Books
                </Link>

                <Link
                  to="/my-tickets"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition ${
                    isActive('/my-tickets')
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LifeBuoy className="w-4 h-4" />
                  My Tickets
                </Link>

                <Link
                  to="/submit-ticket"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition ${
                    isActive('/submit-ticket')
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Raise Query
                </Link>
              </>
            )}

            {isAdmin && (
              <Link
                to="/admin/queue"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive('/admin/queue')
                    ? 'bg-purple-50 text-purple-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Inbox className="w-4 h-4" />
                Ticket Queue
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 text-right">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
              <div className="flex items-center gap-1">
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                    isAdmin
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isAdmin ? 'Operations Team' : 'Author'}
                </span>
                {user.city && (
                  <span className="text-[10px] text-slate-400">· {user.city}</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};