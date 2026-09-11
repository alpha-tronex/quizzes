// Runs via Jest's `setupFiles`, before the test framework and any test file
// is loaded — so modules that fail-fast on missing env vars at require-time
// (server/middleware/authMiddleware.js) see these values already set.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-unit-tests-only';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
