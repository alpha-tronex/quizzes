const request = require('supertest');
const createApp = require('../app');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const Cohort = require('../models/Cohort');
const testDb = require('./testDb');
const { createUser, sampleQuizPayload } = require('./testHelpers');

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

async function adminToken(username = 'cohortadmin') {
    const { token } = await createUser(User, { username, type: 'admin' });
    return token;
}

function daysFromNow(days) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function seedQuiz(overrides = {}) {
    return Quiz.create({
        quizId: overrides.quizId ?? 0,
        title: overrides.title || 'Sample Quiz',
        questions: sampleQuizPayload().questions
    });
}

function validPayload(overrides = {}) {
    return {
        name: 'Fall Cohort',
        startDate: daysFromNow(-1),
        endDate: daysFromNow(30),
        students: [],
        quizzes: [],
        ...overrides
    };
}

describe('admin-only enforcement', () => {
    test('GET /api/admin/cohorts requires authentication', async () => {
        const res = await request(app).get('/api/admin/cohorts');
        expect(res.status).toBe(401);
    });

    test('POST /api/admin/cohorts rejects a non-admin user', async () => {
        const { token } = await createUser(User, { type: 'student' });
        const res = await request(app)
            .post('/api/admin/cohorts')
            .set('Authorization', `Bearer ${token}`)
            .send(validPayload());

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('ADMIN_REQUIRED');
    });
});

describe('POST /api/admin/cohorts — validation', () => {
    test('rejects a missing name', async () => {
        const token = await adminToken();
        const payload = validPayload();
        delete payload.name;

        const res = await request(app).post('/api/admin/cohorts').set('Authorization', `Bearer ${token}`).send(payload);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
        expect(res.body.error.details).toEqual(expect.arrayContaining(['name is required']));
    });

    test('rejects missing dates', async () => {
        const token = await adminToken();
        const res = await request(app)
            .post('/api/admin/cohorts')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'No Dates' });

        expect(res.status).toBe(400);
        expect(res.body.error.details).toEqual(expect.arrayContaining([
            'startDate is required and must be a valid date',
            'endDate is required and must be a valid date'
        ]));
    });

    test('rejects endDate before startDate', async () => {
        const token = await adminToken();
        const res = await request(app)
            .post('/api/admin/cohorts')
            .set('Authorization', `Bearer ${token}`)
            .send(validPayload({ startDate: daysFromNow(10), endDate: daysFromNow(1) }));

        expect(res.status).toBe(400);
        expect(res.body.error.details).toEqual(expect.arrayContaining(['endDate must be after startDate']));
    });

    test('rejects a malformed student ID', async () => {
        const token = await adminToken();
        const res = await request(app)
            .post('/api/admin/cohorts')
            .set('Authorization', `Bearer ${token}`)
            .send(validPayload({ students: ['not-an-object-id'] }));

        expect(res.status).toBe(400);
        expect(res.body.error.details).toEqual(expect.arrayContaining(['students contains invalid user ID(s)']));
    });

    test('rejects a student ID that does not exist', async () => {
        const token = await adminToken();
        const ghostId = '507f1f77bcf86cd799439011';
        const res = await request(app)
            .post('/api/admin/cohorts')
            .set('Authorization', `Bearer ${token}`)
            .send(validPayload({ students: [ghostId] }));

        expect(res.status).toBe(400);
        expect(res.body.error.details[0]).toContain('students not found');
    });

    test('rejects a non-student account listed as a student', async () => {
        const token = await adminToken();
        const { user: adminUser } = await createUser(User, { username: 'sneakyadmin', type: 'admin' });

        const res = await request(app)
            .post('/api/admin/cohorts')
            .set('Authorization', `Bearer ${token}`)
            .send(validPayload({ students: [adminUser._id.toString()] }));

        expect(res.status).toBe(400);
        expect(res.body.error.details).toEqual(expect.arrayContaining(['students must all be accounts of type "student"']));
    });

    test('rejects a quiz ID that does not exist', async () => {
        const token = await adminToken();
        const res = await request(app)
            .post('/api/admin/cohorts')
            .set('Authorization', `Bearer ${token}`)
            .send(validPayload({ quizzes: [999] }));

        expect(res.status).toBe(400);
        expect(res.body.error.details[0]).toContain('quizzes not found');
    });
});

