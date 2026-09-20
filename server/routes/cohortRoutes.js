const { verifyToken } = require('../middleware/authMiddleware');
const ApiError = require('../utils/apiError');
const { GUEST_COHORT_NAME, getActiveCohorts } = require('../utils/cohortAccess');

/**
 * Student-facing cohort-info route — "what cohort am I in right now",
 * used by the mobile app's home screen. Distinct from
 * routes/adminCohortRoutes.js, which is the admin CRUD surface for cohorts
 * themselves. Access-control (which quizzes a cohort unlocks) lives in
 * routes/quizRoutes.js; this route only reports the display name.
 */
module.exports = function(app, Cohort) {
    app.get('/api/cohort/mine', verifyToken, async (req, res, next) => {
        try {
            if (req.user.type === 'admin') {
                return next(ApiError.badRequest('ADMIN_HAS_NO_COHORT', 'Admin accounts do not belong to a cohort'));
            }

            const activeCohorts = await getActiveCohorts(req.user.id, Cohort);
            if (activeCohorts.length > 0) {
                return res.status(200).json({ name: activeCohorts.map(c => c.name).join(', ') });
            }

            res.status(200).json({ name: GUEST_COHORT_NAME });
        } catch (err) {
            next(err);
        }
    });
};
