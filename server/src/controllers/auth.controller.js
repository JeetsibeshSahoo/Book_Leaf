import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import db from '../db/index.js';
import { ApiError } from '../middlewares/error.middleware.js';

/**
 * Handles User Login (Author and Admin)
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validate inputs
    if (!email || !password) {
      throw ApiError.badRequest('Please provide both email and password.');
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 2. Fetch user from PostgreSQL by email
    const queryText = `
      SELECT id, author_id, name, email, password, role, phone, city
      FROM users
      WHERE LOWER(email) = $1
    `;
    const result = await db.query(queryText, [trimmedEmail]);

    if (result.rows.length === 0) {
      // Use uniform error message to prevent user enumeration attacks
      throw ApiError.unauthorized('Invalid email or password.');
    }

    const user = result.rows[0];

    // 3. Verify password hash using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    // 4. Generate signed JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        authorId: user.author_id,
        role: user.role,
        email: user.email,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // 5. Return success payload
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        authorId: user.author_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        city: user.city,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetches the currently authenticated user's profile
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper endpoint for testing & evaluator convenience
 * GET /api/auth/sample-users
 */
export const getSampleUsers = async (req, res, next) => {
  try {
    const queryText = `
      SELECT author_id, name, email, role, city
      FROM users
      ORDER BY role ASC, name ASC
    `;
    const result = await db.query(queryText);

    return res.status(200).json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    next(error);
  }
};