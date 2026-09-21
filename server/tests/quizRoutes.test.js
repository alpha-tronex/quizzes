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
            { id: 0, title: 'Islam 101', taken: false, locked: false },
            { id: 1, title: 'Islam 201', taken: false, locked: false }
        ]));
    });
});

describe('GET /api/quizzes — taken/locked status', () => {
    test('a never-taken quiz is neither taken nor locked', async () => {
        await seedQuiz({ quizId: 0, title: 'Fresh Quiz' });
        const { token } = await createUser(User, { username: 'freshtaker', type: 'student' });

        const res = await request(app).get('/api/quizzes').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 0, title: 'Fresh Quiz', taken: false, locked: false }]);
    });

    test('a completed quiz is taken and locked', async () => {
        await seedQuiz({ quizId: 0, title: 'Completed Quiz' });
        const { token } = await createUser(User, {
            username: 'lockedtaker',
            type: 'student',
            quizzes: [{ id: 0, title: 'Completed Quiz', score: 1, totalQuestions: 1 }]
        });

        const res = await request(app).get('/api/quizzes').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 0, title: 'Completed Quiz', taken: true, locked: true }]);
    });

    test('a reopened quiz is taken but not locked', async () => {
        await seedQuiz({ quizId: 0, title: 'Reopened Quiz' });
        const { token, user } = await createUser(User, {
            username: 'reopenedtaker',
            type: 'student',
            quizzes: [{ id: 0, title: 'Reopened Quiz', score: 1, totalQuestions: 1 }]
        });
        user.reopenedQuizIds = [0];
        await user.save();

        const res = await request(app).get('/api/quizzes').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 0, title: 'Reopened Quiz', taken: true, locked: false }]);
    });
});

