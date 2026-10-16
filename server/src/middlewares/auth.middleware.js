import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import db from '../db/index.js';
import { ApiError } from './error.middleware.js';

/**
 * Authentication Middleware.
 * Verifies JWT access tokens and attaches the authenticated user record to req.user.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Check if Authorization header is present and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No authentication token provided. Please log in.');
    }

    // 2. Extract the token string
    const token = authHeader.split(' ')[1];
    if (!token) {
      throw ApiError.unauthorized('Authentication token is malformed.');
    }

    // 3. Verify the token signature and expiration
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Your session has expired. Please log in again.');
      }
      throw ApiError.unauthorized('Invalid authentication token.');
    }

    // 4. Look up the user in PostgreSQL to ensure the account exists
    const queryText = `
      SELECT id, author_id, name, email, role, phone, city
      FROM users
      WHERE id = $1
    `;
    const result = await db.query(queryText, [decoded.userId]);

    if (result.rows.length === 0) {
      throw ApiError.unauthorized('User associated with this token no longer exists.');
    }

    const user = result.rows[0];

    // 5. Attach user object to Express request
    req.user = {
      id: user.id,
      authorId: user.author_id, 
      name: user.name,
      email: user.email,
      role: user.role, 
      phone: user.phone,
      city: user.city,
    };

    next();
  } catch (error) {
    next(error);
  }
};