describe('POST /api/admin/cohorts — success', () => {
    test('creates a cohort and returns populated students/quizzes', async () => {
        const token = await adminToken();
        const { user: student } = await createUser(User, { username: 'stu1', type: 'student' });
        await seedQuiz({ quizId: 5, title: 'Fiqh Basics' });

        const res = await request(app)
            .post('/api/admin/cohorts')
            .set('Authorization', `Bearer ${token}`)
            .send(validPayload({ students: [student._id.toString()], quizzes: [5] }));

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Fall Cohort');
        expect(res.body.students).toEqual([{ id: student._id.toString(), uname: 'stu1', fname: 'Test', lname: 'User' }]);
        expect(res.body.quizzes).toEqual([{ id: 5, title: 'Fiqh Basics' }]);
    });
});

describe('GET /api/admin/cohorts', () => {
    test('lists all cohorts', async () => {
        const token = await adminToken();
        await Cohort.create(validPayload({ name: 'A' }));
        await Cohort.create(validPayload({ name: 'B' }));

        const res = await request(app).get('/api/admin/cohorts').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });
});

describe('GET /api/admin/cohorts/:id', () => {
    test('returns a single cohort', async () => {
        const token = await adminToken();
        const cohort = await Cohort.create(validPayload());

        const res = await request(app).get(`/api/admin/cohorts/${cohort._id}`).set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(cohort._id.toString());
    });

    test('400s for a malformed ID', async () => {
        const token = await adminToken();
        const res = await request(app).get('/api/admin/cohorts/not-an-id').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('INVALID_ID');
    });

    test('404s for a missing cohort', async () => {
        const token = await adminToken();
        const res = await request(app)
            .get('/api/admin/cohorts/507f1f77bcf86cd799439011')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('COHORT_NOT_FOUND');
    });
});

describe('PUT /api/admin/cohorts/:id', () => {
    test('updates only the fields provided (partial update)', async () => {
        const token = await adminToken();
        const cohort = await Cohort.create(validPayload({ name: 'Original' }));

        const res = await request(app)
            .put(`/api/admin/cohorts/${cohort._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Renamed' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Renamed');

        const reloaded = await Cohort.findById(cohort._id);
        expect(reloaded.startDate).toEqual(cohort.startDate);
    });

    test('rejects an update that would make endDate before startDate', async () => {
        const token = await adminToken();
        const cohort = await Cohort.create(validPayload({ startDate: daysFromNow(0), endDate: daysFromNow(10) }));

        const res = await request(app)
            .put(`/api/admin/cohorts/${cohort._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ endDate: daysFromNow(-5) });

        expect(res.status).toBe(400);
        expect(res.body.error.details).toEqual(expect.arrayContaining(['endDate must be after startDate']));
    });

    test('adds students and quizzes to an existing cohort', async () => {
        const token = await adminToken();
        const cohort = await Cohort.create(validPayload());
        const { user: student } = await createUser(User, { username: 'stu2', type: 'student' });
        await seedQuiz({ quizId: 9, title: 'New Quiz' });

        const res = await request(app)
            .put(`/api/admin/cohorts/${cohort._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ students: [student._id.toString()], quizzes: [9] });

        expect(res.status).toBe(200);
        expect(res.body.students).toHaveLength(1);
        expect(res.body.quizzes).toEqual([{ id: 9, title: 'New Quiz' }]);
    });
});

describe('DELETE /api/admin/cohorts/:id', () => {
    test('deletes a cohort', async () => {
        const token = await adminToken();
        const cohort = await Cohort.create(validPayload());

        const res = await request(app).delete(`/api/admin/cohorts/${cohort._id}`).set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(await Cohort.findById(cohort._id)).toBeNull();
    });

    test('404s for a missing cohort', async () => {
        const token = await adminToken();
        const res = await request(app)
            .delete('/api/admin/cohorts/507f1f77bcf86cd799439011')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(404);
    });
});
