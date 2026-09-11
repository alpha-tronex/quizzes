const jwt = require('jsonwebtoken');
const ApiError = require('../utils/apiError');

// Fail fast: refuse to boot rather than silently fall back to a shared,
// publicly-known default secret. Set JWT_SECRET in the environment (see
// .env.example / server/.env.production.example).
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error(
        'JWT_SECRET environment variable is not set. Refusing to start without it — ' +
        'set JWT_SECRET in your environment before starting the server (see .env.example).'
    );
}

// Extended token lifetime instead of a refresh-token flow: acceptable for
// this app's data sensitivity (quiz scores, not financial/health data). See
// docs/BACKEND.md, "Token lifetime strategy". Configurable via env so it can
// be tightened later without a code change.
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

/**
 * Middleware to verify JWT token
 */
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return next(ApiError.unauthorized('NO_TOKEN', 'Access denied. No token provided.'));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Add user info to request object
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(ApiError.unauthorized('TOKEN_EXPIRED', 'Token expired. Please login again.'));
        }
        return next(new ApiError(403, 'INVALID_TOKEN', 'Invalid token.'));
    }
}

/**
 * Middleware to verify admin role
 */
function verifyAdmin(req, res, next) {
    if (!req.user || req.user.type !== 'admin') {
        return next(ApiError.forbidden('ADMIN_REQUIRED', 'Access denied. Admin privileges required.'));
    }
    next();
}

/**
 * Generate JWT token
 */
function generateToken(user) {
    const payload = {
        id: user._id || user.id,
        username: user.username || user.uname,
        type: user.type,
        email: user.email
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

module.exports = {
    verifyToken,
    verifyAdmin,
    generateToken,
    JWT_SECRET,
    JWT_EXPIRES_IN
};
