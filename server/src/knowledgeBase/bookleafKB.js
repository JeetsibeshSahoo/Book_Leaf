import { TICKET_CATEGORIES } from '../constants/ticketConstants.js';

/**
 * Core BookLeaf Tone and Voice Guidelines.
 * Applied across all generated responses.
 */
export const TONE_GUIDELINES = `
BOOKLEAF COMMUNICATION TONE & PRINCIPLES:
- Empathetic and professional: Authors are our creative partners, never treat them as mere customers.
- Acknowledge before solving: Validate the author's frustration or concern first before providing solutions.
- Be concrete: Always use specific numbers, dates, thresholds, and turnaround timelines. Never give vague reassurances.
- Direct ownership: If something is BookLeaf's responsibility (delayed payout, ISBN mismatch, print defect), own it transparently without corporate deflection.
- Clear investigation timelines: If an issue requires escalation, provide an exact commitment: "Our team will look into this and get back to you within 48 hours."
- Actionable closing: Always conclude with a clear, definite next step for the author or the BookLeaf team.
`.trim();

/**
 * Modular Knowledge Base Sections extracted directly from BookLeaf Operations Manual.
 */
export const KNOWLEDGE_BASE_SECTIONS = Object.freeze({
  COMPANY_OVERVIEW: `
BookLeaf Publishing operates in India and the US.
- Publishing Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium with distribution & marketing).
- Facilities: In-house printing facility and warehouse located in Delhi. Print partners: Repro India and Epitome Books.
- Services: Cover design, typesetting, proofreading, ISBN assignment, printing, distribution, and royalty management.
  `.trim(),

  [TICKET_CATEGORIES.ROYALTY_AND_PAYMENTS]: `
ROYALTY POLICY & CALCULATION:
- Royalty Split: 80/20 (80% of net profit goes to author, 20% to BookLeaf).
- Net Profit Formula: MRP minus printing cost, platform sales commission (Amazon/Flipkart), and shipping charges.
- Payment Cycle: Calculated quarterly and paid within 45 days of quarter ending.
- Payout Threshold: Minimum payout is ₹1,000. Accumulated amounts below ₹1,000 automatically roll over to the next quarter.
- Payment Method: Direct bank transfer to the bank account linked in the author's dashboard.
- Author Transparency: Authors can view sales figures per platform in their dashboard. Always offer to share a line-by-line royalty breakdown.
  `.trim(),

  [TICKET_CATEGORIES.ISBN_AND_METADATA]: `
ISBN POLICY & METADATA GUIDELINES:
- Imprint Assignment: Unique ISBNs assigned by BookLeaf are registered under BookLeaf's publisher imprint.
- Independent Imprints: If author desires their own imprint, they must obtain it independently.
- ISBN Errors: Any duplicate or wrong book linked is treated as a CRITICAL/HIGH priority data defect and immediately escalated to the production team with a 48-hour resolution timeline.
- Metadata Updates: Title, subtitle, or description updates can be submitted via the dashboard; updates reflect on retail channels within 3–5 business days.
  `.trim(),

  [TICKET_CATEGORIES.PRINTING_AND_QUALITY]: `
PRINTING & QUALITY ASSURANCE POLICY:
- Printing Facilities: In-house Delhi printing facility handles standard orders; overflow or specialty formats go to Repro India or Epitome Books.
- Standard Turnaround: 5–7 business days from order confirmation.
- Defect Policy: For misprints, binding defects, or color inconsistency, BookLeaf provides a 100% FREE reprint after photo verification.
- Action required: Sincerely apologize, ask author for photos of defective copies, and commit to a 5–7 business day reprint once confirmed.
  `.trim(),

  [TICKET_CATEGORIES.DISTRIBUTION_AND_AVAILABILITY]: `
DISTRIBUTION & RETAIL CHANNELS:
- Active Platforms: Amazon India, Flipkart, Amazon US, Amazon UK, and BookLeaf Store.
- Listing Turnaround: New book listings typically go live within 7–10 business days after publication is complete.
- "Currently Unavailable" Status: Usually caused by automated distributor stock sync delays. BookLeaf operations can manually trigger a re-sync with distribution partners within 24–48 hours to restore availability.
  `.trim(),

  [TICKET_CATEGORIES.BOOK_STATUS_AND_PRODUCTION]: `
PRODUCTION STAGES & TIMELINES:
- Standard Workflow: Manuscript Received -> Editing (if opted) -> Cover Design -> Typesetting -> Proofreading -> ISBN Assignment -> Printing -> Distribution Setup -> Published & Live.
- Notification: Authors receive automated email updates at every milestone.
- Common Delays: Cover Design (author approval waiting) and Proofreading (revision cycles). Always check actual progress and explain collaboratively without placing blame on the author.
  `.trim(),

  [TICKET_CATEGORIES.GENERAL_INQUIRY]: `
GENERAL OPERATIONS & ACCOUNT INQUIRIES:
- Authors can update profile details and bank accounts in the author dashboard.
- Support turnaround for general queries is 24–48 hours.
  `.trim(),
});

export const getRelevantKnowledgeContext = (category) => {
  const parts = [];

  // 1. Always include core tone guidelines (crucial for empathy and brand consistency)
  parts.push(TONE_GUIDELINES);

  // 2. Add targeted category policy if available
  if (category && KNOWLEDGE_BASE_SECTIONS[category]) {
    parts.push(`RELEVANT BOOKLEAF POLICY:\n${KNOWLEDGE_BASE_SECTIONS[category]}`);
  } else {
    // Fallback for general inquiries: include brief company overview
    parts.push(`BOOKLEAF CONTEXT:\n${KNOWLEDGE_BASE_SECTIONS.COMPANY_OVERVIEW}`);
  }

  return parts.join('\n\n');
};