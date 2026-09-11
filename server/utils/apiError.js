/**
 * Typed application error carrying an HTTP status, a machine-readable code,
 * and a human-readable message, so route handlers can `next(err)` instead of
 * hand-rolling a response shape per call site. Paired with
 * `middleware/errorHandler.js`, which is the only place that writes the
 * actual HTTP response body.
 */
class ApiError extends Error {
    constructor(status, code, message, details = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }

    toResponseBody() {
        const body = { error: { code: this.code, message: this.message } };
        if (this.details) {
            body.error.details = this.details;
        }
        return body;
    }

    static badRequest(code, message, details) {
        return new ApiError(400, code, message, details);
    }
    static unauthorized(code, message) {
        return new ApiError(401, code, message);
    }
    static forbidden(code, message) {
        return new ApiError(403, code, message);
    }
    static notFound(code, message) {
        return new ApiError(404, code, message);
    }
    static conflict(code, message) {
        return new ApiError(409, code, message);
    }
    static internal(message = 'Internal server error') {
        return new ApiError(500, 'INTERNAL_ERROR', message);
    }
}

module.exports = ApiError;
