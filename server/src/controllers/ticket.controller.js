import db from '../db/index.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { classifyAndPrioritize } from '../services/ai.service.js';
import {
  subscribeToTicket,
  broadcastTicketUpdate,
  broadcastQueueUpdate,
} from '../services/sse.service.js';

/**
 * Create a new support ticket (Author)
 * POST /api/tickets
 */
export const createTicket = async (req, res, next) => {
  const client = await db.getClient();

  try {
    const authorId = req.user.id;
    const { subject, description, bookId } = req.body;

    // 1. Validation
    if (!subject || !subject.trim()) {
      throw ApiError.badRequest('Ticket subject is required.');
    }
    if (!description || !description.trim()) {
      throw ApiError.badRequest('Ticket description is required.');
    }

    // 2. Validate Book Ownership if bookId is provided (with proper PostgreSQL type-casting)
    let bookTitle = null;
    let validatedBookUuid = null;

    if (bookId && bookId !== 'GENERAL') {
      const bookCheck = await db.query(
        'SELECT id, title FROM books WHERE (id::text = $1 OR book_id = $1) AND author_id = $2',
        [bookId, authorId]
      );
      if (bookCheck.rows.length === 0) {
        throw ApiError.badRequest('Selected book does not exist or does not belong to you.');
      }
      validatedBookUuid = bookCheck.rows[0].id;
      bookTitle = bookCheck.rows[0].title;
    }

    // 3. Trigger AI Auto-Classification & Priority Scoring (with Graceful Fallback)
    const triage = await classifyAndPrioritize({
      subject: subject.trim(),
      description: description.trim(),
      bookTitle,
    });

    // 4. Atomic Database Transaction: Insert ticket and initial message
    await client.query('BEGIN');

    const ticketInsertSql = `
      INSERT INTO tickets (
        subject,
        description,
        status,
        category,
        ai_category,
        priority,
        ai_priority,
        ai_confidence,
        author_id,
        book_id
      ) VALUES ($1, $2, 'OPEN', $3, $3, $4, $4, $5, $6, $7)
      RETURNING *
    `;
    const ticketRes = await client.query(ticketInsertSql, [
      subject.trim(),
      description.trim(),
      triage.category,
      triage.priority,
      triage.confidence,
      authorId,
      validatedBookUuid,
    ]);
    const newTicket = ticketRes.rows[0];

    // Insert the author's initial message into ticket_messages
    const messageInsertSql = `
      INSERT INTO ticket_messages (ticket_id, sender_id, message)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    await client.query(messageInsertSql, [newTicket.id, authorId, description.trim()]);

    await client.query('COMMIT');

    // 5. Broadcast real-time SSE event to Admin Queue
    broadcastQueueUpdate('ticket_created', {
      ticketId: newTicket.id,
      ticketNumber: newTicket.ticket_number,
      subject: newTicket.subject,
      category: newTicket.category,
      priority: newTicket.priority,
      authorName: req.user.name,
      createdAt: newTicket.created_at,
    });

    return res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully.',
      ticket: newTicket,
      aiTriage: {
        category: triage.category,
        priority: triage.priority,
        confidence: triage.confidence,
        reasoning: triage.reasoning,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Get all tickets for the authenticated author
 * GET /api/tickets
 */
export const getMyTickets = async (req, res, next) => {
  try {
    const authorId = req.user.id;

    const queryText = `
      SELECT 
        t.id,
        t.ticket_number,
        t.subject,
        t.description,
        t.status,
        t.category,
        t.priority,
        t.created_at,
        t.updated_at,
        b.book_id,
        b.title AS book_title,
        (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id = t.id) AS message_count,
        (SELECT MAX(created_at) FROM ticket_messages tm WHERE tm.ticket_id = t.id) AS last_message_at
      FROM tickets t
      LEFT JOIN books b ON t.book_id = b.id
      WHERE t.author_id = $1
      ORDER BY t.created_at DESC
    `;
    const result = await db.query(queryText, [authorId]);

    return res.status(200).json({
      success: true,
      tickets: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get full conversation timeline of a single ticket
 * GET /api/tickets/:id
 */
export const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Fetch ticket details (with type cast so both UUID or ticket_number work)
    const ticketQuery = `
      SELECT 
        t.*,
        u.name AS author_name,
        u.email AS author_email,
        u.phone AS author_phone,
        b.book_id,
        b.title AS book_title,
        b.isbn AS book_isbn,
        b.status AS book_status,
        b.royalty_pending,
        admin.name AS assigned_to_name
      FROM tickets t
      JOIN users u ON t.author_id = u.id
      LEFT JOIN books b ON t.book_id = b.id
      LEFT JOIN users admin ON t.assigned_to_id = admin.id
      WHERE t.id::text = $1 OR t.ticket_number::text = $1
    `;
    const ticketRes = await db.query(ticketQuery, [id]);

    if (ticketRes.rows.length === 0) {
      throw ApiError.notFound('Ticket not found.');
    }

    const ticket = ticketRes.rows[0];

    // Data Isolation: Authors can only view their own tickets
    if (userRole === 'AUTHOR' && ticket.author_id !== userId) {
      throw ApiError.forbidden('You do not have permission to view this ticket.');
    }

    // 2. Fetch public conversation messages (never includes internal notes)
    const messagesQuery = `
      SELECT 
        tm.id,
        tm.message,
        tm.created_at,
        u.id AS sender_id,
        u.name AS sender_name,
        u.role AS sender_role
      FROM ticket_messages tm
      JOIN users u ON tm.sender_id = u.id
      WHERE tm.ticket_id = $1
      ORDER BY tm.created_at ASC
    `;
    const messagesRes = await db.query(messagesQuery, [ticket.id]);

    return res.status(200).json({
      success: true,
      ticket,
      messages: messagesRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a reply message to a ticket (Author or Admin)
 * POST /api/tickets/:id/messages
 */
export const addMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!message || !message.trim()) {
      throw ApiError.badRequest('Message content cannot be empty.');
    }

    // Verify ticket exists and author permissions
    const ticketRes = await db.query('SELECT id, author_id, status FROM tickets WHERE id::text = $1', [id]);
    if (ticketRes.rows.length === 0) {
      throw ApiError.notFound('Ticket not found.');
    }

    const ticket = ticketRes.rows[0];
    if (userRole === 'AUTHOR' && ticket.author_id !== userId) {
      throw ApiError.forbidden('You are not authorized to reply to this ticket.');
    }

    // Insert message
    const insertMessageSql = `
      INSERT INTO ticket_messages (ticket_id, sender_id, message)
      VALUES ($1, $2, $3)
      RETURNING id, ticket_id, sender_id, message, created_at
    `;
    const msgRes = await db.query(insertMessageSql, [ticket.id, userId, message.trim()]);
    const newMessage = msgRes.rows[0];

    // Update ticket updated_at timestamp
    await db.query('UPDATE tickets SET updated_at = NOW() WHERE id = $1', [ticket.id]);

    const formattedMessage = {
      id: newMessage.id,
      ticketId: newMessage.ticket_id,
      senderId: newMessage.sender_id,
      senderName: req.user.name,
      senderRole: req.user.role,
      message: newMessage.message,
      createdAt: newMessage.created_at,
    };

    // Broadcast SSE to all watchers of this ticket (Author & Admin see it live!)
    broadcastTicketUpdate(ticket.id, 'new_message', formattedMessage);

    return res.status(201).json({
      success: true,
      message: formattedMessage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Server-Sent Events (SSE) Live Stream Endpoint for Tickets
 * GET /api/tickets/:id/stream
 */
export const streamTicket = (req, res, next) => {
  try {
    const { id } = req.params;
    subscribeToTicket(id, res, req);
  } catch (error) {
    next(error);
  }
};