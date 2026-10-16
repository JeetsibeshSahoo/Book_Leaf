import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectIsAdmin } from './store/slices/authSlice.js';

import { LoginPage } from './pages/LoginPage.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { MyBooksPage } from './pages/author/MyBooksPage.jsx';
import { SubmitTicketPage } from './pages/author/SubmitTicketPage.jsx';
import { AuthorTicketsPage } from './pages/author/AuthorTicketsPage.jsx';
import { AdminQueuePage } from './pages/admin/AdminQueuePage.jsx';
import { AdminTicketDetailPage } from './pages/admin/AdminTicketDetailPage.jsx';

export default function App() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isAdmin = useSelector(selectIsAdmin);

  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Root redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={isAdmin ? '/admin/queue' : '/my-books'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Author-Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['AUTHOR']} />}>
        <Route path="/my-books" element={<MyBooksPage />} />
        <Route path="/submit-ticket" element={<SubmitTicketPage />} />
        <Route path="/my-tickets" element={<AuthorTicketsPage />} />
      </Route>

      {/* Admin-Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin/queue" element={<AdminQueuePage />} />
        <Route path="/admin/tickets/:id" element={<AdminTicketDetailPage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}