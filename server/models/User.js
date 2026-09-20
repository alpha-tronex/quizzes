const mongoose = require('mongoose');

// Embedded subdocument for a completed quiz attempt, stored on the user record.
const quizAttemptSchema = new mongoose.Schema({
    id: Number,
    title: String,
    completedAt: Date,
    questions: [{
        questionNum: Number,
        question: String,
        answers: [String],
        selection: [Number],
        correct: [Number],
        isCorrect: Boolean
    }],
    score: Number,
    totalQuestions: Number,
    duration: Number,
    createdAt: Date,
    updatedAt: Date
}, { _id: true });

const userSchema = new mongoose.Schema({
    fname: String,
    lname: String,
    username: String,
    email: String,
    password: String,
    phone: String,
    address: {
        street1: String,
        street2: String,
        street3: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    type: String,
    createdAt: Date,
    updatedAt: Date,
    quizzes: [quizAttemptSchema],
    // Public `Quiz.quizId`s an admin has granted this student one more
    // attempt at, after they'd already completed (and thus locked) that
    // quiz — see server/utils/quizStatus.js. Consumed (removed) the next
    // time an attempt for that quizId is saved; see POST /api/quiz.
    reopenedQuizIds: { type: [Number], default: [] }
});

// Guard against OverwriteModelError when this module is required multiple times
// against the same mongoose connection (e.g. across Jest test files).
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
