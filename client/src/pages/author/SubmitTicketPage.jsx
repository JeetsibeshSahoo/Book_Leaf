import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../api/client.js';
import {
  Send,
  Paperclip,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const SubmitTicketPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialBookId = searchParams.get('bookId') || 'GENERAL';

  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(initialBookId);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // Fetch author's books to populate the dropdown
  useEffect(() => {
    apiClient
      .get('/books')
      .then((res) => {
        if (res.success && Array.isArray(res.books)) {
          setBooks(res.books);
        }
      })
      .catch((err) => console.warn('Could not load books for ticket dropdown:', err.message));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        subject: subject.trim(),
        description: description.trim(),
        bookId: selectedBook === 'GENERAL' ? null : selectedBook,
      };

      const res = await apiClient.post('/tickets', payload);

      if (res.success) {
        setSuccessInfo({
          ticketNumber: res.ticket.ticket_number,
          id: res.ticket.id,
          aiTriage: res.aiTriage,
        });

        // Redirect to author's tickets list after brief 2-second success animation
        setTimeout(() => {
          navigate('/my-tickets');
        }, 2200);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit ticket. Please try again.');
      setSubmitting(false);
    }
  };

  const handleFakeFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Back button */}
      <Link
        to="/my-books"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
          <h1 className="text-xl font-bold text-slate-900">Raise a Support Query</h1>
          <p className="text-xs text-slate-500 mt-1">
            Our author support team and automated tracking will triage your request immediately.
          </p>
        </div>

        {/* Success Modal / Banner */}
        {successInfo ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Ticket #{successInfo.ticketNumber} Created!
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Your inquiry has been submitted and queued for the BookLeaf Operations Team. Redirecting to your tickets...
            </p>
            {successInfo.aiTriage && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs rounded-full border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Auto-Triaged as:{' '}
                  <strong className="capitalize">
                    {successInfo.aiTriage.category.replace(/_/g, ' ')}
                  </strong>{' '}
                  (Priority: {successInfo.aiTriage.priority})
                </span>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Select Associated Book */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-wider mb-1.5">
                Related Book (or General Inquiry)
              </label>
              <select
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
              >
                <option value="GENERAL">General / Account Level Query (Not Book Specific)</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.book_id}) — {b.status}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Select a specific book so our team can immediately look up production, royalty, and retailer stock data.
              </p>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-wider mb-1.5">
                Subject Line
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Inconsistency in Q3 royalty calculation or Print binding defect"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-wider mb-1.5">
                Detailed Description
              </label>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe your query in detail. Include any order numbers, platform details, or dates if applicable..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            </div>

            {/* Optional Attachment (UI placeholder as per assignment spec) */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 tracking-wider mb-1.5">
                Supporting Attachment (Optional)
              </label>
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-lg p-4 text-center bg-slate-50/50 transition">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFakeFileChange}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-1"
                >
                  <Paperclip className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">
                    {fileName ? (
                      <span className="text-emerald-700 font-semibold">{fileName}</span>
                    ) : (
                      'Click to attach screenshot, royalty report, or defect photo'
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400">PNG, JPG, PDF up to 10MB</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3 flex items-center justify-end gap-3">
              <Link
                to="/my-books"
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs transition disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing & Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Query</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};