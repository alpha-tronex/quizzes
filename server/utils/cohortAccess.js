/**
 * Shared cohort-access helpers, used by both the student-facing quiz routes
 * (routes/quizRoutes.js, which needs the accessible quiz ID set) and the
 * student-facing cohort-info route (routes/cohortRoutes.js, which needs the
 * display name). Keeping "what cohort(s) is this student currently active
 * in" in one place avoids the two routes drifting apart on what "active"
 * means.
 *
 * Guest fallback: a student with no *real* (non-guest) cohort membership —
 * including a never-assigned legacy account or an App/Play Store reviewer
 * account, which is just a plain student account with no cohort — falls
 * back to the single designated Guest cohort (Cohort.isGuest === true, see
 * models/Cohort.js and scripts/seed_guest_cohort.js) rather than getting
 * unrestricted access to every quiz.
 */

const GUEST_COHORT_NAME = 'Guest';

/**
 * Real (non-guest) cohorts this student is presently active in — active
 * meaning current membership AND today falls within [startDate, endDate].
 */
async function getActiveCohorts(userId, Cohort) {
    const now = new Date();
    return Cohort.find({
        students: userId,
        isGuest: { $ne: true },
        startDate: { $lte: now },
        endDate: { $gte: now }
    });
}

/** Has this student ever been added to a real (non-guest) cohort, active or not. */
async function hasAnyRealCohortMembership(userId, Cohort) {
    return Boolean(await Cohort.exists({ students: userId, isGuest: { $ne: true } }));
}

/** The single designated Guest cohort, if one exists and is currently active. */
async function getActiveGuestCohort(Cohort) {
    const now = new Date();
    return Cohort.findOne({ isGuest: true, startDate: { $lte: now }, endDate: { $gte: now } });
}

module.exports = {
    GUEST_COHORT_NAME,
    getActiveCohorts,
    hasAnyRealCohortMembership,
    getActiveGuestCohort
};