function daysFromNow(days) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe('GET /api/quizzes — cohort filtering', () => {
    test('a student in zero cohorts sees only the active Guest cohort\'s quizzes', async () => {
        await seedQuiz({ quizId: 0, title: 'Guest Quiz' });
        await seedQuiz({ quizId: 1, title: 'Not A Guest Quiz' });
        await Cohort.create({
            name: 'Guest', isGuest: true, startDate: daysFromNow(-1), endDate: daysFromNow(365),
            students: [], quizzes: [0]
        });
        const { token } = await createUser(User, { username: 'nocohort', type: 'student' });

        const res = await request(app).get('/api/quizzes').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 0, title: 'Guest Quiz', taken: false, locked: false }]);
    });

    test('a student in zero cohorts sees no quizzes when no Guest cohort has been seeded', async () => {
        await seedQuiz({ quizId: 0, title: 'Islam 101' });
        const { token } = await createUser(User, { username: 'noguestseeded', type: 'student' });

        const res = await request(app).get('/api/quizzes').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('a student in zero cohorts sees no quizzes when the Guest cohort exists but is not currently active', async () => {
        await seedQuiz({ quizId: 0, title: 'Islam 101' });
        await Cohort.create({
            name: 'Guest', isGuest: true, startDate: daysFromNow(-30), endDate: daysFromNow(-10),
            students: [], quizzes: [0]
        });
        const { token } = await createUser(User, { username: 'expiredguest', type: 'student' });

        const res = await request(app).get('/api/quizzes').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
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
        expect(res.body).toEqual([{ id: 0, title: 'In Cohort', taken: false, locked: false }]);
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
            { id: 0, title: 'Cohort A Quiz', taken: false, locked: false },
            { id: 1, title: 'Cohort B Quiz', taken: false, locked: false }
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

    test('allows a no-cohort student to fetch a quiz that is part of the active Guest cohort', async () => {
        await seedQuiz({ quizId: 7, title: 'Guest Quiz' });
        await Cohort.create({
            name: 'Guest', isGuest: true, startDate: daysFromNow(-1), endDate: daysFromNow(365),
            students: [], quizzes: [7]
        });
        const { token } = await createUser(User, { username: 'guestreader', type: 'student' });

        const res = await request(app).get('/api/quiz?id=7').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(7);
    });

    test('403s when a no-cohort student requests a quiz outside the Guest cohort', async () => {
        await seedQuiz({ quizId: 8, title: 'Not A Guest Quiz' });
        await Cohort.create({
            name: 'Guest', isGuest: true, startDate: daysFromNow(-1), endDate: daysFromNow(365),
            students: [], quizzes: [7]
        });
        const { token } = await createUser(User, { username: 'guestoutsider', type: 'student' });

        const res = await request(app).get('/api/quiz?id=8').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('QUIZ_NOT_IN_COHORT');
    });
});

describe('POST /api/quiz', () => {
    test('saves a completed quiz onto the user record', async () => {
        await seedQuiz({ quizId: 0, title: 'Islam 101' });
        await Cohort.create({
            name: 'Guest', isGuest: true, startDate: daysFromNow(-1), endDate: daysFromNow(365),
            students: [], quizzes: [0]
        });
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
        await seedQuiz({ quizId: 0, title: 'Islam 101' });
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

describe('POST /api/quiz — authoritative scoring', () => {
    // Regression coverage for the fix that stopped trusting the client's
    // submitted score/isCorrect (see quizScoring.js and the client-side
    // 1-based/0-based indexing bug it defends against).
    //
    // These tests submit as a plain student, which is also subject to the
    // (unrelated) cohort-access check earlier in the same route — so each
    // one also grants Guest-cohort access to the quiz being scored, the same
    // way the "POST /api/quiz — cohort filtering" tests below do.
    async function seedScoringQuiz(quizId) {
        await Cohort.create({
            name: 'Guest', isGuest: true, startDate: daysFromNow(-1), endDate: daysFromNow(365),
            students: [], quizzes: [quizId]
        });
        return seedQuiz({
            quizId,
            title: 'Basic Algebra',
            questions: [
                { questionNum: 0, questionType: 'SingleAnswer', instructions: '', question: 'Solve for x: 2x + 3 = 11', answers: ['3', '4', '5', '6'], correct: [1] },
                { questionNum: 1, questionType: 'TrueFalse', instructions: '', question: 'True or false: 5 is prime.', answers: ['True', 'False'], correct: [0] }
            ]
        });
    }

    test('recomputes score/isCorrect from the canonical quiz, ignoring a lying client', async () => {
        await seedScoringQuiz(0);
        const { token, user } = await createUser(User, { username: 'honestscorer' });
        const quizData = {
            id: 0,
            title: 'Basic Algebra',
            // Client claims a perfect score with bogus per-question data.
            score: 99,
            totalQuestions: 99,
            questions: [
                { questionNum: 0, question: 'Solve for x: 2x + 3 = 11', answers: ['3', '4', '5', '6'], selection: [1], correct: [1], isCorrect: true },
                { questionNum: 1, question: 'True or false: 5 is prime.', answers: ['True', 'False'], selection: [0], correct: [0], isCorrect: true }
            ]
        };

        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: user.username, quizData });

        expect(res.status).toBe(200);
        expect(res.body.quiz).toMatchObject({ score: 2, totalQuestions: 2 });

        const reloaded = await User.findById(user._id);
        expect(reloaded.quizzes[0].score).toBe(2);
        expect(reloaded.quizzes[0].totalQuestions).toBe(2);
        expect(reloaded.quizzes[0].questions[0].isCorrect).toBe(true);
        expect(reloaded.quizzes[0].questions[1].isCorrect).toBe(true);
    });

    test('marks a question correct at index 0, the case the old client-trust bug could never satisfy', async () => {
        await seedScoringQuiz(0);
        const { token, user } = await createUser(User, { username: 'indexzeroscorer' });
        const quizData = {
            id: 0,
            title: 'Basic Algebra',
            score: 0,
            totalQuestions: 2,
            questions: [
                { questionNum: 0, question: 'Solve for x: 2x + 3 = 11', answers: ['3', '4', '5', '6'], selection: [1] },
                // Student picked "True" (index 0), which is the actual
                // correct answer — the client under the old bug would have
                // submitted isCorrect: false here regardless.
                { questionNum: 1, question: 'True or false: 5 is prime.', answers: ['True', 'False'], selection: [0], isCorrect: false }
            ]
        };

        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: user.username, quizData });

        expect(res.status).toBe(200);

        const reloaded = await User.findById(user._id);
        expect(reloaded.quizzes[0].questions[1].isCorrect).toBe(true);
        expect(reloaded.quizzes[0].score).toBe(2);
    });

    test('scores a wrong answer as incorrect even if the client claims otherwise', async () => {
        await seedScoringQuiz(0);
        const { token, user } = await createUser(User, { username: 'wrongscorer' });
        const quizData = {
            id: 0,
            title: 'Basic Algebra',
            score: 2,
            totalQuestions: 2,
            questions: [
                { questionNum: 0, question: 'Solve for x: 2x + 3 = 11', answers: ['3', '4', '5', '6'], selection: [0], isCorrect: true },
                { questionNum: 1, question: 'True or false: 5 is prime.', answers: ['True', 'False'], selection: [0], isCorrect: true }
            ]
        };

        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: user.username, quizData });

        expect(res.status).toBe(200);

        const reloaded = await User.findById(user._id);
        expect(reloaded.quizzes[0].questions[0].isCorrect).toBe(false);
        expect(reloaded.quizzes[0].score).toBe(1);
    });

    test('falls back to the client-submitted score when no canonical quiz exists for the id', async () => {
        // No seedQuiz() call — quizId 42 has no matching Quiz document. Use
        // an admin so this doesn't also get rejected by the (unrelated)
        // cohort-membership check that non-admins go through first.
        const { token } = await createUser(User, { username: 'orphanadmin', type: 'admin' });
        const { user: student } = await createUser(User, { username: 'orphanscorer' });
        const quizData = { id: 42, title: 'Orphaned Quiz', score: 1, totalQuestions: 1, questions: [] };

        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: student.username, quizData });

        expect(res.status).toBe(200);

        const reloaded = await User.findById(student._id);
        expect(reloaded.quizzes[0].score).toBe(1);
        expect(reloaded.quizzes[0].totalQuestions).toBe(1);
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

    test('allows a no-cohort student to save an attempt for a quiz inside the active Guest cohort', async () => {
        const { token, user } = await createUser(User, { username: 'guestsaver', type: 'student' });
        await Cohort.create({
            name: 'Guest', isGuest: true, startDate: daysFromNow(-1), endDate: daysFromNow(365),
            students: [], quizzes: [9]
        });
        const quizData = { id: 9, title: 'Guest Quiz', score: 1, totalQuestions: 1, questions: [] };

        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: user.username, quizData });

        expect(res.status).toBe(200);

        const reloaded = await User.findById(user._id);
        expect(reloaded.quizzes).toHaveLength(1);
    });
});

