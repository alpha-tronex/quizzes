const validators = require('../utils/validators');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const ApiError = require('../utils/apiError');
const { deleteUserCascade } = require('../utils/userDeletion');

const emptyAddress = {
    street1: '', street2: '', street3: '', city: '', state: '', zipCode: '', country: ''
};

/**
 * Admin User Routes
 * Handles all user management operations for administrators
 */
module.exports = function(app, User, Cohort, AccountDeletionNotice) {

    // Get all users (admin only)
    app.route("/api/admin/users")
        .get(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const users = await User.find({}, { password: 0 });

                const usersArray = users.map(user => ({
                    id: user._id,
                    fname: user.fname || '',
                    lname: user.lname || '',
                    uname: user.username,
                    email: user.email || '',
                    phone: user.phone || '',
                    type: user.type || 'student',
                    quizzes: user.quizzes || [],
                    reopenedQuizIds: user.reopenedQuizIds || [],
                    archived: user.archived || false,
                    archivedAt: user.archivedAt || null
                }));

                res.status(200).json(usersArray);
            } catch (err) {
                next(err);
            }
        });

    // Get user by ID (admin only)
    app.route("/api/admin/user/:id")
        .get(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const userId = req.params.id;

                const user = await User.findById(userId, { password: 0 });

                if (!user) {
                    return next(ApiError.notFound('USER_NOT_FOUND', 'User not found'));
                }

                res.status(200).json({
                    id: user._id,
                    fname: user.fname || '',
                    lname: user.lname || '',
                    uname: user.username,
                    email: user.email || '',
                    phone: user.phone || '',
                    type: user.type || 'student',
                    address: user.address || emptyAddress,
                    quizzes: user.quizzes || [],
                    reopenedQuizIds: user.reopenedQuizIds || [],
                    archived: user.archived || false,
                    archivedAt: user.archivedAt || null
                });
            } catch (err) {
                next(err);
            }
        })

        // Update user (admin only)
        .put(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const userId = req.params.id;
                const { fname, lname, email, phone, uname, type, address } = req.body || {};

                // Validation using validators module
                const validationErrors = [];

                if (uname && uname.trim()) {
                    const unameValidation = validators.validateUsername(uname);
                    if (!unameValidation.valid) {
                        validationErrors.push(unameValidation.error);
                    }
                }

                if (fname && fname.trim()) {
                    const fnameValidation = validators.validateName(fname, 'First name');
                    if (!fnameValidation.valid) {
                        validationErrors.push(fnameValidation.error);
                    }
                }

                if (lname && lname.trim()) {
                    const lnameValidation = validators.validateName(lname, 'Last name');
                    if (!lnameValidation.valid) {
                        validationErrors.push(lnameValidation.error);
                    }
                }

                if (email && email.trim()) {
                    const emailValidation = validators.validateEmail(email);
                    if (!emailValidation.valid) {
                        validationErrors.push(emailValidation.error);
                    }
                }

                if (phone && phone.trim()) {
                    const phoneValidation = validators.validatePhone(phone);
                    if (!phoneValidation.valid) {
                        validationErrors.push(phoneValidation.error);
                    }
                }

                if (type && type.trim()) {
                    const typeValidation = validators.validateUserType(type);
                    if (!typeValidation.valid) {
                        validationErrors.push(typeValidation.error);
                    }
                }

                if (address && address.zipCode && address.zipCode.trim()) {
                    const zipValidation = validators.validateZipCode(address.zipCode);
                    if (!zipValidation.valid) {
                        validationErrors.push(zipValidation.error);
                    }
                }

                if (validationErrors.length) {
                    return next(ApiError.badRequest('VALIDATION_ERROR', 'Validation failed', validationErrors));
                }

                // Check if username is taken by another user
                if (uname) {
                    const existingUser = await User.findOne({ username: uname, _id: { $ne: userId } });
                    if (existingUser) {
                        return next(ApiError.conflict('DUPLICATE_USERNAME', 'Username already in use'));
                    }
                }

                // Update user
                const updateData = { updatedAt: new Date() };
                if (fname !== undefined) updateData.fname = fname;
                if (lname !== undefined) updateData.lname = lname;
                if (email !== undefined) updateData.email = email;
                if (phone !== undefined) updateData.phone = phone;
                if (uname !== undefined) updateData.username = uname;
                if (type !== undefined) updateData.type = type;
                if (address !== undefined) updateData.address = address;

                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    updateData,
                    { new: true }
                );

                if (!updatedUser) {
                    return next(ApiError.notFound('USER_NOT_FOUND', 'User not found'));
                }

                res.status(200).json({
                    id: updatedUser._id,
                    fname: updatedUser.fname || '',
                    lname: updatedUser.lname || '',
                    uname: updatedUser.username,
                    email: updatedUser.email || '',
                    phone: updatedUser.phone || '',
                    type: updatedUser.type || 'student',
                    address: updatedUser.address || emptyAddress
                });
            } catch (err) {
                next(err);
            }
        })

        // Delete user (admin only) — hard delete, same cascade cleanup as
        // the user's own DELETE /api/account (routes/authRoutes.js).
        .delete(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const userId = req.params.id;

                const deletedUser = await deleteUserCascade(userId, User, Cohort);

                if (!deletedUser) {
                    return next(ApiError.notFound('USER_NOT_FOUND', 'User not found'));
                }

                res.status(200).json({ message: 'User deleted successfully', id: userId });
            } catch (err) {
                next(err);
            }
        });

    // Update user type (promote/demote admin)
    app.route("/api/admin/user/:id/type")
        .patch(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const userId = req.params.id;
                const { type } = req.body || {};

                if (!type || !['student', 'admin'].includes(type)) {
                    return next(ApiError.badRequest('INVALID_TYPE', 'Invalid user type. Must be student or admin'));
                }

                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { type: type },
                    { new: true }
                );

                if (!updatedUser) {
                    return next(ApiError.notFound('USER_NOT_FOUND', 'User not found'));
                }

                res.status(200).json({
                    id: updatedUser._id,
                    fname: updatedUser.fname || '',
                    lname: updatedUser.lname || '',
                    uname: updatedUser.username,
                    email: updatedUser.email || '',
                    phone: updatedUser.phone || '',
                    type: updatedUser.type || 'student'
                });
            } catch (err) {
                next(err);
            }
        });

    // Archive a user (admin only) — reversible soft-delete: freezes the
    // account (POST /api/login rejects it, see authRoutes.js) while keeping
    // the user document, and their quiz history, intact. Distinct from
    // DELETE /api/admin/user/:id (irreversible hard delete) and from the
    // user's own DELETE /api/account (also irreversible) — archiving exists
    // for admin housekeeping (e.g. a student leaves mid-course and the
    // instructor wants to freeze rather than erase their record), not as a
    // substitute for account-deletion requests. Idempotent, matching the
    // reopen-quiz pattern above: archiving an already-archived user is a
    // no-op rather than an error.
    app.route("/api/admin/user/:id/archive")
        .post(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const userId = req.params.id;

                const user = await User.findById(userId);
                if (!user) {
                    return next(ApiError.notFound('USER_NOT_FOUND', 'User not found'));
                }

                if (!user.archived) {
                    user.archived = true;
                    user.archivedAt = new Date();
                    await user.save();
                }

                res.status(200).json({
                    message: 'User archived successfully',
                    id: user._id,
                    archived: user.archived,
                    archivedAt: user.archivedAt
                });
            } catch (err) {
                next(err);
            }
        })

        // Unarchive a user, restoring normal login access. Idempotent, same
        // as revoking a reopen grant above.
        .delete(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const userId = req.params.id;

                const user = await User.findById(userId);
                if (!user) {
                    return next(ApiError.notFound('USER_NOT_FOUND', 'User not found'));
                }

                if (user.archived) {
                    user.archived = false;
                    user.archivedAt = null;
                    await user.save();
                }

                res.status(200).json({
                    message: 'User unarchived successfully',
                    id: user._id,
                    archived: user.archived,
                    archivedAt: user.archivedAt
                });
            } catch (err) {
                next(err);
            }
        });

    // Lists account-deletion notices (see models/AccountDeletionNotice.js
    // and utils/accountDeletionNotices.js) — created whenever a student who
    // belonged to a real (non-guest) cohort deletes their own account via
    // DELETE /api/account. Defaults to unacknowledged-only, since that's
    // what the admin dashboard's banner needs; pass ?acknowledged=all to see
    // the full history (acknowledged notices are never deleted — see the
    // model's doc comment on why "archiving" one just flips a flag).
    app.route("/api/admin/account-deletion-notices")
        .get(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const filter = req.query.acknowledged === 'all' ? {} : { acknowledged: false };
                const notices = await AccountDeletionNotice.find(filter).sort({ deletedAt: -1 });

                res.status(200).json(notices.map((notice) => ({
                    id: notice._id,
                    studentUsername: notice.studentUsername,
                    studentFname: notice.studentFname,
                    studentLname: notice.studentLname,
                    cohortNames: notice.cohortNames,
                    quizzesTakenCount: notice.quizzesTakenCount,
                    deletedAt: notice.deletedAt,
                    acknowledged: notice.acknowledged,
                    acknowledgedByUsername: notice.acknowledgedByUsername,
                    acknowledgedAt: notice.acknowledgedAt
                })));
            } catch (err) {
                next(err);
            }
        });

    // Acknowledges a single notice (the admin dashboard banner's "Dismiss"/
    // "Got it" action) — idempotent, same pattern as archive/reopen above:
    // acknowledging an already-acknowledged notice is a no-op that still
    // returns 200, not an error, and doesn't overwrite who/when it was
    // first acknowledged.
    app.route("/api/admin/account-deletion-notices/:id/acknowledge")
        .post(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const notice = await AccountDeletionNotice.findById(req.params.id);
                if (!notice) {
                    return next(ApiError.notFound('NOTICE_NOT_FOUND', 'Account deletion notice not found'));
                }

                if (!notice.acknowledged) {
                    notice.acknowledged = true;
                    notice.acknowledgedByUsername = req.user.username;
                    notice.acknowledgedAt = new Date();
                    await notice.save();
                }

                res.status(200).json({
                    message: 'Notice acknowledged',
                    id: notice._id,
                    acknowledged: notice.acknowledged,
                    acknowledgedByUsername: notice.acknowledgedByUsername,
                    acknowledgedAt: notice.acknowledgedAt
                });
            } catch (err) {
                next(err);
            }
        });

    // Delete all quiz data from a specific user
    app.route("/api/admin/user/:id/quizzes")
        .delete(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const userId = req.params.id;

                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { $set: { quizzes: [] } },
                    { new: true }
                );

                if (!updatedUser) {
                    return next(ApiError.notFound('USER_NOT_FOUND', 'User not found'));
                }

                res.status(200).json({
                    message: 'User quiz data deleted successfully',
                    userId: userId
                });
            } catch (err) {
                next(err);
            }
        });

    // Delete a specific quiz from a specific user
    app.route("/api/admin/user/:userId/quiz/:quizId")
        .delete(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const userId = req.params.userId;
                const quizId = req.params.quizId;

                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    { $pull: { quizzes: { _id: quizId } } },
                    { new: true }
                );

                if (!updatedUser) {
                    return next(ApiError.notFound('USER_NOT_FOUND', 'User not found'));
                }

                res.status(200).json({
                    message: 'Quiz entry deleted successfully',
                    userId: userId,
                    quizId: quizId
                });
            } catch (err) {
                next(err);
            }
        });

    // POST grants a student one more attempt at a quiz they've already
    // completed (and which is therefore locked — see utils/quizStatus.js and
    // POST /api/quiz's QUIZ_LOCKED check). Idempotent: reopening an
    // already-reopened quiz is a no-op rather than an error. The grant is
    // consumed automatically (see quizRoutes.js) the next time an attempt
    // for this quizId is saved, at which point the quiz relocks.
    // DELETE revokes an outstanding grant (e.g. the wrong quiz was reopened
    // by mistake) before the student retakes it.
    app.route("/api/admin/user/:userId/reopen-quiz/:quizId")
        .post(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const userId = req.params.userId;
                const quizId = Number(req.params.quizId);

                if (!Number.isFinite(quizId)) {
                    return next(ApiError.badRequest('INVALID_QUIZ_ID', 'quizId must be a number'));
                }

                const user = await User.findById(userId);
                if (!user) {
                    return next(ApiError.notFound('USER_NOT_FOUND', 'User not found'));
                }

                const hasAttempt = (user.quizzes || []).some(attempt => attempt.id === quizId);
                if (!hasAttempt) {
                    return next(ApiError.notFound(
                        'QUIZ_NOT_TAKEN',
                        'This user has no completed attempt for that quiz to reopen'
                    ));
                }

                if (!user.reopenedQuizIds.includes(quizId)) {
                    user.reopenedQuizIds.push(quizId);
                    await user.save();
                }

                res.status(200).json({
                    message: 'Quiz reopened successfully',
                    userId: userId,
                    quizId: quizId,
                    reopenedQuizIds: user.reopenedQuizIds
                });
            } catch (err) {
                next(err);
            }
        })

        // Revoke a reopen grant made in error (e.g. the wrong row was
        // clicked) before the student has used it. Idempotent: revoking a
        // quizId that isn't currently reopened is a no-op rather than an
        // error, same as reopening one that already is.
        .delete(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const userId = req.params.userId;
                const quizId = Number(req.params.quizId);

                if (!Number.isFinite(quizId)) {
                    return next(ApiError.badRequest('INVALID_QUIZ_ID', 'quizId must be a number'));
                }

                const user = await User.findById(userId);
                if (!user) {
                    return next(ApiError.notFound('USER_NOT_FOUND', 'User not found'));
                }

                if (user.reopenedQuizIds.includes(quizId)) {
                    user.reopenedQuizIds = user.reopenedQuizIds.filter((id) => id !== quizId);
                    await user.save();
                }

                res.status(200).json({
                    message: 'Reopen grant revoked successfully',
                    userId: userId,
                    quizId: quizId,
                    reopenedQuizIds: user.reopenedQuizIds
                });
            } catch (err) {
                next(err);
            }
        });

    // Delete all quiz data from all users
    app.route("/api/admin/quizzes/all-users-data")
        .delete(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const result = await User.updateMany(
                    {},
                    { $set: { quizzes: [] } }
                );

                res.status(200).json({
                    message: 'All users quiz data deleted successfully',
                    modifiedCount: result.modifiedCount
                });
            } catch (err) {
                next(err);
            }
        });

};
