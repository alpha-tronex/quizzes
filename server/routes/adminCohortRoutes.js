const mongoose = require('mongoose');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const ApiError = require('../utils/apiError');

function toQuizSummaries(quizzes) {
    return quizzes.map(q => ({ id: q.quizId, title: q.title }));
}

function toStudentSummaries(students) {
    return students.map(u => ({ id: u._id, uname: u.username, fname: u.fname, lname: u.lname }));
}

async function toCohortResponse(cohort, User, Quiz) {
    const [students, quizzes] = await Promise.all([
        User.find({ _id: { $in: cohort.students } }, { username: 1, fname: 1, lname: 1 }),
        Quiz.find({ quizId: { $in: cohort.quizzes } }, { quizId: 1, title: 1 })
    ]);

    return {
        id: cohort._id,
        name: cohort.name,
        startDate: cohort.startDate,
        endDate: cohort.endDate,
        students: toStudentSummaries(students),
        quizzes: toQuizSummaries(quizzes)
    };
}

/**
 * Validates and normalizes a cohort create/update payload. Never throws —
 * existence checks on students/quizzes require async DB lookups, so errors
 * are collected and returned rather than short-circuiting like the
 * synchronous validators in utils/validators.js.
 *
 * `partial: true` (used for PUT) only validates fields that are actually
 * present in the body, so a caller can update just `name` without having to
 * resend dates/students/quizzes.
 */
async function validateCohortPayload(body, User, Quiz, { partial = false } = {}) {
    const errors = [];
    const value = {};

    if (!partial || body.name !== undefined) {
        if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
            errors.push('name is required');
        } else {
            value.name = body.name.trim();
        }
    }

    if (!partial || body.startDate !== undefined) {
        const startDate = new Date(body.startDate);
        if (!body.startDate || isNaN(startDate.getTime())) {
            errors.push('startDate is required and must be a valid date');
        } else {
            value.startDate = startDate;
        }
    }

    if (!partial || body.endDate !== undefined) {
        const endDate = new Date(body.endDate);
        if (!body.endDate || isNaN(endDate.getTime())) {
            errors.push('endDate is required and must be a valid date');
        } else {
            value.endDate = endDate;
        }
    }

    if (value.startDate && value.endDate && value.endDate <= value.startDate) {
        errors.push('endDate must be after startDate');
    }

    if (body.students !== undefined) {
        if (!Array.isArray(body.students)) {
            errors.push('students must be an array of user IDs');
        } else {
            const invalidIds = body.students.filter(id => !mongoose.Types.ObjectId.isValid(id));
            if (invalidIds.length) {
                errors.push('students contains invalid user ID(s)');
            } else {
                const found = await User.find({ _id: { $in: body.students } }, { _id: 1, type: 1 });
                const foundIds = new Set(found.map(u => u._id.toString()));
                const missing = body.students.filter(id => !foundIds.has(id.toString()));
                if (missing.length) {
                    errors.push(`students not found: ${missing.join(', ')}`);
                }
                const nonStudents = found.filter(u => u.type !== 'student');
                if (nonStudents.length) {
                    errors.push('students must all be accounts of type "student"');
                }
                if (!missing.length && !nonStudents.length) {
                    value.students = body.students;
                }
            }
        }
    }

    if (body.quizzes !== undefined) {
        if (!Array.isArray(body.quizzes) || body.quizzes.some(q => typeof q !== 'number')) {
            errors.push('quizzes must be an array of quiz IDs (numbers)');
        } else {
            const found = await Quiz.find({ quizId: { $in: body.quizzes } }, { quizId: 1 });
            const foundIds = new Set(found.map(q => q.quizId));
            const missing = body.quizzes.filter(id => !foundIds.has(id));
            if (missing.length) {
                errors.push(`quizzes not found: ${missing.join(', ')}`);
            } else {
                value.quizzes = body.quizzes;
            }
        }
    }

    return { errors, value };
}

/**
 * Admin Cohort Routes
 * Handles cohort CRUD for administrators. A cohort groups students to a set
 * of quizzes over a date range — see models/Cohort.js for the relationship
 * design. Student-facing access enforcement based on cohort membership lives
 * in routes/quizRoutes.js, not here.
 */
module.exports = function(app, Cohort, User, Quiz) {

    app.route('/api/admin/cohorts')
        .get(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const cohorts = await Cohort.find({}).sort({ startDate: -1 });
                const responses = await Promise.all(cohorts.map(c => toCohortResponse(c, User, Quiz)));
                res.status(200).json(responses);
            } catch (err) {
                next(err);
            }
        })
        .post(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const { errors, value } = await validateCohortPayload(req.body || {}, User, Quiz);
                if (errors.length) {
                    return next(ApiError.badRequest('VALIDATION_ERROR', 'Validation failed', errors));
                }

                const cohort = await Cohort.create({
                    name: value.name,
                    startDate: value.startDate,
                    endDate: value.endDate,
                    students: value.students || [],
                    quizzes: value.quizzes || []
                });

                res.status(201).json(await toCohortResponse(cohort, User, Quiz));
            } catch (err) {
                next(err);
            }
        });

    app.route('/api/admin/cohorts/:id')
        .get(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                    return next(ApiError.badRequest('INVALID_ID', 'Invalid cohort ID'));
                }
                const cohort = await Cohort.findById(req.params.id);
                if (!cohort) {
                    return next(ApiError.notFound('COHORT_NOT_FOUND', 'Cohort not found'));
                }
                res.status(200).json(await toCohortResponse(cohort, User, Quiz));
            } catch (err) {
                next(err);
            }
        })
        .put(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                    return next(ApiError.badRequest('INVALID_ID', 'Invalid cohort ID'));
                }
                const cohort = await Cohort.findById(req.params.id);
                if (!cohort) {
                    return next(ApiError.notFound('COHORT_NOT_FOUND', 'Cohort not found'));
                }

                const { errors, value } = await validateCohortPayload(req.body || {}, User, Quiz, { partial: true });

                // Cross-field date check against the merged view, in case only
                // one of startDate/endDate is present in this partial update.
                const mergedStart = value.startDate || cohort.startDate;
                const mergedEnd = value.endDate || cohort.endDate;
                if (mergedEnd <= mergedStart && !errors.length) {
                    errors.push('endDate must be after startDate');
                }

                if (errors.length) {
                    return next(ApiError.badRequest('VALIDATION_ERROR', 'Validation failed', errors));
                }

                Object.assign(cohort, value);
                await cohort.save();

                res.status(200).json(await toCohortResponse(cohort, User, Quiz));
            } catch (err) {
                next(err);
            }
        })
        .delete(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                    return next(ApiError.badRequest('INVALID_ID', 'Invalid cohort ID'));
                }
                const deleted = await Cohort.findByIdAndDelete(req.params.id);
                if (!deleted) {
                    return next(ApiError.notFound('COHORT_NOT_FOUND', 'Cohort not found'));
                }
                res.status(200).json({ message: 'Cohort deleted successfully' });
            } catch (err) {
                next(err);
            }
        });
};
