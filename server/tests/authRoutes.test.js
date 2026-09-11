const request = require('supertest');
const createApp = require('../app');
const User = require('../models/User');
const testDb = require('./testDb');
const { createUser } = require('./testHelpers');

let app;

beforeAll(async () => {
    await testDb.connect();
    app = createApp();
});

afterEach(async () => {
    await testDb.clearDatabase();
});

afterAll(async () => {
    await testDb.closeDatabase();
});

describe('POST /api/register', () => {
    test('registers a new user and returns a token', async () => {
        const res = await request(app).post('/api/register').send({
            fname: 'Ada',
            lname: 'Lovelace',
            uname: 'adalovelace',
            email: 'ada@example.com',
            pass: 'password123'
        });

        expect(res.status).toBe(200);
        expect(res.body.uname).toBe('adalovelace');
        expect(res.body.type).toBe('student');
        expect(res.body.token).toBeTruthy();
        expect(res.body.pass).toBe('');
    });

    test('rejects registration with validation errors', async () => {
        const res = await request(app).post('/api/register').send({
            uname: 'ab', // too short
            pass: '123' // too short
        });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
        expect(Array.isArray(res.body.error.details)).toBe(true);
        expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    test('rejects a duplicate username', async () => {
        await createUser(User, { username: 'takenuser', email: 'first@example.com' });

        const res = await request(app).post('/api/register').send({
            uname: 'takenuser',
            pass: 'password123',
            email: 'second@example.com'
        });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('DUPLICATE_USER');
    });

    test('rejects a duplicate email', async () => {
        await createUser(User, { username: 'someoneelse', email: 'dupe@example.com' });

        const res = await request(app).post('/api/register').send({
            uname: 'newusername',
            pass: 'password123',
            email: 'dupe@example.com'
        });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('DUPLICATE_USER');
    });
});

describe('POST /api/login', () => {
    test('logs in with correct credentials', async () => {
        await createUser(User, { username: 'loginuser', password: 'correctpass' });

        const res = await request(app).post('/api/login').send({ uname: 'loginuser', pass: 'correctpass' });

        expect(res.status).toBe(200);
        expect(res.body.uname).toBe('loginuser');
        expect(res.body.token).toBeTruthy();
    });

    test('rejects an unknown username', async () => {
        const res = await request(app).post('/api/login').send({ uname: 'nosuchuser', pass: 'whatever' });

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('rejects the wrong password', async () => {
        await createUser(User, { username: 'wrongpassuser', password: 'realpassword' });

        const res = await request(app).post('/api/login').send({ uname: 'wrongpassuser', pass: 'nope' });

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
});

describe('PUT /api/user/update', () => {
    test('requires authentication', async () => {
        const res = await request(app).put('/api/user/update').send({ id: 'irrelevant', fname: 'X' });
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('NO_TOKEN');
    });

    test('rejects an update missing the user id', async () => {
        const { token } = await createUser(User);
        const res = await request(app)
            .put('/api/user/update')
            .set('Authorization', `Bearer ${token}`)
            .send({ fname: 'NoId' });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('MISSING_ID');
    });

    test('rejects invalid field values', async () => {
        const { token, user } = await createUser(User);
        const res = await request(app)
            .put('/api/user/update')
            .set('Authorization', `Bearer ${token}`)
            .send({ id: user._id.toString(), email: 'not-an-email' });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('updates the user and persists the change', async () => {
        const { token, user } = await createUser(User);
        const res = await request(app)
            .put('/api/user/update')
            .set('Authorization', `Bearer ${token}`)
            .send({ id: user._id.toString(), fname: 'Updated' });

        expect(res.status).toBe(200);
        expect(res.body.fname).toBe('Updated');

        const reloaded = await User.findById(user._id);
        expect(reloaded.fname).toBe('Updated');
    });

    test('returns 404 for a well-formed but nonexistent user id', async () => {
        const { token } = await createUser(User);
        const fakeId = '64b64b64b64b64b64b64b64'; // valid ObjectId shape, doesn't exist
        const res = await request(app)
            .put('/api/user/update')
            .set('Authorization', `Bearer ${token}`)
            .send({ id: fakeId, fname: 'Ghost' });

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });
});

describe('GET /api/users', () => {
    test('requires authentication', async () => {
        const res = await request(app).get('/api/users');
        expect(res.status).toBe(401);
    });

    test('lists users without leaking passwords', async () => {
        const { token } = await createUser(User, { username: 'lister' });

        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0].password).toBeUndefined();
    });
});
