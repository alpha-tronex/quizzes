const ApiError = require('../utils/apiError');

/**
 * Centralized error-handling middleware. Must be registered last, after all
 * routes. Every route in this app either throws/rejects with an ApiError (or
 * lets Express 5 forward a thrown/rejected error automatically) and this is
 * the single place that turns that into a `{ error: { code, message } }`
 * response body, replacing the previously inconsistent mix of raw error
 * dumps, `{ error: string }`, and `{ errors: string[] }` shapes.
 */
function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof ApiError) {
        if (err.status >= 500) {
            console.error(err);
        }
        return res.status(err.status).json(err.toResponseBody());
    }

    // Mongoose validation errors (e.g. failed schema validation on save)
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: err.message }
        });
    }

    // Mongoose cast errors (e.g. malformed ObjectId in a route param)
    if (err.name === 'CastError') {
        return res.status(400).json({
            error: { code: 'INVALID_ID', message: `Invalid ${err.path}: ${err.value}` }
        });
    }

    console.error('Unhandled error:', err);
    res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
    });
}

module.exports = errorHandler;
