const jwt = require('jsonwebtoken');
const { verifyToken, verifyAdmin, generateToken, JWT_SECRET } = require('../middleware/authMiddleware');

function mockReqRes(headers = {}) {
    const req = { headers, user: undefined };
    const res = {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
    const next = jest.fn();
    return { req, res, next };
}

describe('authMiddleware.verifyToken', () => {
    test('rejects a request with no Authorization header', () => {
        const { req, res, next } = mockReqRes();
        verifyToken(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0][0];
        expect(err.status).toBe(401);
        expect(err.code).toBe('NO_TOKEN');
    });

    test('rejects an invalid/malformed token', () => {
        const { req, res, next } = mockReqRes({ authorization: 'Bearer not-a-real-token' });
        verifyToken(req, res, next);

        const err = next.mock.calls[0][0];
        expect(err.status).toBe(403);
        expect(err.code).toBe('INVALID_TOKEN');
    });

    test('rejects an expired token', () => {
        const expired = jwt.sign({ id: '1', username: 'x', type: 'student' }, JWT_SECRET, { expiresIn: -10 });
        const { req, res, next } = mockReqRes({ authorization: `Bearer ${expired}` });
        verifyToken(req, res, next);

        const err = next.mock.calls[0][0];
        expect(err.status).toBe(401);
        expect(err.code).toBe('TOKEN_EXPIRED');
    });

    test('accepts a valid token and attaches decoded user to req', () => {
        const token = generateToken({ _id: 'abc123', username: 'alice', type: 'student', email: 'a@x.com' });
        const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` });
        verifyToken(req, res, next);

        expect(next).toHaveBeenCalledWith(); // called with no error
        expect(req.user.username).toBe('alice');
        expect(req.user.type).toBe('student');
    });
});

describe('authMiddleware.verifyAdmin', () => {
    test('rejects when req.user is missing', () => {
        const { req, res, next } = mockReqRes();
        verifyAdmin(req, res, next);

        const err = next.mock.calls[0][0];
        expect(err.status).toBe(403);
        expect(err.code).toBe('ADMIN_REQUIRED');
    });

    test('rejects a non-admin user', () => {
        const { req, res, next } = mockReqRes();
        req.user = { type: 'student' };
        verifyAdmin(req, res, next);

        const err = next.mock.calls[0][0];
        expect(err.status).toBe(403);
        expect(err.code).toBe('ADMIN_REQUIRED');
    });

    test('allows an admin user through', () => {
        const { req, res, next } = mockReqRes();
        req.user = { type: 'admin' };
        verifyAdmin(req, res, next);

        expect(next).toHaveBeenCalledWith();
    });
});
