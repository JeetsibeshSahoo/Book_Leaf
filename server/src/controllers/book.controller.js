import db from '../db/index.js';
import { ApiError } from '../middlewares/error.middleware.js';

/**
 * Get all books belonging to the authenticated author,
 * along with cumulative dashboard royalty metrics.
 * GET /api/books
 */
export const getMyBooks = async (req, res, next) => {
  try {
    const authorId = req.user.id;

    // 1. Fetch all books belonging to this author
    const booksQuery = `
      SELECT 
        id,
        book_id,
        title,
        isbn,
        genre,
        publication_date,
        status,
        mrp,
        author_royalty_per_copy,
        total_copies_sold,
        total_royalty_earned,
        royalty_paid,
        royalty_pending,
        last_payout_date,
        print_partner,
        available_on,
        created_at
      FROM books
      WHERE author_id = $1
      ORDER BY created_at ASC
    `;
    const booksResult = await db.query(booksQuery, [authorId]);
    const books = booksResult.rows;

    // 2. Compute aggregate financial summary for dashboard cards
    const summary = books.reduce(
      (acc, book) => {
        acc.totalBooks += 1;
        acc.totalCopiesSold += Number(book.total_copies_sold || 0);
        acc.totalRoyaltyEarned += Number(book.total_royalty_earned || 0);
        acc.totalRoyaltyPaid += Number(book.royalty_paid || 0);
        acc.totalRoyaltyPending += Number(book.royalty_pending || 0);
        return acc;
      },
      {
        totalBooks: 0,
        totalCopiesSold: 0,
        totalRoyaltyEarned: 0,
        totalRoyaltyPaid: 0,
        totalRoyaltyPending: 0,
      }
    );

    return res.status(200).json({
      success: true,
      summary,
      books,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get details of a single book by ID with strict ownership validation
 * GET /api/books/:id
 */
export const getBookById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const queryText = `
      SELECT 
        b.*,
        u.name AS author_name,
        u.email AS author_email
      FROM books b
      JOIN users u ON b.author_id = u.id
      WHERE b.id = $1 OR b.book_id = $1
    `;
    const result = await db.query(queryText, [id]);

    if (result.rows.length === 0) {
      throw ApiError.notFound('Book not found.');
    }

    const book = result.rows[0];

    // Enforce data ownership: Authors can only view their own books
    if (req.user.role === 'AUTHOR' && book.author_id !== req.user.id) {
      throw ApiError.forbidden('You do not have permission to view this book.');
    }

    return res.status(200).json({
      success: true,
      book,
    });
  } catch (error) {
    next(error);
  }
};