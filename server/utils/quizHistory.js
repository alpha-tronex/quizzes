/**
 * Each completed attempt embedded on `User.quizzes[]` stores a `title`
 * snapshot from whenever it was saved (see models/User.js). That snapshot
 * exists purely as a fallback for a quiz that's since been deleted — it is
 * NOT the source of truth while the quiz still exists. An admin can rename a
 * live `Quiz` document at any time (see adminQuizRoutes.js's upload/edit
 * path) without touching any existing attempts, so a screen reading the raw
 * snapshot silently drifts from what the quiz is called today, while a
 * screen that joins live (e.g. GET /api/quizzes, via quizId) shows the
 * current name — same quiz, two different titles on two screens. See the
 * bug report: quiz id 2 was renamed "Islam 101.2" -> "Basic Algebra"; the
 * quizzes list (live join) showed "Basic Algebra - Taken" while history
 * (raw snapshot) still showed those attempts under "Islam 101.2".
 *
 * Always prefer the quiz's current title when the quiz still exists; only
 * fall back to the stored snapshot when there's no live quiz to join
 * against (deleted quiz) so that history for a removed quiz doesn't lose
 * its title entirely.
 */
function withLiveTitles(attempts, titleByQuizId) {
    return (attempts || []).map((attempt) => {
        const liveTitle = titleByQuizId.get(attempt.id);
        return liveTitle === undefined ? attempt : { ...attempt, title: liveTitle };
    });
}

module.exports = { withLiveTitles };
