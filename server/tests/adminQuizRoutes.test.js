const request = require('supertest');
const createApp = require('../app');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
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

async function adminToken(username = 'quizadmin') {
    const { token } = await createUser(User, { username, type: 'admin' });
    return token;
}

describe('admin-only enforcement', () => {
    test('POST /api/quiz/upload requires authentication', async () => {
        const res = await request(app).post('/api/quiz/upload').send(sampleQuizPayload());
        expect(res.status).toBe(401);
    });

    test('POST /api/quiz/upload rejects a non-admin user', async () => {
        const { token } = await createUser(User, { type: 'student' });
        const res = await request(app)
            .post('/api/quiz/upload')
            .set('Authorization', `Bearer ${token}`)
            .send(sampleQuizPayload());

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('ADMIN_REQUIRED');
    });
});

describe('POST /api/quiz/upload — validation', () => {
    test('rejects a quiz with no title', async () => {
        const token = await adminToken();
        const payload = sampleQuizPayload();
        delete payload.title;

        const res = await request(app).post('/api/quiz/upload').set('Authorization', `Bearer ${token}`).send(payload);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('MISSING_TITLE');
    });

    test('rejects a quiz with no questions', async () => {
        const token = await adminToken();
        const res = await request(app)
            .post('/api/quiz/upload')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'Empty Quiz', questions: [] });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('MISSING_QUESTIONS');
    });

    test('rejects a question with fewer than 2 answers', async () => {
        const token = await adminToken();
        const payload = sampleQuizPayload({
            questions: [{
                questionNum: 0,
                instructions: 'Pick one.',
                question: 'Only one answer?',
                answers: ['OnlyOne'],
                correct: [0]
            }]
        });

        const res = await request(app).post('/api/quiz/upload').set('Authorization', `Bearer ${token}`).send(payload);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('INVALID_QUESTION');
    });

    test('rejects a duplicate title (case-insensitive)', async () => {
        const token = await adminToken();
        await Quiz.create({ quizId: 0, title: 'Islam 101', questions: sampleQuizPayload().questions });

        const res = await request(app)
            .post('/api/quiz/upload')
            .set('Authorization', `Bearer ${token}`)
            .send(sampleQuizPayload({ title: 'islam 101' }));

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('DUPLICATE_TITLE');
    });
});

describe('POST /api/quiz/upload — ID assignment', () => {
    test('assigns id 0 to the first quiz', async () => {
        const token = await adminToken();
        const res = await request(app)
            .post('/api/quiz/upload')
            .set('Authorization', `Bearer ${token}`)
            .send(sampleQuizPayload({ title: 'First Quiz' }));

        expect(res.status).toBe(201);
        expect(res.body.quizId).toBe(0);
    });

    test('fills the lowest available gap in existing ids', async () => {
        const token = await adminToken();
        await Quiz.create({ quizId: 0, title: 'Quiz Zero', questions: sampleQuizPayload().questions });
        await Quiz.create({ quizId: 2, title: 'Quiz Two', questions: sampleQuizPayload().questions });

        const res = await request(app)
            .post('/api/quiz/upload')
            .set('Authorization', `Bearer ${token}`)
            .send(sampleQuizPayload({ title: 'Fills The Gap' }));

        expect(res.status).toBe(201);
        expect(res.body.quizId).toBe(1);
    });

    test('editing an existing quiz (id provided) overwrites it in place', async () => {
        const token = await adminToken();
        await Quiz.create({ quizId: 3, title: 'Old Title', questions: sampleQuizPayload().questions });

        const res = await request(app)
            .post('/api/quiz/upload')
            .set('Authorization', `Bearer ${token}`)
            .send(sampleQuizPayload({ id: 3, title: 'New Title' }));

        expect(res.status).toBe(201);
        expect(res.body.quizId).toBe(3);

        const stored = await Quiz.findOne({ quizId: 3 });
        expect(stored.title).toBe('New Title');
        expect(await Quiz.countDocuments({})).toBe(1);
    });
});

describe('GET /api/quiz/list', () => {
    test('lists quizzes with description/questionCount for admins', async () => {
        const token = await adminToken();
        await Quiz.create({ quizId: 0, title: 'Quiz A', questions: sampleQuizPayload().questions });

        const res = await request(app).get('/api/quiz/list').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body[0]).toMatchObject({ id: 0, title: 'Quiz A', questionCount: 1 });
    });
});

describe('deleting quizzes', () => {
    test('DELETE /api/admin/quiz-file/:quizId removes a single quiz', async () => {
        const token = await adminToken();
        await Quiz.create({ quizId: 7, title: 'Delete Me', questions: sampleQuizPayload().questions });

        const res = await request(app)
            .delete('/api/admin/quiz-file/7')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(await Quiz.findOne({ quizId: 7 })).toBeNull();
    });

    test('DELETE /api/admin/quiz-file/:quizId 404s for a missing quiz', async () => {
        const token = await adminToken();
        const res = await request(app)
            .delete('/api/admin/quiz-file/999')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    test('DELETE /api/quiz/delete/:id also deletes a quiz', async () => {
        const token = await adminToken();
        await Quiz.create({ quizId: 8, title: 'Delete Me Too', questions: sampleQuizPayload().questions });

        const res = await request(app)
            .delete('/api/quiz/delete/8')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(await Quiz.findOne({ quizId: 8 })).toBeNull();
    });

    test('DELETE /api/admin/quiz-files/all removes every quiz', async () => {
        const token = await adminToken();
        await Quiz.create({ quizId: 0, title: 'A', questions: sampleQuizPayload().questions });
        await Quiz.create({ quizId: 1, title: 'B', questions: sampleQuizPayload().questions });

        const res = await request(app)
            .delete('/api/admin/quiz-files/all')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.deletedCount).toBe(2);
        expect(await Quiz.countDocuments({})).toBe(0);
    });
});
