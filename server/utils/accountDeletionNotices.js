/**
 * Builds and persists an `AccountDeletionNotice` (models/AccountDeletionNotice.js)
 * for a student's self-service account deletion (`DELETE /api/account` —
 * routes/authRoutes.js), so an admin can see that a member of one of their
 * real (non-guest) cohorts has left. Deliberately scoped to the self-service
 * path only — an admin-initiated hard delete (`DELETE /api/admin/user/:id`)
 * is something the admin already knows about, so it doesn't create a notice.
 *
 * `cohortNames` must be captured by the caller *before* `deleteUserCascade`
 * runs (that cascade pulls the user out of every cohort's `students` array,
 * so the membership wouldn't be visible afterward). `deletedUser` is the
 * document `deleteUserCascade` returns — already deleted, just not yet
 * garbage-collected from memory.
 *
 * No-ops (no notice, no DB write) when `cohortNames` is empty — a guest or
 * never-assigned student deleting their own account isn't something any
 * admin needs to react to.
 *
 * A failure here is logged and swallowed, never thrown: the account is
 * already gone by the time this runs, so a transient DB error creating the
 * notice must not turn an otherwise-successful deletion into a 500 for the
 * student who just deleted their account.
 */
async function recordAccountDeletionIfCohortMember(deletedUser, cohortNames, AccountDeletionNotice) {
    if (!cohortNames || cohortNames.length === 0) {
        return null;
    }

    try {
        return await AccountDeletionNotice.create({
            studentUsername: deletedUser.username,
            studentFname: deletedUser.fname || '',
            studentLname: deletedUser.lname || '',
            cohortNames,
            quizzesTakenCount: (deletedUser.quizzes || []).length,
            deletedAt: new Date()
        });
    } catch (err) {
        console.error('Failed to record account-deletion notice:', err);
        return null;
    }
}

module.exports = { recordAccountDeletionIfCohortMember };
