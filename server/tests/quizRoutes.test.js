const request = require('supertest');
const createApp = require('../app');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
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

function daysFromNow(days) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe('GET /api/quizzes — cohort filtering', () => {
    test('a student in zero cohorts still sees every quiz (unrestricted default)', async () => {
        await seedQuiz({ quizId: 0, title: 'Islam 101' });
        await seedQuiz({ quizId: 1, title: 'Islam 201' });
        const { token } = await createUser(User, { username: 'nocohort', type: 'student' });

        const res = await request(app).get('/api/quizzes').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    test('a student in an active cohort only sees that cohort\'s quizzes', async () => {
        await seedQuiz({ quizId: 0, title: 'In Cohort' });
        await seedQuiz({ quizId: 1, title: 'Not In Cohort' });
        const { token, user } = await createUser(User, { username: 'cohortstudent', type: 'student' });
        await Cohort.create({
            name: 'Active Cohort',
            startDate: daysFromNow(-1),
            endDate: daysFromNow(10),
            students: [user._id],
            quizzes: [0]
        });

        const res = await request(app).get('/api/quizzes').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 0, title: 'In Cohort' }]);
    });

    test('a student whose only cohort has not started yet sees no quizzes', async () => {
        await seedQuiz({ quizId: 0, title: 'Future Quiz' });
        const { token, user } = await createUser(User, { username: 'futurestudent', type: 'student' });
        await Cohort.create({
            name: 'Future Cohort',
            startDate: daysFromNow(5),
            endDate: daysFromNow(15),
            students: [user._id],
            quizzes: [0]
        });

        const res = await request(app).get('/api/quizzes').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('a student in two active cohorts sees the union of both quiz sets', async () => {
        await seedQuiz({ quizId: 0, title: 'Cohort A Quiz' });
        await seedQuiz({ quizId: 1, title: 'Cohort B Quiz' });
        const { token, user } = await createUser(User, { username: 'multicohort', type: 'student' });
        await Cohort.create({
            name: 'Cohort A', startDate: daysFromNow(-1), endDate: daysFromNow(10),
            students: [user._id], quizzes: [0]
        });
        await Cohort.create({
            name: 'Cohort B', startDate: daysFromNow(-2), endDate: daysFromNow(5),
            students: [user._id], quizzes: [1]
        });

        const res = await request(app).get('/api/quizzes').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(expect.arrayContaining([
            { id: 0, title: 'Cohort A Quiz' },
            { id: 1, title: 'Cohort B Quiz' }
        ]));
        expect(res.body).toHaveLength(2);
    });

    test('an admin sees every quiz regardless of cohort membership', async () => {
        await seedQuiz({ quizId: 0, title: 'Quiz A' });
        await seedQuiz({ quizId: 1, title: 'Quiz B' });
        const { token } = await createUser(User, { username: 'quizadmin', type: 'admin' });

        const res = await request(app).get('/api/quizzes').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
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

describe('GET /api/quiz — cohort filtering', () => {
    test('403s when a student requests a quiz outside their active cohort', async () => {
        await seedQuiz({ quizId: 5, title: 'Outside Cohort' });
        const { token, user } = await createUser(User, { username: 'restrictedstudent', type: 'student' });
        await Cohort.create({
            name: 'Some Cohort', startDate: daysFromNow(-1), endDate: daysFromNow(10),
            students: [user._id], quizzes: [0]
        });

        const res = await request(app).get('/api/quiz?id=5').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('QUIZ_NOT_IN_COHORT');
    });

    test('allows a student to fetch a quiz that is part of their active cohort', async () => {
        await seedQuiz({ quizId: 5, title: 'In Cohort' });
        const { token, user } = await createUser(User, { username: 'allowedstudent', type: 'student' });
        await Cohort.create({
            name: 'Some Cohort', startDate: daysFromNow(-1), endDate: daysFromNow(10),
            students: [user._id], quizzes: [5]
        });

        const res = await request(app).get('/api/quiz?id=5').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(5);
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

    test('403s when a student tries to save an attempt onto a different existing account', async () => {
        const { token } = await createUser(User, { username: 'attacker' });
        const { user: victim } = await createUser(User, { username: 'victim' });
        const quizData = { id: 0, title: 'Islam 101', score: 3, totalQuestions: 3, questions: [] };

        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: victim.username, quizData });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('USERNAME_MISMATCH');

        const reloaded = await User.findById(victim._id);
        expect(reloaded.quizzes).toHaveLength(0);
    });

    test('allows an admin to save an attempt on behalf of another user', async () => {
        const { token } = await createUser(User, { username: 'quizadmin2', type: 'admin' });
        const { user: student } = await createUser(User, { username: 'onbehalfstudent' });
        const quizData = { id: 0, title: 'Islam 101', score: 3, totalQuestions: 3, questions: [] };

        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: student.username, quizData });

        expect(res.status).toBe(200);

        const reloaded = await User.findById(student._id);
        expect(reloaded.quizzes).toHaveLength(1);
    });
});

describe('POST /api/quiz — cohort filtering', () => {
    test('403s when a student tries to save an attempt for a quiz outside their active cohort', async () => {
        const { token, user } = await createUser(User, { username: 'blockedsaver', type: 'student' });
        await Cohort.create({
            name: 'Some Cohort', startDate: daysFromNow(-1), endDate: daysFromNow(10),
            students: [user._id], quizzes: [0]
        });
        const quizData = { id: 5, title: 'Outside Cohort', score: 1, totalQuestions: 1, questions: [] };

        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: user.username, quizData });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('QUIZ_NOT_IN_COHORT');

        const reloaded = await User.findById(user._id);
        expect(reloaded.quizzes).toHaveLength(0);
    });

    test('allows saving an attempt for a quiz inside an active cohort', async () => {
        const { token, user } = await createUser(User, { username: 'allowedsaver', type: 'student' });
        await Cohort.create({
            name: 'Some Cohort', startDate: daysFromNow(-1), endDate: daysFromNow(10),
            students: [user._id], quizzes: [5]
        });
        const quizData = { id: 5, title: 'Inside Cohort', score: 1, totalQuestions: 1, questions: [] };

        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: user.username, quizData });

        expect(res.status).toBe(200);

        const reloaded = await User.findById(user._id);
        expect(reloaded.quizzes).toHaveLength(1);
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
