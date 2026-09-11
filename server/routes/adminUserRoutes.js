const validators = require('../utils/validators');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const ApiError = require('../utils/apiError');

const emptyAddress = {
    street1: '', street2: '', street3: '', city: '', state: '', zipCode: '', country: ''
};

/**
 * Admin User Routes
 * Handles all user management operations for administrators
 */
module.exports = function(app, User) {

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
                    quizzes: user.quizzes || []
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
                    quizzes: user.quizzes || []
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

        // Delete user (admin only)
        .delete(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const userId = req.params.id;

                const deletedUser = await User.findByIdAndDelete(userId);

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
