import { Router } from 'express';
import { getMyBooks, getBookById } from '../controllers/book.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all book endpoints: A valid JWT token is mandatory
router.use(authenticate);

/**
 * @route   GET /api/books
 * @desc    Fetch all books and dashboard royalty metrics for the logged-in author
 * @access  Private (Author/Admin)
 */
router.get('/', getMyBooks);

/**
 * @route   GET /api/books/:id
 * @desc    Get detailed book information by UUID or book_id
 * @access  Private (Author must own the book, or Admin)
 */
router.get('/:id', getBookById);

export default router;