/**
 * Removes everything seed_stress_test.js creates, matched purely by the
 * naming convention that script uses:
 *   - users with username matching /^stressadmin\d+$/ or /^stressstudent\d+$/
 *   - cohorts with name matching /^Stress Cohort \d+$/
 *   - quizzes with title starting "[Stress] "
 *
 * Does not touch the Guest cohort/quizzes (seed_guest_cohort.js) or any
 * real admin-authored data — the regexes are deliberately specific to the
 * stress-test namespace so this can't accidentally sweep up anything else.
 *
 * Usage:
 *   node server/scripts/cleanup_stress_test.js
 *   (or: npm run cleanup:stress, from server/)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Cohort = require('../models/Cohort');
const Quiz = require('../models/Quiz');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/userDB';

async function cleanup() {
    await mongoose.connect(mongoURI);
    console.log(`Connected to ${mongoURI}\n`);

    const userResult = await User.deleteMany({
        username: { $regex: /^(stressadmin\d+|stressstudent\d+)$/ }
    });
    console.log(`Deleted ${userResult.deletedCount} stress-test accounts (admins + students).`);

    const cohortResult = await Cohort.deleteMany({
        name: { $regex: /^Stress Cohort \d+$/ }
    });
    console.log(`Deleted ${cohortResult.deletedCount} stress-test cohorts.`);

    const quizResult = await Quiz.deleteMany({
        title: { $regex: /^\[Stress\] / }
    });
    console.log(`Deleted ${quizResult.deletedCount} stress-test quizzes.`);

    console.log('\nDone.');
    await mongoose.disconnect();
}

cleanup().catch((err) => {
    console.error('Stress-test cleanup failed:', err);
    process.exit(1);
});
