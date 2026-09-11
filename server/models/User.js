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
    quizzes: [quizAttemptSchema]
});

// Guard against OverwriteModelError when this module is required multiple times
// against the same mongoose connection (e.g. across Jest test files).
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
