const { verifyToken } = require('../middleware/authMiddleware');
const ApiError = require('../utils/apiError');

function toQuizSummary(quiz) {
    return { id: quiz.quizId, title: quiz.title };
}

function toQuizResponse(quiz) {
    return { id: quiz.quizId, title: quiz.title, questions: quiz.questions };
}

module.exports = function(app, User, Quiz) {
    // Get list of all available quizzes (protected route)
    app.get("/api/quizzes", verifyToken, async (req, res, next) => {
        try {
            const quizzes = await Quiz.find({}).sort({ quizId: 1 });
            res.json(quizzes.map(toQuizSummary));
        } catch (err) {
            next(err);
        }
    });

    // Get a specific quiz or default quiz (protected route)
    app.route("/api/quiz")
        .get(verifyToken, async (req, res, next) => {
            try {
                const quizId = Number(req.query.id || 0);
                const quiz = await Quiz.findOne({ quizId });

                if (!quiz) {
                    return next(ApiError.notFound('QUIZ_NOT_FOUND', `Quiz ${quizId} not found`));
                }

                res.json(toQuizResponse(quiz));
            } catch (err) {
                next(err);
            }
        })
        .post(verifyToken, async (req, res, next) => {
            try {
                const { username, quizData } = req.body || {};

                if (!username || !quizData) {
                    return next(ApiError.badRequest('MISSING_FIELDS', 'Username and quiz data are required'));
                }

                const user = await User.findOne({ username: username });
                if (!user) {
                    return next(ApiError.notFound('USER_NOT_FOUND', 'User not found'));
                }

                // Add the completed quiz to user's quizzes array
                user.quizzes.push(quizData);
                user.updatedAt = new Date();
                await user.save();

                res.status(200).json({ message: 'Quiz saved successfully', quiz: quizData });
            } catch (err) {
                next(err);
            }
        });

    // Get quiz history for a specific user (protected route)
    app.get("/api/quiz/history/:username", verifyToken, async (req, res, next) => {
        try {
            const username = req.params.username;

            if (!username) {
                return next(ApiError.badRequest('MISSING_USERNAME', 'Username is required'));
            }

            const user = await User.findOne({ username: username });
            if (!user) {
                return next(ApiError.notFound('USER_NOT_FOUND', 'User not found'));
            }

            res.status(200).json({ quizzes: user.quizzes || [] });
        } catch (err) {
            next(err);
        }
    });
};
