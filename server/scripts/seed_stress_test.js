/**
 * Stress-test data seed: creates (or updates, if re-run) a batch of fake
 * accounts/cohorts/quizzes sized for load testing. Follows the same
 * idempotent upsert pattern as seed_guest_cohort.js so it's safe to re-run
 * after tweaking the counts below.
 *
 * Everything this script creates is namespaced so it's trivially
 * identifiable and easy to purge afterward:
 *   - usernames:  stressadmin1, stressadmin2, stressstudent001..100
 *   - cohorts:    "Stress Cohort 1".."Stress Cohort 5"
 *   - quizzes:    titles prefixed "[Stress] "
 * See cleanup_stress_test.js to remove all of it again in one shot.
 *
 * All accounts share the password "local123" (bcrypt-hashed once and
 * reused — hashing 102 accounts individually gains nothing since it's the
 * same plaintext for all of them, and bcrypt.compare() only cares that the
 * hash matches the plaintext, not that the hash is unique).
 *
 * Usage:
 *   node server/scripts/seed_stress_test.js
 *   (or: npm run seed:stress, from server/)
 *
 * Reads MONGODB_URI from the environment the same way server.js does. Run
 * this inside the app container so it can reach quizmaster-mongo over the
 * compose network — see the runbook this script ships with.
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');
const Cohort = require('../models/Cohort');
const Quiz = require('../models/Quiz');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/userDB';

// ---- Tunable sizing ---------------------------------------------------
const STUDENT_COUNT = 100;
const ADMIN_COUNT = 2;
const COHORT_COUNT = 5;
const PASSWORD = 'local123';
const SALT_ROUNDS = 10; // matches server/routes/authRoutes.js

// ---- Quiz bank: 10 distinct topics, ~5 questions each -----------------
// Prefixed "[Stress] " so they're never confused with real admin-authored
// quizzes or the 3 Guest quizzes from seed_guest_cohort.js.
const STRESS_QUIZZES = [
    {
        title: '[Stress] Geography Basics',
        description: 'Continents, capitals, and physical geography.',
        questions: [
            { questionNum: 0, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'What is the capital of Australia?', answers: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], correct: [2] },
            { questionNum: 1, questionType: 'TrueFalse', instructions: 'Select the correct answer.', question: 'Africa is the largest continent by area.', answers: ['True', 'False'], correct: [1] },
            { questionNum: 2, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'Which river is the longest in the world?', answers: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], correct: [1] },
            { questionNum: 3, questionType: 'MultipleChoice', instructions: 'Select all correct answers.', question: 'Which of these countries border the Mediterranean Sea?', answers: ['Spain', 'Italy', 'Egypt', 'Germany', 'Greece'], correct: [0, 1, 2, 4] },
            { questionNum: 4, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'Mount Everest is located in which mountain range?', answers: ['Andes', 'Alps', 'Himalayas', 'Rockies'], correct: [2] }
        ]
    },
    {
        title: '[Stress] World History',
        description: 'Major events from ancient to modern history.',
        questions: [
            { questionNum: 0, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'In what year did World War II end?', answers: ['1943', '1945', '1947', '1950'], correct: [1] },
            { questionNum: 1, questionType: 'TrueFalse', instructions: 'Select the correct answer.', question: 'The Roman Empire fell before the Egyptian pyramids were built.', answers: ['True', 'False'], correct: [1] },
            { questionNum: 2, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'Who was the first emperor of Rome?', answers: ['Julius Caesar', 'Augustus', 'Nero', 'Constantine'], correct: [1] },
            { questionNum: 3, questionType: 'MultipleChoice', instructions: 'Select all correct answers.', question: 'Which of these empires existed in antiquity?', answers: ['Persian Empire', 'British Empire', 'Byzantine Empire', 'Ottoman Empire'], correct: [0, 2] },
            { questionNum: 4, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'The Berlin Wall fell in which year?', answers: ['1985', '1987', '1989', '1991'], correct: [2] }
        ]
    },
    {
        title: '[Stress] General Science',
        description: 'Core concepts across physics, chemistry, and biology.',
        questions: [
            { questionNum: 0, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'What is the chemical symbol for gold?', answers: ['Ag', 'Au', 'Gd', 'Go'], correct: [1] },
            { questionNum: 1, questionType: 'TrueFalse', instructions: 'Select the correct answer.', question: 'Sound travels faster in water than in air.', answers: ['True', 'False'], correct: [0] },
            { questionNum: 2, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'What is the powerhouse of the cell?', answers: ['Nucleus', 'Ribosome', 'Mitochondrion', 'Golgi apparatus'], correct: [2] },
            { questionNum: 3, questionType: 'MultipleChoice', instructions: 'Select all correct answers.', question: 'Which of these are noble gases?', answers: ['Helium', 'Neon', 'Nitrogen', 'Argon'], correct: [0, 1, 3] },
            { questionNum: 4, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'What force keeps planets in orbit around the sun?', answers: ['Magnetism', 'Gravity', 'Friction', 'Inertia'], correct: [1] }
        ]
    },
    {
        title: '[Stress] Mathematics Fundamentals',
        description: 'Arithmetic, algebra, and basic geometry.',
        questions: [
            { questionNum: 0, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'What is 7 x 8?', answers: ['54', '56', '58', '64'], correct: [1] },
            { questionNum: 1, questionType: 'TrueFalse', instructions: 'Select the correct answer.', question: 'A right triangle has one 90-degree angle.', answers: ['True', 'False'], correct: [0] },
            { questionNum: 2, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'What is the value of pi rounded to two decimal places?', answers: ['3.14', '3.41', '3.12', '3.16'], correct: [0] },
            { questionNum: 3, questionType: 'MultipleChoice', instructions: 'Select all correct answers.', question: 'Which of these numbers are prime?', answers: ['2', '9', '11', '15', '13'], correct: [0, 2, 4] },
            { questionNum: 4, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'Solve for x: 5x - 10 = 20', answers: ['4', '5', '6', '8'], correct: [2] }
        ]
    },
    {
        title: '[Stress] Literature Classics',
        description: 'Well-known authors and works.',
        questions: [
            { questionNum: 0, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'Who wrote "Romeo and Juliet"?', answers: ['Charles Dickens', 'William Shakespeare', 'Mark Twain', 'Jane Austen'], correct: [1] },
            { questionNum: 1, questionType: 'TrueFalse', instructions: 'Select the correct answer.', question: '"Moby-Dick" was written by Herman Melville.', answers: ['True', 'False'], correct: [0] },
            { questionNum: 2, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'Who wrote "Pride and Prejudice"?', answers: ['Emily Bronte', 'Jane Austen', 'Virginia Woolf', 'George Eliot'], correct: [1] },
            { questionNum: 3, questionType: 'MultipleChoice', instructions: 'Select all correct answers.', question: 'Which of these are novels by George Orwell?', answers: ['1984', 'Animal Farm', 'Brave New World', 'Fahrenheit 451'], correct: [0, 1] },
            { questionNum: 4, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'In what century did Shakespeare write most of his plays?', answers: ['15th', '16th', '17th', '18th'], correct: [1] }
        ]
    },
    {
        title: '[Stress] Computer Science Basics',
        description: 'Foundational programming and computing concepts.',
        questions: [
            { questionNum: 0, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'What does CPU stand for?', answers: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Core Processing Utility'], correct: [1] },
            { questionNum: 1, questionType: 'TrueFalse', instructions: 'Select the correct answer.', question: 'Binary is a base-2 number system.', answers: ['True', 'False'], correct: [0] },
            { questionNum: 2, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'Which data structure uses LIFO (last in, first out)?', answers: ['Queue', 'Stack', 'Array', 'Linked list'], correct: [1] },
            { questionNum: 3, questionType: 'MultipleChoice', instructions: 'Select all correct answers.', question: 'Which of these are programming languages?', answers: ['Python', 'HTML', 'JavaScript', 'HTTP'], correct: [0, 2] },
            { questionNum: 4, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'What does "HTTP" primarily transfer?', answers: ['Encrypted files only', 'Hypertext/web content', 'Database backups', 'Video game assets'], correct: [1] }
        ]
    },
    {
        title: '[Stress] Nutrition & Health',
        description: 'Everyday nutrition and wellness facts.',
        questions: [
            { questionNum: 0, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'Which vitamin is produced when skin is exposed to sunlight?', answers: ['Vitamin A', 'Vitamin C', 'Vitamin D', 'Vitamin K'], correct: [2] },
            { questionNum: 1, questionType: 'TrueFalse', instructions: 'Select the correct answer.', question: 'Adults generally need less sleep than teenagers.', answers: ['True', 'False'], correct: [0] },
            { questionNum: 2, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'Which nutrient is the body\'s primary source of quick energy?', answers: ['Protein', 'Carbohydrates', 'Fiber', 'Fat'], correct: [1] },
            { questionNum: 3, questionType: 'MultipleChoice', instructions: 'Select all correct answers.', question: 'Which of these are considered macronutrients?', answers: ['Protein', 'Fat', 'Carbohydrates', 'Vitamin C'], correct: [0, 1, 2] },
            { questionNum: 4, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'Roughly how much water is recommended per day for most adults?', answers: ['0.5 liters', '2 liters', '5 liters', '10 liters'], correct: [1] }
        ]
    },
    {
        title: '[Stress] Music Theory',
        description: 'Notes, scales, and basic music concepts.',
        questions: [
            { questionNum: 0, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'How many notes are in a standard major scale?', answers: ['5', '6', '7', '8'], correct: [2] },
            { questionNum: 1, questionType: 'TrueFalse', instructions: 'Select the correct answer.', question: 'A piano is a percussion and string instrument.', answers: ['True', 'False'], correct: [0] },
            { questionNum: 2, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'What does "tempo" refer to in music?', answers: ['Volume', 'Speed', 'Pitch', 'Key'], correct: [1] },
            { questionNum: 3, questionType: 'MultipleChoice', instructions: 'Select all correct answers.', question: 'Which of these are string instruments?', answers: ['Violin', 'Trumpet', 'Cello', 'Flute'], correct: [0, 2] },
            { questionNum: 4, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'How many lines are on a standard musical staff?', answers: ['4', '5', '6', '7'], correct: [1] }
        ]
    },
    {
        title: '[Stress] Astronomy',
        description: 'The solar system, stars, and space exploration.',
        questions: [
            { questionNum: 0, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'Which planet is known as the Red Planet?', answers: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correct: [1] },
            { questionNum: 1, questionType: 'TrueFalse', instructions: 'Select the correct answer.', question: 'The Sun is a star.', answers: ['True', 'False'], correct: [0] },
            { questionNum: 2, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'What is the largest planet in our solar system?', answers: ['Saturn', 'Neptune', 'Jupiter', 'Earth'], correct: [2] },
            { questionNum: 3, questionType: 'MultipleChoice', instructions: 'Select all correct answers.', question: 'Which of these are inner (rocky) planets?', answers: ['Mercury', 'Venus', 'Earth', 'Neptune'], correct: [0, 1, 2] },
            { questionNum: 4, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'Roughly how long does it take light from the Sun to reach Earth?', answers: ['8 seconds', '8 minutes', '8 hours', '8 days'], correct: [1] }
        ]
    },
    {
        title: '[Stress] Financial Literacy',
        description: 'Everyday personal finance concepts.',
        questions: [
            { questionNum: 0, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'What is a budget primarily used for?', answers: ['Tracking income and expenses', 'Filing taxes', 'Opening a bank account', 'Applying for a loan'], correct: [0] },
            { questionNum: 1, questionType: 'TrueFalse', instructions: 'Select the correct answer.', question: 'Compound interest grows faster over time than simple interest on the same principal.', answers: ['True', 'False'], correct: [0] },
            { questionNum: 2, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'What does APR stand for?', answers: ['Annual Percentage Rate', 'Applied Payment Ratio', 'Asset Protection Return', 'Average Price Rate'], correct: [0] },
            { questionNum: 3, questionType: 'MultipleChoice', instructions: 'Select all correct answers.', question: 'Which of these are common types of retirement accounts in the US?', answers: ['401(k)', 'IRA', 'CD', 'Roth IRA'], correct: [0, 1, 3] },
            { questionNum: 4, questionType: 'SingleAnswer', instructions: 'Select the one correct answer.', question: 'An emergency fund is generally recommended to cover how many months of expenses?', answers: ['0-1', '3-6', '12-24', '36+'], correct: [1] }
        ]
    }
];

// Which quizzes (by index into STRESS_QUIZZES) each cohort gets — overlapping
// on purpose so the cohort/quiz access-control path (cohortAccess.js) gets
// exercised across multiple combinations under load, not just one flat list.
const COHORT_QUIZ_INDEXES = [
    [0, 1, 2, 3, 4],
    [3, 4, 5, 6, 7],
    [5, 6, 7, 8, 9],
    [0, 2, 4, 6, 8],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
];

function pad(n, width) {
    return String(n).padStart(width, '0');
}

/** Mirrors adminQuizRoutes.js's "lowest available ID (fills gaps first)" auto-assignment. */
async function nextAvailableQuizId() {
    const existing = await Quiz.find({}, { quizId: 1, _id: 0 }).sort({ quizId: 1 });
    const existingIds = existing.map(q => q.quizId);
    let id = 0;
    for (let i = 0; i < existingIds.length; i++) {
        if (existingIds[i] !== id) break;
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
        console.log(`  Updated quiz "${def.title}" (id ${existing.quizId})`);
        return existing.quizId;
    }
    const quizId = await nextAvailableQuizId();
    await Quiz.create({ quizId, title: def.title, description: def.description, questions: def.questions });
    console.log(`  Created quiz "${def.title}" (id ${quizId})`);
    return quizId;
}

