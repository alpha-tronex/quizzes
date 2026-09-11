const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const ApiError = require('../utils/apiError');

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Admin Quiz Routes
 * Handles quiz CRUD operations for administrators. Quizzes live in the
 * `Quiz` MongoDB collection (migrated from flat quiz_*.json files — see
 * server/scripts/migrate_quizzes_to_mongo.js). Every response still uses the
 * `id` field name the Angular app and mobile app already expect.
 */
module.exports = function(app, Quiz) {

    // Upload quiz (admin only)
    app.route("/api/quiz/upload")
        .post(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const quizData = req.body;

                // Validate required fields (ID will be auto-assigned)
                if (!quizData.title) {
                    return next(ApiError.badRequest('MISSING_TITLE', 'Quiz must have a title field'));
                }
                if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
                    return next(ApiError.badRequest('MISSING_QUESTIONS', 'Quiz must have a questions array with at least one question'));
                }

                // Validate each question
                for (let i = 0; i < quizData.questions.length; i++) {
                    const q = quizData.questions[i];
                    if (!q.question) {
                        return next(ApiError.badRequest('INVALID_QUESTION', `Question ${i + 1} is missing the question field`));
                    }
                    if (!q.instructions) {
                        return next(ApiError.badRequest('INVALID_QUESTION', `Question ${i + 1} is missing the instructions field`));
                    }
                    if (!q.correct || !Array.isArray(q.correct) || q.correct.length === 0) {
                        return next(ApiError.badRequest('INVALID_QUESTION', `Question ${i + 1} must have a correct answer array`));
                    }
                    // Check for at least 2 answers
                    if (!q.answers || !Array.isArray(q.answers)) {
                        return next(ApiError.badRequest('INVALID_QUESTION', `Question ${i + 1} must have an answers array`));
                    }
                    const answerCount = q.answers.filter(a => a && a.trim() !== '').length;
                    if (answerCount < 2) {
                        return next(ApiError.badRequest('INVALID_QUESTION', `Question ${i + 1} must have at least 2 answers`));
                    }
                }

                // Check for duplicate titles (excluding current quiz if editing)
                const duplicateQuery = {
                    title: { $regex: `^${escapeRegex(quizData.title)}$`, $options: 'i' }
                };
                if (quizData.id !== undefined) {
                    duplicateQuery.quizId = { $ne: quizData.id };
                }
                const duplicate = await Quiz.findOne(duplicateQuery);
                if (duplicate) {
                    return next(ApiError.badRequest(
                        'DUPLICATE_TITLE',
                        `A quiz with the title "${quizData.title}" already exists (ID: ${duplicate.quizId})`
                    ));
                }

                // Determine quiz ID
                let newId;
                if (quizData.id !== undefined) {
                    // If ID is provided, use it (this is an update operation)
                    newId = quizData.id;
                } else {
                    // If no ID provided, auto-assign using the lowest available ID (fills gaps first)
                    const existing = await Quiz.find({}, { quizId: 1, _id: 0 }).sort({ quizId: 1 });
                    const existingIds = existing.map(q => q.quizId);

                    newId = 0;
                    for (let i = 0; i < existingIds.length; i++) {
                        if (existingIds[i] !== newId) {
                            break;
                        }
                        newId++;
                    }
                }

                await Quiz.findOneAndUpdate(
                    { quizId: newId },
                    {
                        quizId: newId,
                        title: quizData.title,
                        description: quizData.description || '',
                        questions: quizData.questions
                    },
                    { upsert: true, new: true, runValidators: true }
                );

                res.status(201).json({
                    message: 'Quiz uploaded successfully',
                    quizId: newId,
                    title: quizData.title
                });
            } catch (err) {
                next(err);
            }
        });

    // Get list of all uploaded quizzes (admin only)
    app.route("/api/quiz/list")
        .get(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const quizzes = await Quiz.find({}).sort({ quizId: 1 });

                res.status(200).json(quizzes.map(q => ({
                    id: q.quizId,
                    title: q.title,
                    description: q.description || '',
                    questionCount: q.questions?.length || 0
                })));
            } catch (err) {
                next(err);
            }
        });

    // Delete a specific quiz (admin only)
    app.route("/api/admin/quiz-file/:quizId")
        .delete(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const quizId = Number(req.params.quizId);
                const deleted = await Quiz.findOneAndDelete({ quizId });

                if (!deleted) {
                    return next(ApiError.notFound('QUIZ_NOT_FOUND', 'Quiz not found'));
                }

                res.status(200).json({
                    message: 'Quiz deleted successfully',
                    quizId: req.params.quizId
                });
            } catch (err) {
                next(err);
            }
        });

    // Delete all quizzes (admin only)
    app.route("/api/admin/quiz-files/all")
        .delete(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const result = await Quiz.deleteMany({});

                res.status(200).json({
                    message: 'All quizzes deleted successfully',
                    deletedCount: result.deletedCount
                });
            } catch (err) {
                next(err);
            }
        });

    // Delete quiz by ID (admin only) - Alternative endpoint
    app.route("/api/quiz/delete/:id")
        .delete(verifyToken, verifyAdmin, async (req, res, next) => {
            try {
                const quizId = Number(req.params.id);
                const deleted = await Quiz.findOneAndDelete({ quizId });

                if (!deleted) {
                    return next(ApiError.notFound('QUIZ_NOT_FOUND', 'Quiz not found'));
                }

                res.status(200).json({ message: 'Quiz deleted successfully' });
            } catch (err) {
                next(err);
            }
        });

};
