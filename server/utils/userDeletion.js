/**
 * Shared hard-delete logic used by both the self-service
 * `DELETE /api/account` route (routes/authRoutes.js) and the admin
 * `DELETE /api/admin/user/:id` route (routes/adminUserRoutes.js), so both
 * paths clean up cross-collection references the same way.
 *
 * Deleting the User document alone isn't enough: `Cohort.students` holds
 * ObjectId references back to the user (see models/Cohort.js's comment on
 * why the relationship isn't mirrored on User) that would otherwise be
 * orphaned. Mongoose's `populate` silently drops a ref that no longer
 * resolves, so this wouldn't surface as a visible bug — but it's dead
 * weight in the collection and a landmine for any future code (a count of
 * `cohort.students.length`, an aggregation, a migration) that assumes every
 * id in `students` resolves to a real user.
 *
 * Takes `User`/`Cohort` as parameters rather than requiring the models
 * directly, matching this codebase's existing dependency-injection
 * convention for cross-collection helpers (see utils/cohortAccess.js).
 */

/**
 * Permanently deletes a user and removes them from every cohort's
 * `students` list. Returns the deleted user document, or `null` if no user
 * with that id existed (caller should treat that as a 404).
 */
async function deleteUserCascade(userId, User, Cohort) {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
        return null;
    }

    await Cohort.updateMany(
        { students: userId },
        { $pull: { students: userId } }
    );

    return deletedUser;
}

module.exports = { deleteUserCascade };
