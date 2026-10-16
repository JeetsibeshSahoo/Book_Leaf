import { Router } from 'express';
import { login, getMe, getSampleUsers } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate author or admin and receive JWT token
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in user profile
 * @access  Private (Requires Bearer token)
 */
router.get('/me', authenticate, getMe);

/**
 * @route   GET /api/auth/sample-users
 * @desc    List sample credentials for evaluator convenience
 * @access  Public
 */
router.get('/sample-users', getSampleUsers);

export default router;