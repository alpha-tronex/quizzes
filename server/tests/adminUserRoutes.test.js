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

describe('admin-only enforcement', () => {
    test('GET /api/admin/users requires authentication', async () => {
        const res = await request(app).get('/api/admin/users');
        expect(res.status).toBe(401);
    });

    test('GET /api/admin/users rejects a non-admin user', async () => {
        const { token } = await createUser(User, { type: 'student' });
        const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('ADMIN_REQUIRED');
    });
});

describe('GET /api/admin/users', () => {
    test('lists all users for an admin, excluding passwords', async () => {
        const { token } = await createUser(User, { username: 'admin1', type: 'admin' });
        await createUser(User, { username: 'student1', type: 'student' });

        const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThanOrEqual(2);
        expect(res.body.every((u) => u.password === undefined)).toBe(true);
    });
});

describe('GET /api/admin/user/:id', () => {
    test('gets a single user by id', async () => {
        const { token } = await createUser(User, { username: 'admin2', type: 'admin' });
        const { user: target } = await createUser(User, { username: 'target1' });

        const res = await request(app)
            .get(`/api/admin/user/${target._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.uname).toBe('target1');
    });

    test('404s for a nonexistent user', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const res = await request(app)
            .get('/api/admin/user/64b64b64b64b64b64b64b64b')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });
});

describe('PUT /api/admin/user/:id', () => {
    test('updates a user as admin', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: target } = await createUser(User, { username: 'editme' });

        const res = await request(app)
            .put(`/api/admin/user/${target._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ fname: 'Edited' });

        expect(res.status).toBe(200);
        expect(res.body.fname).toBe('Edited');
    });

    test('rejects an invalid user type value', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: target } = await createUser(User, { username: 'badtype' });

        const res = await request(app)
            .put(`/api/admin/user/${target._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ type: 'superuser' });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});

describe('PATCH /api/admin/user/:id/type', () => {
    test('promotes a student to admin', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: target } = await createUser(User, { username: 'promoteme', type: 'student' });

        const res = await request(app)
            .patch(`/api/admin/user/${target._id}/type`)
            .set('Authorization', `Bearer ${token}`)
            .send({ type: 'admin' });

        expect(res.status).toBe(200);
        expect(res.body.type).toBe('admin');
    });

    test('rejects an invalid type', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: target } = await createUser(User, { username: 'badpromote' });

        const res = await request(app)
            .patch(`/api/admin/user/${target._id}/type`)
            .set('Authorization', `Bearer ${token}`)
            .send({ type: 'superadmin' });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('INVALID_TYPE');
    });
});

describe('DELETE /api/admin/user/:id', () => {
    test('deletes a user', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: target } = await createUser(User, { username: 'deleteme' });

        const res = await request(app)
            .delete(`/api/admin/user/${target._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(await User.findById(target._id)).toBeNull();
    });
});
