/**
 * One-time (re-runnable) seed: creates/updates the three "Guest" example
 * quizzes (Current Events, Basic Algebra, US History) and the single
 * isGuest:true Cohort that unlocks them for students with no real cohort
 * membership — see server/utils/cohortAccess.js and routes/quizRoutes.js for
 * how that fallback works, and models/Cohort.js for why isGuest exists.
 *
 * Quizzes are matched by title (exact match) rather than a hardcoded
 * quizId, since quizId is auto-assigned elsewhere (see adminQuizRoutes.js)
 * and could already be taken by an admin-created quiz by the time this
 * runs. Safe to re-run: existing quizzes/cohort are updated in place, not
 * duplicated.
 *
 * Usage:
 *   node server/scripts/seed_guest_cohort.js
 *
 * Reads MONGODB_URI from the environment the same way server.js does.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const Cohort = require('../models/Cohort');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/userDB';

const GUEST_QUIZZES = [
    {
        title: 'Current Events',
        description: 'A quick check on notable events and figures in the news.',
        questions: [
            {
                questionNum: 0,
                questionType: 'TrueFalse',
                instructions: 'Select the correct answer.',
                question: 'The 2026 FIFA World Cup is being co-hosted by the United States, Canada, and Mexico.',
                answers: ['True', 'False'],
                correct: [0]
            },
            {
                questionNum: 1,
                questionType: 'SingleAnswer',
                instructions: 'Select the one correct answer.',
                question: 'Which city is co-hosting the 2026 Winter Olympics (alongside Cortina d\'Ampezzo)?',
                answers: ['Milan', 'Paris', 'Tokyo', 'Beijing'],
                correct: [0]
            },
            {
                questionNum: 2,
                questionType: 'SingleAnswer',
                instructions: 'Select the one correct answer.',
                question: 'As of 2026, who is the Secretary-General of the United Nations?',
                answers: ['António Guterres', 'Ban Ki-moon', 'Kofi Annan', 'Ursula von der Leyen'],
                correct: [0]
            },
            {
                questionNum: 3,
                questionType: 'TrueFalse',
                instructions: 'Select the correct answer.',
                question: 'Donald Trump began his second term as U.S. President in January 2025.',
                answers: ['True', 'False'],
                correct: [0]
            },
            {
                questionNum: 4,
                questionType: 'MultipleChoice',
                instructions: 'Select all correct answers.',
                question: 'Which of the following are permanent members of the UN Security Council?',
                answers: ['United States', 'Russia', 'China', 'Germany', 'Brazil'],
                correct: [0, 1, 2]
            }
        ]
    },
    {
        title: 'Basic Algebra',
        description: 'Warm-up problems covering linear equations and simplification.',
        questions: [
            {
                questionNum: 0,
                questionType: 'SingleAnswer',
                instructions: 'Select the one correct answer.',
                question: 'Solve for x: 2x + 3 = 11',
                answers: ['3', '4', '5', '6'],
                correct: [1]
            },
            {
                questionNum: 1,
                questionType: 'TrueFalse',
                instructions: 'Select the correct answer.',
                question: 'The equation y = 2x + 1 represents a linear function.',
                answers: ['True', 'False'],
                correct: [0]
            },
            {
                questionNum: 2,
                questionType: 'SingleAnswer',
                instructions: 'Select the one correct answer (positive root).',
                question: 'What is the value of x in x² = 49?',
                answers: ['6', '7', '8', '9'],
                correct: [1]
            },
            {
                questionNum: 3,
                questionType: 'MultipleChoice',
                instructions: 'Select all terms that are "like terms" with 3x².',
                question: 'Which of the following are like terms with 3x²?',
                answers: ['5x²', '3x', '-7x²', '2x³', '10x²'],
                correct: [0, 2, 4]
            },
            {
                questionNum: 4,
                questionType: 'SingleAnswer',
                instructions: 'Select the one correct answer.',
                question: 'Simplify: 4(x + 2)',
                answers: ['4x + 2', '4x + 8', 'x + 8', '4x + 6'],
                correct: [1]
            }
        ]
    },
    {
        title: 'US History',
        description: 'Foundational facts about the founding and early history of the United States.',
        questions: [
            {
                questionNum: 0,
                questionType: 'SingleAnswer',
                instructions: 'Select the one correct answer.',
                question: 'In what year was the Declaration of Independence adopted?',
                answers: ['1774', '1776', '1781', '1789'],
                correct: [1]
            },
            {
                questionNum: 1,
                questionType: 'TrueFalse',
                instructions: 'Select the correct answer.',
                question: 'The U.S. Constitution was ratified before the Declaration of Independence was signed.',
                answers: ['True', 'False'],
                correct: [1]
            },
            {
                questionNum: 2,
                questionType: 'SingleAnswer',
                instructions: 'Select the one correct answer.',
                question: 'Who was the first President of the United States?',
                answers: ['John Adams', 'Thomas Jefferson', 'George Washington', 'Benjamin Franklin'],
                correct: [2]
            },
            {
                questionNum: 3,
                questionType: 'MultipleChoice',
                instructions: 'Select all amendments that are part of the Bill of Rights.',
                question: 'Which of the following amendments are part of the Bill of Rights (the first ten amendments)?',
                answers: ['First Amendment', 'Thirteenth Amendment', 'Second Amendment', 'Sixteenth Amendment', 'Fourth Amendment'],
                correct: [0, 2, 4]
            },
            {
                questionNum: 4,
                questionType: 'SingleAnswer',
                instructions: 'Select the one correct answer.',
                question: 'The American Civil War ended in which year?',
                answers: ['1861', '1865', '1870', '1877'],
                correct: [1]
            }
        ]
    }
];

/** Mirrors adminQuizRoutes.js's "lowest available ID (fills gaps first)" auto-assignment. */
async function nextAvailableQuizId() {
    const existing = await Quiz.find({}, { quizId: 1, _id: 0 }).sort({ quizId: 1 });
    const existingIds = existing.map(q => q.quizId);

    let id = 0;
    for (let i = 0; i < existingIds.length; i++) {
        if (existingIds[i] !== id) {
            break;
        }
        id++;
    }
    return id;
}

