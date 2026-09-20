const { verifyToken } = require('../middleware/authMiddleware');
const ApiError = require('../utils/apiError');
const { getActiveCohorts, hasAnyRealCohortMembership, getActiveGuestCohort } = require('../utils/cohortAccess');
const { buildQuizStatusMap } = require('../utils/quizStatus');

/**
 * `statusMap` (see quizStatus.js) is only built for students — admins see
 * every quiz as never taken/locked, since the retake lock is a per-student
 * concept and admins aren't subject to it (see POST /api/quiz below).
 */
function toQuizSummary(quiz, statusMap) {
    const status = statusMap ? statusMap.get(quiz.quizId) : undefined;
    return {
        id: quiz.quizId,
        title: quiz.title,
        taken: Boolean(status && status.taken),
        locked: Boolean(status && status.locked)
    };
}

function toQuizResponse(quiz) {
    return { id: quiz.quizId, title: quiz.title, questions: quiz.questions };
}

/**
 * Cohort-based access control for students. Always returns a `Set<number>`
 * of accessible `Quiz.quizId`s:
 *   - A student with zero *real* (non-guest) cohort membership — including a
 *     never-assigned legacy account or an App/Play Store reviewer account —
 *     falls back to the active Guest cohort's quiz set (empty Set if no
 *     Guest cohort is currently active/seeded). This used to mean
 *     unrestricted access to every quiz; see cohortAccess.js for the
 *     rationale behind the change.
 *   - Otherwise, the union of quizzes from every real cohort the student is
 *     currently active in (current membership AND startDate <= now <=
 *     endDate). A student who belongs only to a not-yet-started or
 *     already-ended cohort gets an empty Set, not the Guest fallback —
 *     having ever had real cohort membership opts them out of Guest.
 * Admins should never call this — they always see every quiz, checked by the
 * caller via `req.user.type !== 'admin'` before invoking it.
 */
async function getAccessibleQuizIds(userId, Cohort) {
    const hasRealCohort = await hasAnyRealCohortMembership(userId, Cohort);
    if (!hasRealCohort) {
        const guestCohort = await getActiveGuestCohort(Cohort);
        return guestCohort ? new Set(guestCohort.quizzes) : new Set();
    }

    const activeCohorts = await getActiveCohorts(userId, Cohort);
    const accessibleIds = new Set();
    activeCohorts.forEach(cohort => cohort.quizzes.forEach(quizId => accessibleIds.add(quizId)));
    return accessibleIds;
}

module.exports = function(app, User, Quiz, Cohort) {
    // Get list of all available quizzes (protected route)
    app.get("/api/quizzes", verifyToken, async (req, res, next) => {
        try {
            let filter = {};
            let statusMap = null;
            if (req.user.type !== 'admin') {
                const accessibleIds = await getAccessibleQuizIds(req.user.id, Cohort);
                filter = { quizId: { $in: Array.from(accessibleIds) } };

                const currentUser = await User.findById(req.user.id, { quizzes: 1, reopenedQuizIds: 1 });
                statusMap = buildQuizStatusMap(
                    currentUser ? currentUser.quizzes : [],
                    currentUser ? currentUser.reopenedQuizIds : []
                );
            }

            const quizzes = await Quiz.find(filter).sort({ quizId: 1 });
            res.json(quizzes.map((quiz) => toQuizSummary(quiz, statusMap)));
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
                    if (!accessibleIds.has(quizId)) {
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
                    if (!accessibleIds.has(quizId)) {
                        return next(ApiError.forbidden(
                            'QUIZ_NOT_IN_COHORT',
                            'This quiz is not part of any of your active cohorts'
                        ));
                    }

                    // A quiz already completed once is locked from retakes
                    // until an admin reopens it — admins themselves bypass
                    // this (same exemption as the cohort check above) so
                    // they can backfill/re-record an attempt on a student's
                    // behalf regardless of lock state.
                    const statusMap = buildQuizStatusMap(user.quizzes, user.reopenedQuizIds);
                    const status = statusMap.get(quizId);
                    if (status && status.locked) {
                        return next(ApiError.conflict(
                            'QUIZ_LOCKED',
                            'This quiz has already been completed. Ask an admin to reopen it before retaking.'
                        ));
                    }
                }

                // Add the completed quiz to user's quizzes array
                user.quizzes.push(quizData);
                user.updatedAt = new Date();

                // A reopened quiz grants exactly one more attempt, then
                // auto-relocks — consume the grant on any successful save
                // for this quizId, whether submitted by the student
                // themselves or backfilled by an admin.
                const savedQuizId = Number(quizData.id);
                if (user.reopenedQuizIds && user.reopenedQuizIds.includes(savedQuizId)) {
                    user.reopenedQuizIds = user.reopenedQuizIds.filter((id) => id !== savedQuizId);
                }

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
