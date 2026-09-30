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

describe('POST /api/admin/user/:userId/reopen-quiz/:quizId', () => {
    test('adds the quizId to reopenedQuizIds for a student who took that quiz', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: student } = await createUser(User, {
            username: 'reopencandidate',
            quizzes: [{ id: 3, title: 'Islam 101', score: 1, totalQuestions: 1 }]
        });

        const res = await request(app)
            .post(`/api/admin/user/${student._id}/reopen-quiz/3`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.reopenedQuizIds).toEqual([3]);

        const reloaded = await User.findById(student._id);
        expect(reloaded.reopenedQuizIds).toEqual([3]);
    });

    test('is idempotent when reopening an already-reopened quiz', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: student } = await createUser(User, {
            username: 'doublereopen',
            quizzes: [{ id: 3, title: 'Islam 101', score: 1, totalQuestions: 1 }]
        });

        await request(app)
            .post(`/api/admin/user/${student._id}/reopen-quiz/3`)
            .set('Authorization', `Bearer ${token}`);
        const res = await request(app)
            .post(`/api/admin/user/${student._id}/reopen-quiz/3`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.reopenedQuizIds).toEqual([3]);
    });

    test('404s when the student never took that quiz', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: student } = await createUser(User, { username: 'nevertook' });

        const res = await request(app)
            .post(`/api/admin/user/${student._id}/reopen-quiz/3`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('QUIZ_NOT_TAKEN');
    });

    test('404s for a nonexistent user', async () => {
        const { token } = await createUser(User, { type: 'admin' });

        const res = await request(app)
            .post('/api/admin/user/64b64b64b64b64b64b64b64b/reopen-quiz/3')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    test('rejects a non-admin caller', async () => {
        const { token } = await createUser(User, { type: 'student' });
        const { user: student } = await createUser(User, {
            username: 'unauthorizedtarget',
            quizzes: [{ id: 3, title: 'Islam 101', score: 1, totalQuestions: 1 }]
        });

        const res = await request(app)
            .post(`/api/admin/user/${student._id}/reopen-quiz/3`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });
});

describe('DELETE /api/admin/user/:userId/reopen-quiz/:quizId', () => {
    test('removes the quizId from reopenedQuizIds', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: student } = await createUser(User, {
            username: 'revokecandidate',
            quizzes: [{ id: 3, title: 'Islam 101', score: 1, totalQuestions: 1 }],
            reopenedQuizIds: [3]
        });

        const res = await request(app)
            .delete(`/api/admin/user/${student._id}/reopen-quiz/3`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.reopenedQuizIds).toEqual([]);

        const reloaded = await User.findById(student._id);
        expect(reloaded.reopenedQuizIds).toEqual([]);
    });

    test('leaves other reopened quizzes untouched', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: student } = await createUser(User, {
            username: 'partialrevoke',
            quizzes: [
                { id: 2, title: 'Islam 101.2', score: 1, totalQuestions: 1 },
                { id: 0, title: 'Hasan Test', score: 1, totalQuestions: 1 }
            ],
            reopenedQuizIds: [2, 0]
        });

        const res = await request(app)
            .delete(`/api/admin/user/${student._id}/reopen-quiz/2`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.reopenedQuizIds).toEqual([0]);
    });

    test('is idempotent when the quizId is not currently reopened', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: student } = await createUser(User, {
            username: 'nothingtorevoke',
            quizzes: [{ id: 3, title: 'Islam 101', score: 1, totalQuestions: 1 }]
        });

        const res = await request(app)
            .delete(`/api/admin/user/${student._id}/reopen-quiz/3`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.reopenedQuizIds).toEqual([]);
    });

    test('404s for a nonexistent user', async () => {
        const { token } = await createUser(User, { type: 'admin' });

        const res = await request(app)
            .delete('/api/admin/user/64b64b64b64b64b64b64b64b/reopen-quiz/3')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    test('rejects a non-admin caller', async () => {
        const { token } = await createUser(User, { type: 'student' });
        const { user: student } = await createUser(User, {
            username: 'unauthorizedrevoke',
            quizzes: [{ id: 3, title: 'Islam 101', score: 1, totalQuestions: 1 }],
            reopenedQuizIds: [3]
        });

        const res = await request(app)
            .delete(`/api/admin/user/${student._id}/reopen-quiz/3`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
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

    test('removes the deleted user from every cohort they belonged to', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: target } = await createUser(User, { username: 'deletemecohort' });
        const cohort = await Cohort.create({
            name: 'Spring 2026',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-06-01'),
            students: [target._id]
        });

        const res = await request(app)
            .delete(`/api/admin/user/${target._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        const reloadedCohort = await Cohort.findById(cohort._id);
        expect(reloadedCohort.students).not.toContainEqual(target._id);
    });

    test('404s for a nonexistent user', async () => {
        const { token } = await createUser(User, { type: 'admin' });

        const res = await request(app)
            .delete('/api/admin/user/64b64b64b64b64b64b64b64b')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    test('rejects a non-admin caller', async () => {
        const { token } = await createUser(User, { type: 'student' });
        const { user: target } = await createUser(User, { username: 'deleteunauthorized' });

        const res = await request(app)
            .delete(`/api/admin/user/${target._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
        expect(await User.findById(target._id)).not.toBeNull();
    });
});

describe('POST /api/admin/user/:id/archive', () => {
    test('archives a user', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: target } = await createUser(User, { username: 'archiveme' });

        const res = await request(app)
            .post(`/api/admin/user/${target._id}/archive`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.archived).toBe(true);
        expect(res.body.archivedAt).toBeTruthy();

        const reloaded = await User.findById(target._id);
        expect(reloaded.archived).toBe(true);
        expect(reloaded.archivedAt).toBeTruthy();
    });

    test('is idempotent when archiving an already-archived user', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: target } = await createUser(User, { username: 'doublearchive', archived: true, archivedAt: new Date('2026-01-01') });

        const res = await request(app)
            .post(`/api/admin/user/${target._id}/archive`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.archived).toBe(true);
        // The original archivedAt is preserved, not overwritten, on a no-op re-archive.
        expect(new Date(res.body.archivedAt).toISOString()).toBe(new Date('2026-01-01').toISOString());
    });

    test('404s for a nonexistent user', async () => {
        const { token } = await createUser(User, { type: 'admin' });

        const res = await request(app)
            .post('/api/admin/user/64b64b64b64b64b64b64b64b/archive')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    test('rejects a non-admin caller', async () => {
        const { token } = await createUser(User, { type: 'student' });
        const { user: target } = await createUser(User, { username: 'archiveunauthorized' });

        const res = await request(app)
            .post(`/api/admin/user/${target._id}/archive`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });
});

describe('DELETE /api/admin/user/:id/archive (unarchive)', () => {
    test('unarchives a user', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: target } = await createUser(User, {
            username: 'unarchiveme',
            archived: true,
            archivedAt: new Date()
        });

        const res = await request(app)
            .delete(`/api/admin/user/${target._id}/archive`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.archived).toBe(false);
        expect(res.body.archivedAt).toBeNull();

        const reloaded = await User.findById(target._id);
        expect(reloaded.archived).toBe(false);
        expect(reloaded.archivedAt).toBeNull();
    });

    test('is idempotent when unarchiving a user who is not archived', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: target } = await createUser(User, { username: 'doubleunarchive' });

        const res = await request(app)
            .delete(`/api/admin/user/${target._id}/archive`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.archived).toBe(false);
    });

    test('404s for a nonexistent user', async () => {
        const { token } = await createUser(User, { type: 'admin' });

        const res = await request(app)
            .delete('/api/admin/user/64b64b64b64b64b64b64b64b/archive')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    test('rejects a non-admin caller', async () => {
        const { token } = await createUser(User, { type: 'student' });
        const { user: target } = await createUser(User, {
            username: 'unarchiveunauthorized',
            archived: true,
            archivedAt: new Date()
        });

        const res = await request(app)
            .delete(`/api/admin/user/${target._id}/archive`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });
});

describe('GET /api/admin/users and GET /api/admin/user/:id archived fields', () => {
    test('includes archived/archivedAt in the list response', async () => {
        const { token } = await createUser(User, { username: 'listerAdmin', type: 'admin' });
        const archivedAt = new Date();
        await createUser(User, { username: 'archivedlistentry', archived: true, archivedAt });

        const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        const entry = res.body.find((u) => u.uname === 'archivedlistentry');
        expect(entry.archived).toBe(true);
        expect(entry.archivedAt).toBeTruthy();
    });

    test('includes archived/archivedAt in the detail response', async () => {
        const { token } = await createUser(User, { type: 'admin' });
        const { user: target } = await createUser(User, { username: 'archiveddetail', archived: true, archivedAt: new Date() });

        const res = await request(app)
            .get(`/api/admin/user/${target._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.archived).toBe(true);
        expect(res.body.archivedAt).toBeTruthy();
    });
});
