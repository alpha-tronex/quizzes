/**
 * Per-quiz "taken"/"locked" status for a single student, derived from their
 * completed-attempt history plus any outstanding admin-granted reopen
 * tokens (`User.reopenedQuizIds` — see models/User.js and the admin
 * `POST /api/admin/user/:userId/reopen-quiz/:quizId` route).
 *
 *   - taken:  the student has at least one completed attempt on record for
 *             this quiz (quizAttemptSchema.id === Quiz.quizId).
 *   - locked: taken, and no reopen token is currently outstanding for it —
 *             a locked quiz can't be retaken (POST /api/quiz rejects it
 *             with QUIZ_LOCKED) until an admin reopens it. A quiz that has
 *             never been taken is never locked. A reopened quiz stays
 *             "taken" (so its summary/history stays reachable) but is not
 *             locked, allowing exactly one more attempt before it
 *             auto-relocks on save.
 *
 * Returns a `Map<quizId, {taken: boolean, locked: boolean}>` containing
 * only quizzes the student has actually taken — callers should treat a
 * missing entry as `{taken: false, locked: false}`.
 */
function buildQuizStatusMap(userQuizzes, reopenedQuizIds) {
    const takenIds = new Set((userQuizzes || []).map((attempt) => attempt.id));
    const reopenedSet = new Set(reopenedQuizIds || []);

    const statusMap = new Map();
    takenIds.forEach((quizId) => {
        statusMap.set(quizId, { taken: true, locked: !reopenedSet.has(quizId) });
    });
    return statusMap;
}

module.exports = { buildQuizStatusMap };
