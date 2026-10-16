import { Router } from 'express';
import {
  getTicketQueue,
  getAdminTicketDetail,
  requestAiDraft,
  updateTicket,
  addInternalNote,
  streamQueue,
} from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/role.middleware.js';

const router = Router();

/**
 * @route   GET /api/admin/queue/stream
 * @desc    Server-Sent Events (SSE) live stream for Admin Ticket Queue updates
 * @access  Public / Stream
 */
router.get('/queue/stream', streamQueue);

// Strict Security Guard: Every following endpoint requires JWT Authentication AND Admin Role
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/admin/tickets
 * @desc    Get ticket queue with multi-filtering (status, category, priority) and urgency sorting
 * @access  Private (Admin only)
 */
router.get('/tickets', getTicketQueue);

/**
 * @route   GET /api/admin/tickets/:id
 * @desc    Get full admin ticket view including author metrics, timeline, and internal notes
 * @access  Private (Admin only)
 */
router.get('/tickets/:id', getAdminTicketDetail);

/**
 * @route   POST /api/admin/tickets/:id/generate-draft
 * @desc    Generate (or regenerate) an AI draft response using BookLeaf KB & author data
 * @access  Private (Admin only)
 */
router.post('/tickets/:id/generate-draft', requestAiDraft);

/**
 * @route   PATCH /api/admin/tickets/:id
 * @desc    Update ticket status, override AI category, override AI priority, or assign ticket
 * @access  Private (Admin only)
 */
router.patch('/tickets/:id', updateTicket);

/**
 * @route   POST /api/admin/tickets/:id/notes
 * @desc    Add an internal ops note (hidden from author)
 * @access  Private (Admin only)
 */
router.post('/tickets/:id/notes', addInternalNote);

export default router;