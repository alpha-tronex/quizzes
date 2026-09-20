const mongoose = require('mongoose');

// A Cohort is a group of students (many-to-many: a student can belong to
// several cohorts at once) scoped to a date range, with a set of quizzes
// (referenced by `Quiz.quizId`, not Mongo `_id` — see models/Quiz.js) that
// its members are allowed to take while the cohort is active.
//
// Cohort is the single source of truth for both relationships. `User` does
// NOT keep a mirrored `cohorts` array — looking up a student's cohorts via
// `Cohort.find({ students: userId })` avoids a dual-write consistency bug
// where the two sides of the relationship could drift apart. The `students`
// field is indexed below since that lookup runs on every quiz-access check.
//
// Business-rule validation (endDate > startDate, students/quizzes actually
// existing) intentionally lives in server/routes/adminCohortRoutes.js rather
// than here, matching this codebase's existing convention of keeping models
// structural and putting cross-field/cross-collection checks in the route
// layer (see adminQuizRoutes.js's duplicate-title check for precedent).
const cohortSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    quizzes: [{ type: Number }],
    // Marks the single designated fallback cohort used for students with no
    // real cohort membership (never-assigned students, and App/Play Store
    // reviewer accounts, which are just plain student accounts — see
    // server/utils/cohortAccess.js). Not exposed on the admin create/edit
    // payload (adminCohortRoutes.js's validateCohortPayload never sets it) —
    // it's only ever set by server/scripts/seed_guest_cohort.js, so it can't
    // be toggled by accident through the admin UI. The partial unique index
    // below enforces at most one Guest cohort exists at the DB level.
    isGuest: { type: Boolean, default: false }
}, { timestamps: true });

cohortSchema.index({ students: 1 });
cohortSchema.index({ isGuest: 1 }, { unique: true, partialFilterExpression: { isGuest: true } });

module.exports = mongoose.models.Cohort || mongoose.model('Cohort', cohortSchema);
