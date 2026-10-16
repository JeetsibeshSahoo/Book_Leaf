import {
  CATEGORY_LABELS
} from '../constants/ticketConstants.js';
import { getRelevantKnowledgeContext } from '../knowledgeBase/bookleafKB.js';

/**
 * Builds a structured prompt for AI Auto-Classification & Priority Scoring.
 * Uses strict JSON schema instructions for deterministic parsing.
 */
export const buildClassificationAndPriorityPrompt = ({ subject, description, bookTitle }) => {
  const categoriesList = Object.entries(CATEGORY_LABELS)
    .map(([key, label]) => `- "${key}": ${label}`)
    .join('\n');

  return `
You are an expert triage assistant for BookLeaf Publishing support operations.
Analyze the following incoming author ticket and output a valid JSON object with category classification and priority score.

AVAILABLE CATEGORIES:
${categoriesList}

PRIORITY CRITERIA:
- "CRITICAL": Severe data corruption (ISBN mismatches on retail platforms), major printing batch defects (misprints/binding failures), or legal/contractual escalations.
- "HIGH": Long-overdue royalties, book showing unavailable on retail stores during launch, or broken production timelines exceeding 2 weeks.
- "MEDIUM": Clarifications on royalty calculations, general production timeline queries, or standard metadata updates.
- "LOW": Simple account bio questions, marketing inquiries, general platform questions, or compliments.

TICKET DATA TO ANALYZE:
- Subject: ${subject}
- Description: ${description}
- Associated Book: ${bookTitle || 'General / Account Level'}

RESPONSE FORMAT:
You MUST respond with ONLY a raw JSON object (no markdown code blocks, no text before or after).
{
  "category": "ONE_OF_THE_CATEGORY_KEYS_ABOVE",
  "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief 1-sentence justification"
}
`.trim();
};

/**
 * Builds an empathetic, context-aware prompt for drafting admin responses.
 * Combines author details, book financial state, and BookLeaf policies.
 */
export const buildDraftResponsePrompt = ({ ticket, author, book, messages = [] }) => {
  // Retrieve token-optimized KB policy for this ticket's category
  const relevantPolicy = getRelevantKnowledgeContext(ticket.category);

  // Format real book context so the AI can quote specific numbers
  let bookContextText = 'Query is at General / Account level (not linked to a specific book).';
  if (book) {
    bookContextText = `
Book Title: "${book.title}" (ID: ${book.book_id})
- Status: ${book.status}
- ISBN: ${book.isbn || 'Not yet assigned (in production)'}
- MRP: ${book.mrp ? '₹' + book.mrp : 'N/A (in production)'}
- Copies Sold: ${book.total_copies_sold}
- Total Royalty Earned: ₹${book.total_royalty_earned}
- Royalty Paid: ₹${book.royalty_paid}
- Royalty Pending: ₹${book.royalty_pending}
- Last Payout Date: ${book.last_payout_date ? new Date(book.last_payout_date).toISOString().split('T')[0] : 'None'}
- Print Partner: ${book.print_partner || 'In-House'}
- Platforms: ${Array.isArray(book.available_on) && book.available_on.length > 0 ? book.available_on.join(', ') : 'None'}
    `.trim();
  }

  // Format past conversation if any exists
  let messageHistory = '';
  if (messages.length > 0) {
    messageHistory = messages
      .slice(-3) // Take last 3 messages to avoid token bloat
      .map((m) => `${m.sender_role === 'ADMIN' ? 'BookLeaf Team' : author.name}: ${m.message}`)
      .join('\n');
  }

  return `
You are drafting a professional, empathetic email response on behalf of the BookLeaf Publishing Operations Team to author ${author.name}.

${relevantPolicy}

AUTHOR ACCOUNT & CONTEXT:
- Author Name: ${author.name}
- Author Email: ${author.email}
- City: ${author.city || 'India'}
- Associated Book Details:
${bookContextText}

SUPPORT TICKET DETAILS:
- Ticket Category: ${CATEGORY_LABELS[ticket.category] || ticket.category}
- Priority: ${ticket.priority}
- Subject: ${ticket.subject}
- Author's Message: "${ticket.description}"
${messageHistory ? `\nRECENT CONVERSATION HISTORY:\n${messageHistory}` : ''}

INSTRUCTIONS FOR THE RESPONSE:
1. Address author warmly by their first name (${author.name.split(' ')[0]}).
2. Empathize with their situation first.
3. Be specific and factual: If they ask about royalties, refer to their exact pending amount (₹${book?.royalty_pending ?? 0}), the 80/20 split, the quarterly cycle, and 45-day window. If they ask about printing defects, apologize sincerely and ask for photos for a free reprint within 5-7 business days. If ISBN issue, escalate with a 48-hour resolution timeline.
4. Own any issue directly without excuses.
5. End with a polite closing and the author's next step, signed as "Team BookLeaf".
6. Do NOT invent fake phone numbers or fake links. Output ONLY the drafted email message.
`.trim();
};