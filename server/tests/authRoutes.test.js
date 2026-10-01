const request = require('supertest');
const createApp = require('../app');
const User = require('../models/User');
const Cohort = require('../models/Cohort');
const AccountDeletionNotice = require('../models/AccountDeletionNotice');
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

    test('rejects login for an archived account with correct credentials', async () => {
        await createUser(User, { username: 'archivedlogin', password: 'correctpass', archived: true });

        const res = await request(app).post('/api/login').send({ uname: 'archivedlogin', pass: 'correctpass' });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('ACCOUNT_ARCHIVED');
    });

    test('reports INVALID_CREDENTIALS (not archived status) for a wrong password on an archived account', async () => {
        await createUser(User, { username: 'archivedwrongpass', password: 'realpassword', archived: true });

        const res = await request(app).post('/api/login').send({ uname: 'archivedwrongpass', pass: 'nope' });

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
        const fakeId = '64b64b64b64b64b64b64b64b'; // valid ObjectId shape, doesn't exist
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

describe('DELETE /api/account', () => {
    test('requires authentication', async () => {
        const res = await request(app).delete('/api/account');
        expect(res.status).toBe(401);
    });

    test('hard-deletes the authenticated user\'s own account', async () => {
        const { token, user } = await createUser(User, { username: 'selfdelete' });

        const res = await request(app).delete('/api/account').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(await User.findById(user._id)).toBeNull();
    });

    test('removes the deleted user from every cohort they belonged to', async () => {
        const { token, user } = await createUser(User, { username: 'selfdeletecohort' });
        const cohort = await Cohort.create({
            name: 'Fall 2026',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            students: [user._id]
        });

        const res = await request(app).delete('/api/account').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        const reloadedCohort = await Cohort.findById(cohort._id);
        expect(reloadedCohort.students).not.toContainEqual(user._id);
    });

    test('ignores a spoofed id in the body and only deletes the token owner', async () => {
        const { token, user } = await createUser(User, { username: 'selfdeleteA' });
        const { user: otherUser } = await createUser(User, { username: 'selfdeleteB' });

        const res = await request(app)
            .delete('/api/account')
            .set('Authorization', `Bearer ${token}`)
            .send({ id: otherUser._id.toString() });

        expect(res.status).toBe(200);
        expect(await User.findById(user._id)).toBeNull();
        expect(await User.findById(otherUser._id)).not.toBeNull();
    });
});

describe('DELETE /api/account — cohort deletion notices', () => {
    test('creates a notice when a real-cohort member deletes their account', async () => {
        const { token, user } = await createUser(User, {
            username: 'cohortleaver',
            fname: 'Hasan',
            lname: 'Test',
            quizzes: [{ id: 0, title: 'Quiz A', score: 1, totalQuestions: 1 }]
        });
        await Cohort.create({
            name: 'Fall 2026',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            students: [user._id]
        });

        const res = await request(app).delete('/api/account').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        const notices = await AccountDeletionNotice.find({});
        expect(notices).toHaveLength(1);
        expect(notices[0]).toMatchObject({
            studentUsername: 'cohortleaver',
            studentFname: 'Hasan',
            studentLname: 'Test',
            cohortNames: ['Fall 2026'],
            quizzesTakenCount: 1,
            acknowledged: false
        });
        expect(notices[0].deletedAt).toBeInstanceOf(Date);
    });

    test('includes every real cohort the student belonged to', async () => {
        const { token, user } = await createUser(User, { username: 'multicohortleaver' });
        await Cohort.create({
            name: 'Cohort A', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
            students: [user._id]
        });
        await Cohort.create({
            name: 'Cohort B', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
            students: [user._id]
        });

        await request(app).delete('/api/account').set('Authorization', `Bearer ${token}`);

        const [notice] = await AccountDeletionNotice.find({});
        expect(notice.cohortNames.sort()).toEqual(['Cohort A', 'Cohort B']);
    });

    test('does not create a notice for a student with no cohort membership', async () => {
        const { token } = await createUser(User, { username: 'nocohortleaver' });

        const res = await request(app).delete('/api/account').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(await AccountDeletionNotice.find({})).toHaveLength(0);
    });

    test('does not create a notice for a student only in the Guest cohort', async () => {
        const { token, user } = await createUser(User, { username: 'guestleaver' });
        await Cohort.create({
            name: 'Guest', isGuest: true,
            startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
            students: [user._id]
        });

        const res = await request(app).delete('/api/account').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(await AccountDeletionNotice.find({})).toHaveLength(0);
    });
});
