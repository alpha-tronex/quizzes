const request = require('supertest');
const createApp = require('../app');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
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

async function seedQuiz(overrides = {}) {
    return Quiz.create({
        quizId: overrides.quizId ?? 0,
        title: overrides.title || 'Islam 101',
        description: overrides.description || '',
        questions: overrides.questions || [
            {
                questionNum: 0,
                questionType: 'MultipleChoice',
                instructions: 'Select all correct answers.',
                question: 'Sample question?',
                answers: ['A', 'B', 'C'],
                correct: [0, 2]
            }
        ]
    });
}

describe('GET /api/quizzes', () => {
    test('requires authentication', async () => {
        const res = await request(app).get('/api/quizzes');
        expect(res.status).toBe(401);
    });

    test('lists quizzes as {id, title} summaries', async () => {
        await seedQuiz({ quizId: 0, title: 'Islam 101' });
        await seedQuiz({ quizId: 1, title: 'Islam 201' });
        const { token } = await createUser(User);

        const res = await request(app).get('/api/quizzes').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(expect.arrayContaining([
            { id: 0, title: 'Islam 101' },
            { id: 1, title: 'Islam 201' }
        ]));
    });
});

describe('GET /api/quiz', () => {
    test('gets the default quiz (id 0) when no id is given', async () => {
        await seedQuiz({ quizId: 0, title: 'Default Quiz' });
        const { token } = await createUser(User);

        const res = await request(app).get('/api/quiz').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(0);
        expect(res.body.title).toBe('Default Quiz');
        expect(Array.isArray(res.body.questions)).toBe(true);
    });

    test('gets a quiz by id, preserving the {id, title, questions} shape', async () => {
        await seedQuiz({ quizId: 5, title: 'Fiqh Basics' });
        const { token } = await createUser(User);

        const res = await request(app).get('/api/quiz?id=5').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 5, title: 'Fiqh Basics' });
        expect(res.body.questions[0]).toMatchObject({ questionNum: 0, questionType: 'MultipleChoice' });
    });

    test('returns 404 for a missing quiz id', async () => {
        const { token } = await createUser(User);
        const res = await request(app).get('/api/quiz?id=999').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('QUIZ_NOT_FOUND');
    });
});

describe('POST /api/quiz', () => {
    test('saves a completed quiz onto the user record', async () => {
        const { token, user } = await createUser(User, { username: 'quiztaker' });
        const quizData = { id: 0, title: 'Islam 101', score: 3, totalQuestions: 3, questions: [] };

        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: user.username, quizData });

        expect(res.status).toBe(200);

        const reloaded = await User.findById(user._id);
        expect(reloaded.quizzes).toHaveLength(1);
        expect(reloaded.quizzes[0].title).toBe('Islam 101');
    });

    test('rejects a missing username or quizData', async () => {
        const { token } = await createUser(User);
        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    test('404s when the user does not exist', async () => {
        const { token } = await createUser(User);
        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: 'ghost-user', quizData: { id: 0 } });

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });
});

describe('GET /api/quiz/history/:username', () => {
    test('requires authentication', async () => {
        const res = await request(app).get('/api/quiz/history/someone');
        expect(res.status).toBe(401);
    });

    test('returns the quiz history for a user', async () => {
        const { token, user } = await createUser(User, {
            username: 'historyuser',
            quizzes: [{ id: 0, title: 'Islam 101', score: 2, totalQuestions: 3 }]
        });

        const res = await request(app)
            .get(`/api/quiz/history/${user.username}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.quizzes).toHaveLength(1);
    });

    test('404s for an unknown username', async () => {
        const { token } = await createUser(User);
        const res = await request(app)
            .get('/api/quiz/history/nobody-here')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });
});
