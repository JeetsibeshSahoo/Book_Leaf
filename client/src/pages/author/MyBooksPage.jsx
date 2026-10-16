import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/slices/authSlice.js';
import apiClient from '../../api/client.js';
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  Clock,
  MessageSquarePlus,
  AlertCircle,
  Building,
} from 'lucide-react';

export const MyBooksPage = () => {
  const user = useSelector(selectCurrentUser);

  const [books, setBooks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/books');
      if (res.success) {
        setBooks(res.books || []);
        setSummary(res.summary || null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load your catalog.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'In Production';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Author Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-slate-800">{user?.name}</span>. Here is an overview of your published titles, royalties, and distribution status.
          </p>
        </div>
        <Link
          to="/submit-ticket"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs transition self-start sm:self-auto"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Raise Support Query
        </Link>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Financial Summary Metric Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Books
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{summary.totalBooks}</p>
            <p className="text-xs text-slate-400 mt-1">Published or in production</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Copies Sold
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              {summary.totalCopiesSold.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-400 mt-1">Across all retail platforms</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Royalty Earned
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-2">
              {formatCurrency(summary.totalRoyaltyEarned)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Paid: {formatCurrency(summary.totalRoyaltyPaid)}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Payout
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-2">
              {formatCurrency(summary.totalRoyaltyPending)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Processed quarterly (₹1,000 min)</p>
          </div>
        </div>
      )}

      {/* Books Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Your Book Catalog</h2>
          <span className="text-xs text-slate-500">{books.length} titles listed</span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No titles registered under your author account yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Book Details</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Pricing & Sales</th>
                  <th className="px-4 py-3.5">Royalty Summary</th>
                  <th className="px-4 py-3.5">Availability</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {books.map((book) => {
                  const isLive = book.status === 'Published & Live';

                  return (
                    <tr key={book.id} className="hover:bg-slate-50/70 transition">
                      {/* Title & Metadata */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{book.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="font-mono text-slate-400">{book.book_id}</span>
                          <span>·</span>
                          <span>{book.genre || 'General'}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          ISBN: {book.isbn || 'Pending Assignment'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            isLive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          ● {book.status}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Pub Date: {formatDate(book.publication_date)}
                        </div>
                      </td>

                      {/* Pricing & Sales */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-800">
                          {book.mrp ? formatCurrency(book.mrp) : 'N/A (In Prod)'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Sold: <span className="font-semibold text-slate-700">{book.total_copies_sold}</span> copies
                        </div>
                        {book.author_royalty_per_copy && (
                          <div className="text-[11px] text-slate-400">
                            ₹{book.author_royalty_per_copy}/copy
                          </div>
                        )}
                      </td>

                      {/* Royalty Breakdown */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-xs">
                          <span className="text-slate-500">Earned: </span>
                          <span className="font-semibold text-slate-800">
                            {formatCurrency(book.total_royalty_earned)}
                          </span>
                        </div>
                        <div className="text-xs mt-0.5">
                          <span className="text-slate-500">Paid: </span>
                          <span className="text-slate-700">
                            {formatCurrency(book.royalty_paid)}
                          </span>
                        </div>
                        <div className="text-xs mt-0.5">
                          <span className="text-amber-600 font-medium">Pending: </span>
                          <span className="font-bold text-amber-600">
                            {formatCurrency(book.royalty_pending)}
                          </span>
                        </div>
                      </td>

                      {/* Availability & Printing Partner */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {Array.isArray(book.available_on) && book.available_on.length > 0 ? (
                            book.available_on.map((platform) => (
                              <span
                                key={platform}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {platform}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">Not yet distributed</span>
                          )}
                        </div>
                        {book.print_partner && (
                          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Partner: {book.print_partner}</span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link
                          to={`/submit-ticket?bookId=${book.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md transition"
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                          Query
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};