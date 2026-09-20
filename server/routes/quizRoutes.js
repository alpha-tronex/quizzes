const { verifyToken } = require('../middleware/authMiddleware');
const ApiError = require('../utils/apiError');

function toQuizSummary(quiz) {
    return { id: quiz.quizId, title: quiz.title };
}

function toQuizResponse(quiz) {
    return { id: quiz.quizId, title: quiz.title, questions: quiz.questions };
}

/**
 * Cohort-based access control for students. Returns:
 *   - `null` if the user has never belonged to any cohort at all — this
 *     means "no restriction", preserving today's unfiltered behavior for
 *     every existing/legacy student account with no cohort assigned.
 *   - a `Set<number>` of accessible `Quiz.quizId`s otherwise, scoped to
 *     cohorts the user is currently a member of AND that are presently
 *     active (startDate <= now <= endDate). A student who belongs only to a
 *     not-yet-started or already-ended cohort gets an empty Set (i.e. zero
 *     accessible quizzes right now), not `null` — membership existing at all
 *     is what turns scoping on; the active-date check narrows it from there.
 * Admins should never call this — they always see every quiz, checked by the
 * caller via `req.user.type !== 'admin'` before invoking it.
 */
async function getAccessibleQuizIds(userId, Cohort) {
    const hasAnyCohort = await Cohort.exists({ students: userId });
    if (!hasAnyCohort) {
        return null;
    }

    const now = new Date();
    const activeCohorts = await Cohort.find({
        students: userId,
        startDate: { $lte: now },
        endDate: { $gte: now }
    });

    const accessibleIds = new Set();
    activeCohorts.forEach(cohort => cohort.quizzes.forEach(quizId => accessibleIds.add(quizId)));
    return accessibleIds;
}

module.exports = function(app, User, Quiz, Cohort) {
    // Get list of all available quizzes (protected route)
    app.get("/api/quizzes", verifyToken, async (req, res, next) => {
        try {
            let filter = {};
            if (req.user.type !== 'admin') {
                const accessibleIds = await getAccessibleQuizIds(req.user.id, Cohort);
                if (accessibleIds !== null) {
                    filter = { quizId: { $in: Array.from(accessibleIds) } };
                }
            }

            const quizzes = await Quiz.find(filter).sort({ quizId: 1 });
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

                if (req.user.type !== 'admin') {
                    const accessibleIds = await getAccessibleQuizIds(req.user.id, Cohort);
                    if (accessibleIds !== null && !accessibleIds.has(quizId)) {
                        return next(ApiError.forbidden(
                            'QUIZ_NOT_IN_COHORT',
                            'This quiz is not part of any of your active cohorts'
                        ));
                    }
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

                // `username` comes from the request body, not the token — without
                // this check, any authenticated student could write a fabricated
                // score onto another student's history just by naming them in the
                // payload. Admins are exempt so they can record/backfill an
                // attempt on a student's behalf.
                if (req.user.type !== 'admin' && req.user.username !== username) {
                    return next(ApiError.forbidden(
                        'USERNAME_MISMATCH',
                        'You can only save quiz attempts for your own account'
                    ));
                }

                if (req.user.type !== 'admin') {
                    const accessibleIds = await getAccessibleQuizIds(req.user.id, Cohort);
                    const quizId = Number(quizData.id);
                    if (accessibleIds !== null && !accessibleIds.has(quizId)) {
                        return next(ApiError.forbidden(
                            'QUIZ_NOT_IN_COHORT',
                            'This quiz is not part of any of your active cohorts'
                        ));
                    }
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
