import { Router } from 'express';
import {
  createTicket,
  getMyTickets,
  getTicketById,
  addMessage,
  streamTicket,
} from '../controllers/ticket.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @route   GET /api/tickets/:id/stream
 * @desc    Server-Sent Events (SSE) live stream for ticket real-time updates
 * @access  Public / Token-authenticated via query param or header
 */
router.get('/:id/stream', streamTicket);

// Protect all following ticket management endpoints with JWT authentication
router.use(authenticate);

/**
 * @route   POST /api/tickets
 * @desc    Submit a new support ticket (Author)
 * @access  Private (Author)
 */
router.post('/', createTicket);

/**
 * @route   GET /api/tickets
 * @desc    Get all tickets submitted by the logged-in author
 * @access  Private (Author)
 */
router.get('/', getMyTickets);

/**
 * @route   GET /api/tickets/:id
 * @desc    Get detailed timeline and public messages for a ticket
 * @access  Private (Author who owns the ticket, or Admin)
 */
router.get('/:id', getTicketById);

/**
 * @route   POST /api/tickets/:id/messages
 * @desc    Add a reply message to an existing ticket
 * @access  Private (Author or Admin)
 */
router.post('/:id/messages', addMessage);

export default router;