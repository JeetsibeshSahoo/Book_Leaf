import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../../api/client.js';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/Badges.jsx';
import {
  MessageSquare,
  Send,
  Clock,
  Book,
  User,
  Shield,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import apiClient, { SERVER_BASE_URL } from '../../api/client.js';

export const AuthorTicketsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTicketId = searchParams.get('ticketId');

  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');

  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);

  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  // 1. Fetch all tickets submitted by author
  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      const res = await apiClient.get('/tickets');
      if (res.success) {
        setTickets(res.tickets || []);
        // Auto-select first ticket if none selected
        if (!selectedTicketId && res.tickets?.length > 0) {
          setSearchParams({ ticketId: res.tickets[0].id });
        }
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // 2. Fetch active ticket details and message history
  const fetchTicketDetail = async (ticketId) => {
    try {
      setLoadingDetail(true);
      const res = await apiClient.get(`/tickets/${ticketId}`);
      if (res.success) {
        setActiveTicket(res.ticket);
        setMessages(res.messages || []);
      }
    } catch (err) {
      console.error('Failed to load ticket timeline:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedTicketId) {
      fetchTicketDetail(selectedTicketId);
    }
  }, [selectedTicketId]);

  // 3. Server-Sent Events (SSE) Live Stream Listener
  useEffect(() => {
    if (!selectedTicketId) return;

    // Close previous SSE connection if open
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sseUrl = `${SERVER_BASE_URL}/api/admin/queue/stream`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setSseConnected(true);
    });

    // Listen for new messages posted by Admin or Author
    es.addEventListener('new_message', (e) => {
      try {
        const newMsg = JSON.parse(e.data);
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      } catch (err) {
        console.warn('Error parsing SSE new_message:', err);
      }
    });

    // Listen for status changes (e.g. Admin marks Resolved)
    es.addEventListener('ticket_updated', (e) => {
      try {
        const updated = JSON.parse(e.data);
        setActiveTicket((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
        // Also update ticket list item
        setTickets((prev) =>
          prev.map((t) => (t.id === updated.id ? { ...t, status: updated.status } : t))
        );
      } catch (err) {
        console.warn('Error parsing SSE ticket_updated:', err);
      }
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      es.close();
      setSseConnected(false);
    };
  }, [selectedTicketId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Send author reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    try {
      setSendingReply(true);
      const res = await apiClient.post(`/tickets/${activeTicket.id}/messages`, {
        message: replyText.trim(),
      });
      if (res.success) {
        setReplyText('');
      }
    } catch (err) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Tickets</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View status updates and communicate directly with BookLeaf Operations in real time.
          </p>
        </div>
        <Link
          to="/submit-ticket"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs transition"
        >
          <PlusCircle className="w-4 h-4" />
          New Query
        </Link>
      </div>

      {/* Split View Container */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left Column: Tickets List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-semibold uppercase text-slate-600 tracking-wider">
              Your Tickets ({tickets.length})
            </span>
            <button
              onClick={fetchTickets}
              className="text-slate-400 hover:text-slate-600 transition p-1"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingTickets ? (
              <div className="p-8 text-center">
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                You have not submitted any queries yet.
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = t.id === selectedTicketId;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSearchParams({ ticketId: t.id })}
                    className={`p-4 cursor-pointer transition text-left ${
                      isSelected
                        ? 'bg-emerald-50/60 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        #{t.ticket_number}
                      </span>
                      <StatusBadge status={t.status} />
                    </div>

                    <h4 className="text-sm font-semibold text-slate-800 line-clamp-1">
                      {t.subject}
                    </h4>

                    {t.book_title && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                        <Book className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{t.book_title}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <PriorityBadge priority={t.priority} />
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(t.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Live Conversation Timeline (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {activeTicket ? (
            <>
              {/* Timeline Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      Ticket #{activeTicket.ticket_number}
                    </span>
                    <StatusBadge status={activeTicket.status} />
                    <PriorityBadge priority={activeTicket.priority} />
                  </div>

                  {/* Real-Time Live Status Indicator */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        sseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                      }`}
                    />
                    <span className="text-slate-500 text-[11px]">
                      {sseConnected ? 'Live Connection Active' : 'Connecting Stream...'}
                    </span>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-slate-900 mt-2">
                  {activeTicket.subject}
                </h2>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                  <CategoryBadge category={activeTicket.category} />
                  {activeTicket.book_title && (
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <Book className="w-3.5 h-3.5 text-slate-400" />
                      {activeTicket.book_title}
                    </span>
                  )}
                  <span>Opened on {formatDate(activeTicket.created_at)}</span>
                </div>
              </div>

              {/* Message Chat Feed */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30">
                {messages.map((m) => {
                  const isAdminMsg = m.sender_role === 'ADMIN';

                  return (
                    <div
                      key={m.id}
                      className={`flex gap-3 max-w-2xl ${
                        isAdminMsg ? 'mr-auto' : 'ml-auto flex-row-reverse'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isAdminMsg
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isAdminMsg ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>

                      <div
                        className={`p-4 rounded-2xl shadow-xs text-sm ${
                          isAdminMsg
                            ? 'bg-white border border-purple-100 text-slate-800'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        <div
                          className={`text-xs font-semibold mb-1 flex items-center justify-between gap-4 ${
                            isAdminMsg ? 'text-purple-900' : 'text-emerald-100'
                          }`}
                        >
                          <span>{isAdminMsg ? 'BookLeaf Operations Team' : 'You'}</span>
                          <span className="text-[10px] font-normal opacity-75">
                            {formatDate(m.created_at)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-slate-200 bg-white">
                {activeTicket.status === 'CLOSED' ? (
                  <div className="text-center py-2 text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                    This ticket has been marked as closed. Raise a new query if you have further questions.
                  </div>
                ) : (
                  <form onSubmit={handleSendReply} className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response to the operations team..."
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs transition disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      Reply
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
              <MessageSquare className="w-12 h-12 mb-2 stroke-1" />
              <p className="text-sm">Select a ticket from the left to view the live conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};