describe('POST /api/quiz — retake lock', () => {
    // Every case here submits as a plain student, so (like the "cohort
    // filtering" tests above) each needs Guest-cohort access to quizId 0 —
    // otherwise the unrelated cohort check earlier in the route would reject
    // the request before the lock logic under test is ever reached.
    async function grantGuestAccessToQuiz0() {
        await seedQuiz({ quizId: 0, title: 'Islam 101' });
        await Cohort.create({
            name: 'Guest', isGuest: true, startDate: daysFromNow(-1), endDate: daysFromNow(365),
            students: [], quizzes: [0]
        });
    }

    test('409s when a student tries to retake a quiz they already completed', async () => {
        await grantGuestAccessToQuiz0();
        const { token, user } = await createUser(User, {
            username: 'relocked',
            quizzes: [{ id: 0, title: 'Islam 101', score: 1, totalQuestions: 1 }]
        });
        const quizData = { id: 0, title: 'Islam 101', score: 2, totalQuestions: 2, questions: [] };

        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: user.username, quizData });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('QUIZ_LOCKED');

        const reloaded = await User.findById(user._id);
        expect(reloaded.quizzes).toHaveLength(1);
    });

    test('allows a retake once an admin has reopened the quiz, then relocks it', async () => {
        await grantGuestAccessToQuiz0();
        const { token, user } = await createUser(User, {
            username: 'reopenedretaker',
            quizzes: [{ id: 0, title: 'Islam 101', score: 1, totalQuestions: 1 }]
        });
        user.reopenedQuizIds = [0];
        await user.save();
        const quizData = { id: 0, title: 'Islam 101', score: 2, totalQuestions: 2, questions: [] };

        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: user.username, quizData });

        expect(res.status).toBe(200);

        const reloaded = await User.findById(user._id);
        expect(reloaded.quizzes).toHaveLength(2);
        // The reopen grant is single-use — it's consumed by this save, so a
        // further attempt would 409 again.
        expect(reloaded.reopenedQuizIds).toEqual([]);

        const secondAttempt = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: user.username, quizData });

        expect(secondAttempt.status).toBe(409);
        expect(secondAttempt.body.error.code).toBe('QUIZ_LOCKED');
    });

    test('an admin can save an attempt on a locked quiz on the student\'s behalf', async () => {
        const { token } = await createUser(User, { username: 'lockadmin', type: 'admin' });
        const { user: student } = await createUser(User, {
            username: 'lockedstudent',
            quizzes: [{ id: 0, title: 'Islam 101', score: 1, totalQuestions: 1 }]
        });
        const quizData = { id: 0, title: 'Islam 101', score: 2, totalQuestions: 2, questions: [] };

        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: student.username, quizData });

        expect(res.status).toBe(200);

        const reloaded = await User.findById(student._id);
        expect(reloaded.quizzes).toHaveLength(2);
    });

    test('a first-time attempt is unaffected by the lock', async () => {
        await grantGuestAccessToQuiz0();
        const { token, user } = await createUser(User, { username: 'firsttimer' });
        const quizData = { id: 0, title: 'Islam 101', score: 1, totalQuestions: 1, questions: [] };

        const res = await request(app)
            .post('/api/quiz')
            .set('Authorization', `Bearer ${token}`)
            .send({ username: user.username, quizData });

        expect(res.status).toBe(200);
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
