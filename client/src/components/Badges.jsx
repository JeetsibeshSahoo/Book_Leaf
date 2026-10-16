import React from 'react';

export const PriorityBadge = ({ priority }) => {
  const p = (priority || 'MEDIUM').toUpperCase();

  const styles = {
    CRITICAL: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
    HIGH: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
    MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
    LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${
        styles[p] || styles.MEDIUM
      }`}
    >
      ● {p}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const s = (status || 'OPEN').toUpperCase();

  const styles = {
    OPEN: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-300',
    RESOLVED: 'bg-blue-100 text-blue-800 border-blue-300',
    CLOSED: 'bg-gray-100 text-gray-700 border-gray-300',
  };

  const labels = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        styles[s] || styles.OPEN
      }`}
    >
      {labels[s] || s}
    </span>
  );
};


export const CategoryBadge = ({ category }) => {
  const labels = {
    ROYALTY_AND_PAYMENTS: 'Royalty & Payments',
    ISBN_AND_METADATA: 'ISBN & Metadata',
    PRINTING_AND_QUALITY: 'Printing & Quality',
    DISTRIBUTION_AND_AVAILABILITY: 'Distribution',
    BOOK_STATUS_AND_PRODUCTION: 'Production Status',
    GENERAL_INQUIRY: 'General Inquiry',
  };

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
      {labels[category] || category || 'General'}
    </span>
  );
};