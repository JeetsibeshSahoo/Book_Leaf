import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  selectIsAuthenticated,
  selectCurrentUser,
} from '../store/slices/authSlice.js';
import { Navbar } from './Navbar.jsx';

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);

  // 1. If not logged in, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // 2. If route requires specific roles, enforce RBAC
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If an author attempts to visit admin routes, redirect to author dashboard
    if (user.role === 'AUTHOR') {
      return <Navigate to="/my-books" replace />;
    }
    // If admin attempts to visit author dashboard, redirect to admin queue
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/queue" replace />;
    }
  }

  // 3. Render Navbar and matching child route
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};