const request = require('supertest');
const createApp = require('../app');
const User = require('../models/User');
const Cohort = require('../models/Cohort');
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

function daysFromNow(days) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe('GET /api/cohort/mine', () => {
    test('requires authentication', async () => {
        const res = await request(app).get('/api/cohort/mine');
        expect(res.status).toBe(401);
    });

    test('400s for an admin account (admins have no cohort)', async () => {
        const { token } = await createUser(User, { username: 'cohortadmin', type: 'admin' });

        const res = await request(app).get('/api/cohort/mine').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('ADMIN_HAS_NO_COHORT');
    });

    test('returns "Guest" for a student with no cohort membership', async () => {
        const { token } = await createUser(User, { username: 'nocohortstudent', type: 'student' });

        const res = await request(app).get('/api/cohort/mine').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ name: 'Guest' });
    });

    test('returns "Guest" even if a Guest cohort has been seeded (its own name is never surfaced)', async () => {
        await Cohort.create({
            name: 'Guest', isGuest: true, startDate: daysFromNow(-1), endDate: daysFromNow(365),
            students: [], quizzes: []
        });
        const { token } = await createUser(User, { username: 'guestbacked', type: 'student' });

        const res = await request(app).get('/api/cohort/mine').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ name: 'Guest' });
    });

    test('returns the real cohort name for a student in one active cohort', async () => {
        const { token, user } = await createUser(User, { username: 'fallstudent', type: 'student' });
        await Cohort.create({
            name: 'Fall 2026', startDate: daysFromNow(-1), endDate: daysFromNow(30),
            students: [user._id], quizzes: []
        });

        const res = await request(app).get('/api/cohort/mine').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ name: 'Fall 2026' });
    });

    test('joins multiple active cohort names', async () => {
        const { token, user } = await createUser(User, { username: 'doubleupstudent', type: 'student' });
        await Cohort.create({
            name: 'Fall 2026', startDate: daysFromNow(-1), endDate: daysFromNow(30),
            students: [user._id], quizzes: []
        });
        await Cohort.create({
            name: 'Algebra Club', startDate: daysFromNow(-2), endDate: daysFromNow(20),
            students: [user._id], quizzes: []
        });

        const res = await request(app).get('/api/cohort/mine').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.name).toContain('Fall 2026');
        expect(res.body.name).toContain('Algebra Club');
    });

    test('returns "Guest" for a student whose only cohort membership has expired', async () => {
        const { token, user } = await createUser(User, { username: 'expiredstudent', type: 'student' });
        await Cohort.create({
            name: 'Spring 2025', startDate: daysFromNow(-60), endDate: daysFromNow(-30),
            students: [user._id], quizzes: []
        });

        const res = await request(app).get('/api/cohort/mine').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ name: 'Guest' });
    });
});