async function upsertAccount({ username, fname, lname, email, type, passwordHash }) {
    const existing = await User.findOne({ username });
    if (existing) {
        existing.fname = fname;
        existing.lname = lname;
        existing.email = email;
        existing.type = type;
        existing.password = passwordHash;
        existing.updatedAt = new Date();
        await existing.save();
        return existing;
    }
    return User.create({
        fname, lname, username, email,
        password: passwordHash,
        phone: '',
        type,
        createdAt: new Date(),
        updatedAt: new Date(),
        quizzes: [],
        reopenedQuizIds: []
    });
}

async function upsertCohort({ name, students, quizzes }) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1); // active as of yesterday
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90); // active for the next 90 days

    const existing = await Cohort.findOne({ name });
    if (existing) {
        existing.students = students;
        existing.quizzes = quizzes;
        existing.startDate = startDate;
        existing.endDate = endDate;
        await existing.save();
        console.log(`  Updated cohort "${name}" (${students.length} students, quizzes [${quizzes.join(', ')}])`);
        return existing;
    }
    const cohort = await Cohort.create({ name, students, quizzes, startDate, endDate });
    console.log(`  Created cohort "${name}" (${students.length} students, quizzes [${quizzes.join(', ')}])`);
    return cohort;
}

async function seed() {
    await mongoose.connect(mongoURI);
    console.log(`Connected to ${mongoURI}\n`);

    const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

    console.log(`Seeding ${STRESS_QUIZZES.length} quizzes...`);
    const quizIds = [];
    for (const def of STRESS_QUIZZES) {
        quizIds.push(await upsertQuiz(def));
    }

    console.log(`\nSeeding ${ADMIN_COUNT} admin accounts...`);
    for (let i = 1; i <= ADMIN_COUNT; i++) {
        const username = `stressadmin${i}`;
        await upsertAccount({
            username,
            fname: 'Stress',
            lname: `Admin${i}`,
            email: `${username}@stresstest.local`,
            type: 'admin',
            passwordHash
        });
        console.log(`  Upserted admin "${username}"`);
    }

    console.log(`\nSeeding ${STUDENT_COUNT} student accounts...`);
    const studentIds = [];
    for (let i = 1; i <= STUDENT_COUNT; i++) {
        const username = `stressstudent${pad(i, 3)}`;
        const user = await upsertAccount({
            username,
            fname: 'Stress',
            lname: `Student${pad(i, 3)}`,
            email: `${username}@stresstest.local`,
            type: 'student',
            passwordHash
        });
        studentIds.push(user._id);
    }
    console.log(`  Upserted ${STUDENT_COUNT} students (stressstudent001..stressstudent${pad(STUDENT_COUNT, 3)})`);

    console.log(`\nSeeding ${COHORT_COUNT} cohorts...`);
    const perCohort = Math.ceil(STUDENT_COUNT / COHORT_COUNT);
    for (let c = 0; c < COHORT_COUNT; c++) {
        const cohortStudents = studentIds.slice(c * perCohort, (c + 1) * perCohort);
        const cohortQuizIds = (COHORT_QUIZ_INDEXES[c] || []).map(idx => quizIds[idx]).filter(id => id !== undefined);
        await upsertCohort({
            name: `Stress Cohort ${c + 1}`,
            students: cohortStudents,
            quizzes: cohortQuizIds
        });
    }

    console.log('\nDone.');
    console.log(`  Admins:   stressadmin1..stressadmin${ADMIN_COUNT} (password: ${PASSWORD})`);
    console.log(`  Students: stressstudent001..stressstudent${pad(STUDENT_COUNT, 3)} (password: ${PASSWORD})`);
    console.log(`  Cohorts:  Stress Cohort 1..${COHORT_COUNT}`);
    console.log(`  Quizzes:  ${STRESS_QUIZZES.length} topics, ids [${quizIds.join(', ')}]`);

    await mongoose.disconnect();
}

seed().catch((err) => {
    console.error('Stress-test seed failed:', err);
    process.exit(1);
});
