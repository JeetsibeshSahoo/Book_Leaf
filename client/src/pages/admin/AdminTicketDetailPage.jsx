import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient, { SERVER_BASE_URL } from '../../api/client.js';
import { StatusBadge, PriorityBadge } from '../../components/Badges.jsx';
import {
  ArrowLeft,
  Sparkles,
  Send,
  User,
  Book,
  Lock,
  CheckCircle2,
  Shield,
  Edit3,
  RefreshCw,
} from 'lucide-react';


export const AdminTicketDetailPage = () => {
  const { id } = useParams();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [internalNotes, setInternalNotes] = useState([]);

  // Active form inputs
  const [replyText, setReplyText] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [aiDraft, setAiDraft] = useState('');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);

  const messagesEndRef = useRef(null);

  // 1. Fetch full admin ticket details
  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/admin/tickets/${id}`);
      if (res.success) {
        setTicket(res.ticket);
        setMessages(res.messages || []);
        setInternalNotes(res.internalNotes || []);
        if (res.ticket.ai_draft_response) {
          setAiDraft(res.ticket.ai_draft_response);
        }
      }
    } catch (err) {
      console.error('Failed to load admin ticket view:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

  // 2. Server-Sent Events (SSE) live updates
  useEffect(() => {
    if (!id) return;

    const sseUrl = `${SERVER_BASE_URL}/api/tickets/${id}/stream`;
    const es = new EventSource(sseUrl);

    es.addEventListener('new_message', (e) => {
      try {
        const newMsg = JSON.parse(e.data);
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      } catch (err) {
        console.warn('Error parsing SSE new_message:', err);
      }
    });

    es.addEventListener('ticket_updated', (e) => {
      try {
        const updated = JSON.parse(e.data);
        setTicket((prev) => (prev ? { ...prev, ...updated } : prev));
      } catch (err) {
        console.warn('Error parsing SSE ticket_updated:', err);
      }
    });

    return () => es.close();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Trigger AI Draft Generation from BookLeaf Knowledge Base
  const handleGenerateAiDraft = async () => {
    try {
      setGeneratingDraft(true);
      const res = await apiClient.post(`/admin/tickets/${id}/generate-draft`);
      if (res.success && res.draft) {
        setAiDraft(res.draft);
      }
    } catch (err) {
      alert(err.message || 'Failed to generate AI draft');
    } finally {
      setGeneratingDraft(false);
    }
  };

  // 4. Copy AI draft to editable reply box
  const handleUseDraft = () => {
    if (aiDraft) {
      setReplyText(aiDraft);
    }
  };

  // 5. Send public reply message to author
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setSendingReply(true);
      const res = await apiClient.post(`/tickets/${id}/messages`, {
        message: replyText.trim(),
      });
      if (res.success) {
        setReplyText('');
        // Automatically move ticket from OPEN to IN_PROGRESS if open
        if (ticket.status === 'OPEN') {
          handleStatusChange('IN_PROGRESS');
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  // 6. Add internal ops note (confidential)
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    try {
      setAddingNote(true);
      const res = await apiClient.post(`/admin/tickets/${id}/notes`, {
        note: newNoteText.trim(),
      });
      if (res.success && res.note) {
        setInternalNotes((prev) => [...prev, res.note]);
        setNewNoteText('');
      }
    } catch (err) {
      alert(err.message || 'Failed to add internal note');
    } finally {
      setAddingNote(false);
    }
  };

  // 7. Manual Overrides (Status, Category, Priority)
  const handleStatusChange = async (newStatus) => {
    try {
      setUpdatingTicket(true);
      const res = await apiClient.patch(`/admin/tickets/${id}`, { status: newStatus });
      if (res.success) {
        setTicket((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleCategoryOverride = async (newCategory) => {
    try {
      setUpdatingTicket(true);
      const res = await apiClient.patch(`/admin/tickets/${id}`, { category: newCategory });
      if (res.success) {
        setTicket((prev) => ({ ...prev, category: newCategory }));
      }
    } catch (err) {
      alert(err.message || 'Failed to override category');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handlePriorityOverride = async (newPriority) => {
    try {
      setUpdatingTicket(true);
      const res = await apiClient.patch(`/admin/tickets/${id}`, { priority: newPriority });
      if (res.success) {
        setTicket((prev) => ({ ...prev, priority: newPriority }));
      }
    } catch (err) {
      alert(err.message || 'Failed to override priority');
    } finally {
      setUpdatingTicket(false);
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

  if (loading) {
    return (
      <div className="py-24 flex justify-center items-center">
        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-slate-500">
        Ticket not found.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Bar with Navigation & Quick Status Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <Link
          to="/admin/queue"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Ticket Queue
        </Link>

        {/* Status Action Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Set Status:</span>
          {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={updatingTicket || ticket.status === s}
              className={`px-3 py-1 rounded-md text-xs font-semibold border transition ${
                ticket.status === s
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Left Column (Chat & AI Workspace) + Right Column (Context & Notes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Ticket Timeline & AI Response Box (7 cols)  */}
        <div className="lg:col-span-7 space-y-6">
          {/* Ticket Header Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-900 font-mono">
                Ticket #{ticket.ticket_number}
              </span>
              <div className="flex items-center gap-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </div>
            </div>

            <h1 className="text-xl font-bold text-slate-900 leading-snug">
              {ticket.subject}
            </h1>

            {/* AI Auto-Triage & Manual Overrides Row */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs bg-slate-50/70 p-3 rounded-lg">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span className="font-semibold text-slate-700">Category Override:</span>
                <select
                  value={ticket.category}
                  onChange={(e) => handleCategoryOverride(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium text-slate-800"
                >
                  <option value="ROYALTY_AND_PAYMENTS">Royalty & Payments</option>
                  <option value="ISBN_AND_METADATA">ISBN & Metadata</option>
                  <option value="PRINTING_AND_QUALITY">Printing & Quality</option>
                  <option value="DISTRIBUTION_AND_AVAILABILITY">Distribution</option>
                  <option value="BOOK_STATUS_AND_PRODUCTION">Production Status</option>
                  <option value="GENERAL_INQUIRY">General Inquiry</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Priority Override:</span>
                <select
                  value={ticket.priority}
                  onChange={(e) => handlePriorityOverride(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium text-slate-800"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>
          </div>

          {/* AI-Drafted Response Box (BookLeaf Knowledge Base Integration) */}
          <div className="bg-gradient-to-br from-purple-50/70 to-indigo-50/40 p-5 rounded-xl border border-purple-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-purple-950">
                    BookLeaf AI Draft Assistant
                  </h3>
                  <p className="text-[11px] text-purple-700">
                    Trained on BookLeaf policies (80/20 royalty, 45-day window, 5-7d reprint, Delhi facility)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateAiDraft}
                disabled={generatingDraft}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-60"
              >
                {generatingDraft ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Consulting KB...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{aiDraft ? 'Regenerate Draft' : 'Generate AI Draft'}</span>
                  </>
                )}
              </button>
            </div>

            {aiDraft ? (
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-lg border border-purple-200/80 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap max-h-56 overflow-y-auto shadow-2xs">
                  {aiDraft}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-purple-800 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Draft formulated using author financial & policy context
                  </span>
                  <button
                    type="button"
                    onClick={handleUseDraft}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-purple-50 text-purple-900 border border-purple-300 rounded-md text-xs font-semibold transition shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-purple-600" />
                    Copy to Editor & Send
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-purple-700/80 italic">
                Click "Generate AI Draft" to synthesize an empathetic reply citing exact BookLeaf turnaround timelines and author account figures.
              </p>
            )}
          </div>

          {/* Conversation Messages Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Author & Team Discussion ({messages.length})
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">● Real-time Live</span>
            </div>

            <div className="p-5 space-y-4 max-h-[420px] overflow-y-auto bg-slate-50/30">
              {messages.map((m) => {
                const isAdmin = m.sender_role === 'ADMIN';

                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 max-w-xl ${
                      isAdmin ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        isAdmin
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isAdmin ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl shadow-xs text-xs leading-relaxed ${
                        isAdmin
                          ? 'bg-purple-700 text-white'
                          : 'bg-white border border-slate-200 text-slate-800'
                      }`}
                    >
                      <div
                        className={`text-[10px] font-semibold mb-1 flex items-center justify-between gap-4 ${
                          isAdmin ? 'text-purple-200' : 'text-slate-400'
                        }`}
                      >
                        <span>{isAdmin ? 'You (BookLeaf Ops)' : ticket.author_name}</span>
                        <span>{formatDate(m.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Editable Response Editor */}
            <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 bg-white space-y-3">
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your response to the author (or click 'Copy to Editor' from AI Draft above)..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition"
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Visible to author immediately upon sending.
                </span>
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to Author</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Author Context & Confidential Notes (5 cols)*/}
        <div className="lg:col-span-5 space-y-6">
          {/* Author Details & Book Stats Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Author Account Context</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Name:</span>
                <span className="font-semibold text-slate-900">{ticket.author_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-700">{ticket.author_email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Location:</span>
                <span className="text-slate-700">{ticket.author_city || 'India'}</span>
              </div>
              {ticket.author_phone && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-mono text-slate-700">{ticket.author_phone}</span>
                </div>
              )}
            </div>

            {/* Book Specific Context */}
            {ticket.book_title ? (
              <div className="mt-4 pt-3 border-t border-slate-200 bg-slate-50 p-3.5 rounded-lg space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Book className="w-3.5 h-3.5 text-purple-600" />
                  <span>Book: {ticket.book_title}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 block">Status:</span>
                    <span className="font-semibold text-slate-800">{ticket.book_status}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Pending Royalty:</span>
                    <span className="font-bold text-amber-600">₹{ticket.royalty_pending ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Sold:</span>
                    <span className="font-semibold text-slate-800">{ticket.total_copies_sold ?? 0} copies</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Print Partner:</span>
                    <span className="text-slate-700">{ticket.print_partner || 'In-House'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 text-slate-500 text-xs rounded-lg italic text-center">
                Query is at General / Account Level.
              </div>
            )}
          </div>

          {/* Internal Notes Panel (Strictly Hidden from Author) */}
          <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-1.5 text-amber-900">
                <Lock className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold">Internal Ops Notes</h3>
              </div>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                Confidential
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              Notes here are strictly visible to BookLeaf operations staff and are never sent or visible to authors.
            </p>

            {/* Existing Notes Feed */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto">
              {internalNotes.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 italic">
                  No internal notes recorded yet.
                </div>
              ) : (
                internalNotes.map((n) => (
                  <div key={n.id} className="p-3 bg-white rounded-lg border border-amber-200/70 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-700">{n.admin_name}</span>
                      <span>{formatDate(n.created_at)}</span>
                    </div>
                    <p className="text-slate-800 whitespace-pre-wrap">{n.note}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add New Note */}
            <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-amber-100">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Add private note (e.g. Verified batch with Delhi press)..."
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <button
                type="submit"
                disabled={addingNote || !newNoteText.trim()}
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold transition disabled:opacity-50"
              >
                {addingNote ? 'Saving...' : 'Add Internal Note'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};