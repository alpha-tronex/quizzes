const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionNum: Number,
    questionType: String,
    instructions: String,
    question: String,
    answers: [String],
    correct: [Number]
}, { _id: false });

// `quizId` is the stable, human-assigned integer ID that the Angular app and
// mobile app already know as `id` in API responses (see quiz_*.json contract).
// It is kept distinct from Mongo's own `_id` so the public JSON shape never changes.
const quizSchema = new mongoose.Schema({
    quizId: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    questions: [questionSchema]
}, { timestamps: true });

module.exports = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
