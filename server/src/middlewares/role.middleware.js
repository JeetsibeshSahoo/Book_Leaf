import { ApiError } from './error.middleware.js';

export const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    // 1. Guard check: Ensure authenticate middleware was executed first
    if (!req.user) {
      return next(
        ApiError.unauthorized('Authentication is required before checking permissions.')
      );
    }

    // 2. Check if the user's role is in the list of allowed roles
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Role '${req.user.role}' is not authorized to access this resource.`
        )
      );
    }

    // 3. User is authorized, proceed to controller
    next();
  };
};

// Convenience shortcut specifically for Admin-only routes
export const requireAdmin = requireRole('ADMIN');

// Convenience shortcut specifically for Author-only routes
export const requireAuthor = requireRole('AUTHOR');