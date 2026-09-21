const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/authMiddleware');

/**
 * Creates a User document directly (bypassing the /api/register endpoint)
 * and returns it along with a valid JWT for it, for tests that need an
 * authenticated request without exercising registration itself.
 */
async function createUser(User, overrides = {}) {
    const plainPassword = overrides.password || 'password123';
    const user = await User.create({
        fname: overrides.fname ?? 'Test',
        lname: overrides.lname ?? 'User',
        username: overrides.username || 'testuser',
        email: overrides.email || 'test@example.com',
        password: await bcrypt.hash(plainPassword, 10),
        phone: overrides.phone ?? '',
        type: overrides.type || 'student',
        createdAt: new Date(),
        updatedAt: new Date(),
        quizzes: overrides.quizzes || [],
        reopenedQuizIds: overrides.reopenedQuizIds || []
    });

    const token = generateToken(user);
    return { user, token, plainPassword };
}

function sampleQuizPayload(overrides = {}) {
    return {
        title: overrides.title || 'Sample Quiz',
        description: overrides.description,
        questions: overrides.questions || [
            {
                questionNum: 0,
                questionType: 'MultipleChoice',
                instructions: 'Select all that apply.',
                question: 'Which of these are colors?',
                answers: ['Red', 'Blue', 'Dog', 'Green'],
                correct: [0, 1, 3]
            }
        ],
        ...(overrides.id !== undefined ? { id: overrides.id } : {})
    };
}

module.exports = { createUser, sampleQuizPayload };