async function upsertQuiz(def) {
    const existing = await Quiz.findOne({ title: def.title });
    if (existing) {
        existing.description = def.description;
        existing.questions = def.questions;
        await existing.save();
        console.log(`Updated quiz "${def.title}" (id ${existing.quizId})`);
        return existing.quizId;
    }

    const quizId = await nextAvailableQuizId();
    await Quiz.create({ quizId, title: def.title, description: def.description, questions: def.questions });
    console.log(`Created quiz "${def.title}" (id ${quizId})`);
    return quizId;
}

async function upsertGuestCohort(quizIds) {
    // Wide-open date range so the Guest cohort is, for practical purposes,
    // always active — it's a fallback pool, not a time-boxed class.
    const startDate = new Date('2020-01-01T00:00:00.000Z');
    const endDate = new Date('2099-12-31T23:59:59.999Z');

    const existing = await Cohort.findOne({ isGuest: true });
    if (existing) {
        existing.quizzes = quizIds;
        existing.startDate = startDate;
        existing.endDate = endDate;
        await existing.save();
        console.log(`Updated Guest cohort with quizzes [${quizIds.join(', ')}]`);
        return;
    }

    await Cohort.create({
        name: 'Guest',
        isGuest: true,
        startDate,
        endDate,
        students: [],
        quizzes: quizIds
    });
    console.log(`Created Guest cohort with quizzes [${quizIds.join(', ')}]`);
}

async function seed() {
    await mongoose.connect(mongoURI);
    console.log(`Connected to ${mongoURI}`);

    const quizIds = [];
    for (const def of GUEST_QUIZZES) {
        quizIds.push(await upsertQuiz(def));
    }

    await upsertGuestCohort(quizIds);

    await mongoose.disconnect();
    console.log('\nDone.');
}

seed().catch((err) => {
    console.error('Guest cohort seed failed:', err);
    process.exit(1);
});
