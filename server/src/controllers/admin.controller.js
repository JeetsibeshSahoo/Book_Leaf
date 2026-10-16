import db from '../db/index.js';
import { ApiError } from '../middlewares/error.middleware.js';
import {
  VALID_CATEGORIES,
  VALID_PRIORITIES,
  VALID_STATUSES,
} from '../constants/ticketConstants.js';
import { generateDraftResponse } from '../services/ai.service.js';
import {
  subscribeToQueue,
  broadcastTicketUpdate,
  broadcastQueueUpdate,
} from '../services/sse.service.js';

/**
 * Get Ticket Queue with filters and urgency sorting
 * GET /api/admin/tickets
 */
export const getTicketQueue = async (req, res, next) => {
  try {
    const { status, category, priority, sortBy = 'urgent' } = req.query;

    const conditions = [];
    const params = [];

    // Filter by status
    if (status && VALID_STATUSES.includes(status.toUpperCase())) {
      params.push(status.toUpperCase());
      conditions.push(`t.status = $${params.length}`);
    }

    // Filter by category
    if (category && VALID_CATEGORIES.includes(category.toUpperCase())) {
      params.push(category.toUpperCase());
      conditions.push(`t.category = $${params.length}`);
    }

    // Filter by priority
    if (priority && VALID_PRIORITIES.includes(priority.toUpperCase())) {
      params.push(priority.toUpperCase());
      conditions.push(`t.priority = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Smart Sorting: Urgency order (CRITICAL -> HIGH -> MEDIUM -> LOW) and oldest tickets first
    let orderByClause = `
      ORDER BY 
        CASE t.status 
          WHEN 'OPEN' THEN 1 
          WHEN 'IN_PROGRESS' THEN 2 
          WHEN 'RESOLVED' THEN 3 
          ELSE 4 
        END ASC,
        CASE t.priority 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          ELSE 4 
        END ASC,
        t.created_at ASC
    `;

    if (sortBy === 'newest') {
      orderByClause = 'ORDER BY t.created_at DESC';
    } else if (sortBy === 'oldest') {
      orderByClause = 'ORDER BY t.created_at ASC';
    }

    const queryText = `
      SELECT 
        t.id,
        t.ticket_number,
        t.subject,
        t.description,
        t.status,
        t.category,
        t.ai_category,
        t.priority,
        t.ai_priority,
        t.ai_confidence,
        t.ai_draft_response,
        t.created_at,
        t.updated_at,
        u.id AS author_id,
        u.name AS author_name,
        u.email AS author_email,
        u.city AS author_city,
        b.id AS book_uuid,
        b.book_id,
        b.title AS book_title,
        b.royalty_pending,
        admin.name AS assigned_to_name,
        (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id = t.id) AS message_count,
        (SELECT COUNT(*) FROM internal_notes inote WHERE inote.ticket_id = t.id) AS internal_notes_count
      FROM tickets t
      JOIN users u ON t.author_id = u.id
      LEFT JOIN books b ON t.book_id = b.id
      LEFT JOIN users admin ON t.assigned_to_id = admin.id
      ${whereClause}
      ${orderByClause}
    `;

    const result = await db.query(queryText, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      tickets: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed ticket view for Admin (Includes internal notes and AI draft)
 * GET /api/admin/tickets/:id
 */
export const getAdminTicketDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Fetch ticket and author details (casting t.id::text to match text parameter)
    const ticketSql = `
      SELECT 
        t.*,
        u.name AS author_name,
        u.email AS author_email,
        u.phone AS author_phone,
        u.city AS author_city,
        u.author_id AS author_code,
        b.book_id,
        b.title AS book_title,
        b.isbn AS book_isbn,
        b.genre AS book_genre,
        b.status AS book_status,
        b.mrp AS book_mrp,
        b.total_copies_sold,
        b.total_royalty_earned,
        b.royalty_paid,
        b.royalty_pending,
        b.last_payout_date,
        b.print_partner,
        b.available_on,
        admin.name AS assigned_to_name
      FROM tickets t
      JOIN users u ON t.author_id = u.id
      LEFT JOIN books b ON t.book_id = b.id
      LEFT JOIN users admin ON t.assigned_to_id = admin.id
      WHERE t.id::text = $1 OR t.ticket_number::text = $1
    `;
    const ticketRes = await db.query(ticketSql, [id]);

    if (ticketRes.rows.length === 0) {
      throw ApiError.notFound('Ticket not found.');
    }

    const ticket = ticketRes.rows[0];

    // 2. Fetch public messages
    const messagesSql = `
      SELECT tm.id, tm.message, tm.created_at, u.id AS sender_id, u.name AS sender_name, u.role AS sender_role
      FROM ticket_messages tm
      JOIN users u ON tm.sender_id = u.id
      WHERE tm.ticket_id = $1
      ORDER BY tm.created_at ASC
    `;
    const messagesRes = await db.query(messagesSql, [ticket.id]);

    // 3. Fetch private internal ops notes (admin only)
    const notesSql = `
      SELECT inote.id, inote.note, inote.created_at, u.name AS admin_name
      FROM internal_notes inote
      JOIN users u ON inote.admin_id = u.id
      WHERE inote.ticket_id = $1
      ORDER BY inote.created_at ASC
    `;
    const notesRes = await db.query(notesSql, [ticket.id]);

    return res.status(200).json({
      success: true,
      ticket,
      messages: messagesRes.rows,
      internalNotes: notesRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate (or Regenerate) an AI Draft Response using BookLeaf Knowledge Base
 * POST /api/admin/tickets/:id/generate-draft
 */
export const requestAiDraft = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch ticket, author, book, and conversation history
    const ticketSql = `
      SELECT 
        t.*,
        u.id AS author_db_id,
        u.name AS author_name,
        u.email AS author_email,
        u.city AS author_city,
        b.book_id,
        b.title AS book_title,
        b.isbn,
        b.status AS book_status,
        b.mrp,
        b.total_copies_sold,
        b.total_royalty_earned,
        b.royalty_paid,
        b.royalty_pending,
        b.last_payout_date,
        b.print_partner,
        b.available_on
      FROM tickets t
      JOIN users u ON t.author_id = u.id
      LEFT JOIN books b ON t.book_id = b.id
      WHERE t.id::text = $1 OR t.ticket_number::text = $1
    `;
    const ticketRes = await db.query(ticketSql, [id]);

    if (ticketRes.rows.length === 0) {
      throw ApiError.notFound('Ticket not found.');
    }

    const t = ticketRes.rows[0];

    // Fetch conversation history
    const msgRes = await db.query(
      `SELECT tm.message, u.role AS sender_role 
       FROM ticket_messages tm 
       JOIN users u ON tm.sender_id = u.id 
       WHERE tm.ticket_id = $1 
       ORDER BY tm.created_at ASC`,
      [t.id]
    );

    const authorObj = {
      name: t.author_name,
      email: t.author_email,
      city: t.author_city,
    };

    const bookObj = t.book_title
      ? {
          book_id: t.book_id,
          title: t.book_title,
          isbn: t.isbn,
          status: t.book_status,
          mrp: t.mrp,
          total_copies_sold: t.total_copies_sold,
          total_royalty_earned: t.total_royalty_earned,
          royalty_paid: t.royalty_paid,
          royalty_pending: t.royalty_pending,
          last_payout_date: t.last_payout_date,
          print_partner: t.print_partner,
          available_on: t.available_on,
        }
      : null;

    // Invoke Gemini AI Draft generator
    const draftResult = await generateDraftResponse({
      ticket: t,
      author: authorObj,
      book: bookObj,
      messages: msgRes.rows,
    });

    // Cache generated draft in PostgreSQL
    await db.query(
      'UPDATE tickets SET ai_draft_response = $1, ai_drafted_at = NOW() WHERE id = $2',
      [draftResult.draft, t.id]
    );

    return res.status(200).json({
      success: true,
      draft: draftResult.draft,
      isAiGenerated: draftResult.isAiGenerated,
      modelUsed: draftResult.modelUsed,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Ticket Details (Status, Category Override, Priority Override, Assignment)
 * PATCH /api/admin/tickets/:id
 */
export const updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, category, priority, assignedToId } = req.body;

    const updates = [];
    const params = [];

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        throw ApiError.badRequest(`Invalid status: ${status}`);
      }
      params.push(status);
      updates.push(`status = $${params.length}`);
    }

    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        throw ApiError.badRequest(`Invalid category: ${category}`);
      }
      params.push(category);
      updates.push(`category = $${params.length}`);
    }

    if (priority) {
      if (!VALID_PRIORITIES.includes(priority)) {
        throw ApiError.badRequest(`Invalid priority: ${priority}`);
      }
      params.push(priority);
      updates.push(`priority = $${params.length}`);
    }

    if (assignedToId !== undefined) {
      params.push(assignedToId || null);
      updates.push(`assigned_to_id = $${params.length}`);
    }

    if (updates.length === 0) {
      throw ApiError.badRequest('No valid fields provided for update.');
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    const updateSql = `
      UPDATE tickets 
      SET ${updates.join(', ')} 
      WHERE id::text = $${params.length} 
      RETURNING *
    `;
    const result = await db.query(updateSql, params);

    if (result.rows.length === 0) {
      throw ApiError.notFound('Ticket not found.');
    }

    const updatedTicket = result.rows[0];

    // Broadcast real-time updates to ticket timeline and admin queue
    broadcastTicketUpdate(updatedTicket.id, 'ticket_updated', updatedTicket);
    broadcastQueueUpdate('ticket_updated', updatedTicket);

    return res.status(200).json({
      success: true,
      message: 'Ticket updated successfully.',
      ticket: updatedTicket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add an Internal Ops Note (Visible to Admins ONLY)
 * POST /api/admin/tickets/:id/notes
 */
export const addInternalNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const adminId = req.user.id;

    if (!note || !note.trim()) {
      throw ApiError.badRequest('Note content cannot be empty.');
    }

    // Resolve ticket UUID if passed as text/ticket_number
    const tCheck = await db.query('SELECT id FROM tickets WHERE id::text = $1 OR ticket_number::text = $1', [id]);
    if (tCheck.rows.length === 0) {
      throw ApiError.notFound('Ticket not found.');
    }
    const realTicketId = tCheck.rows[0].id;

    const insertSql = `
      INSERT INTO internal_notes (ticket_id, admin_id, note)
      VALUES ($1, $2, $3)
      RETURNING id, ticket_id, admin_id, note, created_at
    `;
    const result = await db.query(insertSql, [realTicketId, adminId, note.trim()]);
    const createdNote = result.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Internal note added.',
      note: {
        ...createdNote,
        admin_name: req.user.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Server-Sent Events (SSE) Live Stream Endpoint for Admin Queue
 * GET /api/admin/queue/stream
 */
export const streamQueue = (req, res, next) => {
  try {
    subscribeToQueue(res, req);
  } catch (error) {
    next(error);
  }
};