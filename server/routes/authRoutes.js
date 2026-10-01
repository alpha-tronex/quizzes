const bcrypt = require('bcrypt');
const validators = require('../utils/validators');
const { generateToken, verifyToken } = require('../middleware/authMiddleware');
const ApiError = require('../utils/apiError');
const { deleteUserCascade } = require('../utils/userDeletion');
const { getRealCohortNames } = require('../utils/cohortAccess');
const { recordAccountDeletionIfCohortMember } = require('../utils/accountDeletionNotices');
const saltRounds = 10;

module.exports = function(app, User, Cohort, AccountDeletionNotice) {

    app.route("/api/register")
        .post(async (req, res, next) => {
            try {
                const { fname, lname, uname, email, pass, phone, address } = req.body || {};

                // Validation using validators module
                const validationErrors = [];

                // Required fields: uname and pass
                const unameValidation = validators.validateUsername(uname);
                if (!unameValidation.valid) {
                    validationErrors.push(unameValidation.error);
                }

                const passValidation = validators.validatePassword(pass);
                if (!passValidation.valid) {
                    validationErrors.push(passValidation.error);
                }

                // Optional fields: validate only if provided
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

                if (address && address.zipCode && address.zipCode.trim()) {
                    const zipValidation = validators.validateZipCode(address.zipCode);
                    if (!zipValidation.valid) {
                        validationErrors.push(zipValidation.error);
                    }
                }

                if (validationErrors.length) {
                    return next(ApiError.badRequest('VALIDATION_ERROR', 'Validation failed', validationErrors));
                }

                // ensure username/email uniqueness (only check email if provided)
                const uniqueQuery = [{ username: uname }];
                if (email) {
                    uniqueQuery.push({ email: email });
                }
                const existing = await User.findOne({ $or: uniqueQuery });
                if (existing) {
                    return next(ApiError.conflict('DUPLICATE_USER', 'Username or email already in use'));
                }

                const hash = await bcrypt.hash(pass, saltRounds);
                const user = new User({
                    fname: fname || '',
                    lname: lname || '',
                    username: uname,
                    email: email || '',
                    password: hash,
                    phone: phone || '',
                    type: 'student',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                await user.save();

                // Generate JWT token
                const token = generateToken(user);

                const userObj = {
                    id: user._id,
                    fname: user.fname,
                    lname: user.lname,
                    uname: user.username,
                    email: user.email,
                    phone: user.phone,
                    pass: '', // Don't send the hashed password
                    confirmPass: '',
                    type: user.type,
                    token: token
                };
                res.status(200).json(userObj);

            } catch (err) {
                next(err);
            }
        })

    app.route("/api/login")
        .post(async (req, res, next) => {
            try {
                const uname = req.body.uname;
                const pass = req.body.pass;

                // cannot query password field if it is encrypted
                const foundUser = await User.findOne({ username: uname });

                if (!foundUser) {
                    return next(ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid username or password'));
                }

                const match = await bcrypt.compare(pass, foundUser.password);

                if (!match) {
                    return next(ApiError.unauthorized('INVALID_CREDENTIALS', 'Invalid username or password'));
                }

                // Checked after the password match (not before) so a wrong
                // password on an archived account still reports
                // INVALID_CREDENTIALS rather than confirming the account's
                // archived status to an unauthenticated caller.
                if (foundUser.archived) {
                    return next(ApiError.forbidden(
                        'ACCOUNT_ARCHIVED',
                        'This account has been archived. Contact your administrator.'
                    ));
                }

                // Generate JWT token
                const token = generateToken(foundUser);

                const userObj = {
                    id: foundUser._id,
                    fname: foundUser.fname,
                    lname: foundUser.lname,
                    uname: foundUser.username,
                    email: foundUser.email,
                    phone: foundUser.phone,
                    address: foundUser.address,
                    pass: '', // Don't send the hashed password
                    confirmPass: '',
                    type: foundUser.type,
                    token: token
                };
                res.status(200).json(userObj);
            } catch (err) {
                next(err);
            }
        });

    app.route("/api/logout")
        .get((req, res) => {
            // kill the session cookie, then
            res.redirect("/");
        });

    // Note: requires auth — this lists every user's name/email/phone/type,
    // which shouldn't be publicly readable.
    app.route("/api/users")
        .get(verifyToken, async (req, res, next) => {
            try {
                // Fetch all users but exclude password field
                const users = await User.find({}, { password: 0 });

                const userList = users.map(user => ({
                    id: user._id,
                    fname: user.fname || '',
                    lname: user.lname || '',
                    uname: user.username,
                    email: user.email || '',
                    phone: user.phone || '',
                    type: user.type || 'student'
                }));

                res.status(200).json(userList);
            } catch (err) {
                next(err);
            }
        });

    app.route("/api/user/update")
        .put(verifyToken, async (req, res, next) => {
            try {
                const { id, fname, lname, email, phone, address } = req.body || {};

                if (!id) {
                    return next(ApiError.badRequest('MISSING_ID', 'User ID is required'));
                }

                // Validation using validators module
                const validationErrors = [];

                // Optional fields: validate only if provided and not empty
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

                if (address && address.zipCode && address.zipCode.trim()) {
                    const zipValidation = validators.validateZipCode(address.zipCode);
                    if (!zipValidation.valid) {
                        validationErrors.push(zipValidation.error);
                    }
                }

                if (validationErrors.length) {
                    return next(ApiError.badRequest('VALIDATION_ERROR', 'Validation failed', validationErrors));
                }

                // Update user
                const updatedUser = await User.findByIdAndUpdate(
                    id,
                    {
                        fname: fname,
                        lname: lname,
                        email: email,
                        phone: phone,
                        address: address || {},
                        updatedAt: new Date()
                    },
                    { new: true }
                );

                if (!updatedUser) {
                    return next(ApiError.notFound('USER_NOT_FOUND', 'User not found'));
                }

                const userObj = {
                    id: updatedUser._id,
                    fname: updatedUser.fname,
                    lname: updatedUser.lname,
                    uname: updatedUser.username,
                    email: updatedUser.email,
                    phone: updatedUser.phone,
                    address: updatedUser.address,
                    pass: '',
                    confirmPass: '',
                    type: updatedUser.type
                };

                res.status(200).json(userObj);
            } catch (err) {
                next(err);
            }
        });

    // Self-service account deletion — App Store Guideline 5.1.1(v) requires
    // that any app supporting account creation let the user delete that
    // account from inside the app, for every user, not just a subset (the
    // "customer service resources only" exception is limited to a short
    // list of highly-regulated industries, which this app isn't in). Scoped
    // to `req.user.id` from the verified token, never a client-supplied id
    // — unlike PUT /api/user/update, there's no id in the request body to
    // trust or mistrust. Immediate and irreversible, matching Apple's "only
    // offering to deactivate is insufficient" requirement; this is a
    // distinct path from the admin's archive/unarchive toggle in
    // adminUserRoutes.js, which is reversible and doesn't touch this route.
    app.route("/api/account")
        .delete(verifyToken, async (req, res, next) => {
            try {
                // Captured *before* the cascade delete removes this student
                // from every cohort's `students` array — see
                // getRealCohortNames's doc comment.
                const cohortNames = await getRealCohortNames(req.user.id, Cohort);

                const deletedUser = await deleteUserCascade(req.user.id, User, Cohort);

                if (!deletedUser) {
                    return next(ApiError.notFound('USER_NOT_FOUND', 'User not found'));
                }

                // Deliberately not awaited-and-surfaced as a failure: the
                // account is already gone, so a notice-creation hiccup
                // shouldn't turn this into a 500 for the student (see
                // recordAccountDeletionIfCohortMember's doc comment).
                await recordAccountDeletionIfCohortMember(deletedUser, cohortNames, AccountDeletionNotice);

                res.status(200).json({ message: 'Account deleted successfully' });
            } catch (err) {
                next(err);
            }
        });

};
