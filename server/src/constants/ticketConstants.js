// Ticket Categories exactly as mandated by the BookLeaf specification.
export const TICKET_CATEGORIES = Object.freeze({
  ROYALTY_AND_PAYMENTS: 'ROYALTY_AND_PAYMENTS',
  ISBN_AND_METADATA: 'ISBN_AND_METADATA',
  PRINTING_AND_QUALITY: 'PRINTING_AND_QUALITY',
  DISTRIBUTION_AND_AVAILABILITY: 'DISTRIBUTION_AND_AVAILABILITY',
  BOOK_STATUS_AND_PRODUCTION: 'BOOK_STATUS_AND_PRODUCTION',
  GENERAL_INQUIRY: 'GENERAL_INQUIRY',
});

// Human-readable category labels for UI and AI prompt generation
export const CATEGORY_LABELS = Object.freeze({
  [TICKET_CATEGORIES.ROYALTY_AND_PAYMENTS]: 'Royalty & Payments',
  [TICKET_CATEGORIES.ISBN_AND_METADATA]: 'ISBN & Metadata Issues',
  [TICKET_CATEGORIES.PRINTING_AND_QUALITY]: 'Printing & Quality',
  [TICKET_CATEGORIES.DISTRIBUTION_AND_AVAILABILITY]: 'Distribution & Availability',
  [TICKET_CATEGORIES.BOOK_STATUS_AND_PRODUCTION]: 'Book Status & Production Updates',
  [TICKET_CATEGORIES.GENERAL_INQUIRY]: 'General Inquiry',
});

// Ticket Priority Levels
export const TICKET_PRIORITIES = Object.freeze({
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
});

// Ticket Lifecycle Statuses
export const TICKET_STATUSES = Object.freeze({
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
});

// User Roles
export const USER_ROLES = Object.freeze({
  AUTHOR: 'AUTHOR',
  ADMIN: 'ADMIN',
});

// Helper arrays for validation checks in controllers and AI responses
export const VALID_CATEGORIES = Object.values(TICKET_CATEGORIES);
export const VALID_PRIORITIES = Object.values(TICKET_PRIORITIES);
export const VALID_STATUSES = Object.values(TICKET_STATUSES);
export const VALID_ROLES = Object.values(USER_ROLES);