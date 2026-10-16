import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { SERVER_BASE_URL } from '../../api/client.js';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/Badges.jsx';
import {
  Inbox,
  Search,
  Clock,
  User,
  Book,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export const AdminQueuePage = () => {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Sorting state
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('urgent');
  const [searchQuery, setSearchQuery] = useState('');
  const [sseConnected, setSseConnected] = useState(false);

  const eventSourceRef = useRef(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (sortBy) params.append('sortBy', sortBy);

      const res = await apiClient.get(`/admin/tickets?${params.toString()}`);
      if (res.success) {
        setTickets(res.tickets || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch ticket queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter, categoryFilter, priorityFilter, sortBy]);

  // Real-time Queue Stream (SSE)
  useEffect(() => {
    const sseUrl = `${SERVER_BASE_URL}/api/admin/queue/stream`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setSseConnected(true);
    });

    // When an author creates a new ticket, re-fetch or prepend
    es.addEventListener('ticket_created', () => {
      fetchQueue();
    });

    // When status or priority is updated anywhere
    es.addEventListener('ticket_updated', () => {
      fetchQueue();
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      es.close();
      setSseConnected(false);
    };
  }, []);

  // Client-side text search (matches author name, subject, ticket number, book title)
  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.subject?.toLowerCase().includes(q) ||
      t.author_name?.toLowerCase().includes(q) ||
      t.book_title?.toLowerCase().includes(q) ||
      String(t.ticket_number).includes(q)
    );
  });

  const formatElapsed = (dateStr) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Operations Ticket Queue
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-800">
              Admin Portal
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Incoming author queries with automated AI auto-classification, urgency scoring, and Knowledge Base drafts.
          </p>
        </div>

        {/* Live SSE badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
              }`}
            />
            <span className="text-slate-600 font-medium">
              {sseConnected ? 'Live Queue Stream' : 'Connecting Stream...'}
            </span>
          </div>

          <button
            onClick={fetchQueue}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 shadow-xs transition"
            title="Refresh Queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by author name, book, subject, or ticket #..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open Only</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="">All Categories</option>
            <option value="ROYALTY_AND_PAYMENTS">Royalty & Payments</option>
            <option value="ISBN_AND_METADATA">ISBN & Metadata</option>
            <option value="PRINTING_AND_QUALITY">Printing & Quality</option>
            <option value="DISTRIBUTION_AND_AVAILABILITY">Distribution</option>
            <option value="BOOK_STATUS_AND_PRODUCTION">Production Status</option>
            <option value="GENERAL_INQUIRY">General Inquiry</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-purple-50 border border-purple-200 text-purple-900 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="urgent">🔥 Sort: Most Urgent & Oldest</option>
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-purple-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Active Queries ({filteredTickets.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Click any ticket to open AI draft, overrides & internal notes
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center items-center">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            No support tickets match your filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map((ticket) => {
              const isCritical = ticket.priority === 'CRITICAL';
              const isOpen = ticket.status === 'OPEN';

              return (
                <div
                  key={ticket.id}
                  onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                  className={`p-5 cursor-pointer transition hover:bg-slate-50/80 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isCritical && isOpen ? 'bg-rose-50/40 border-l-4 border-rose-500' : ''
                  }`}
                >
                  {/* Left Column: Author & Query */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        #{ticket.ticket_number}
                      </span>
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                      <CategoryBadge category={ticket.category} />

                      {ticket.ai_confidence && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          AI Conf: {Math.round(ticket.ai_confidence * 100)}%
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 hover:text-purple-700 transition line-clamp-1">
                      {ticket.subject}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {ticket.author_name}
                      </span>

                      {ticket.book_title && (
                        <span className="flex items-center gap-1 text-slate-600 truncate max-w-xs">
                          <Book className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{ticket.book_title}</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        Waiting {formatElapsed(ticket.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Status & Action Indicator */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right text-xs">
                      {ticket.assigned_to_name ? (
                        <span className="text-slate-600 block">
                          Assigned to: <strong className="text-slate-800">{ticket.assigned_to_name}</strong>
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium block">Unassigned</span>
                      )}

                      {ticket.internal_notes_count > 0 && (
                        <span className="text-[11px] text-purple-700 font-medium block mt-0.5">
                          {ticket.internal_notes_count} internal notes
                        </span>
                      )}
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};