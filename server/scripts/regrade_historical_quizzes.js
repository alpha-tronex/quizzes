/**
 * One-time backfill: regrades historical quiz attempts saved before the
 * 0-based indexing fix (see utils/quizScoring.js, utils/quizRegrade.js, and
 * questions.component.ts / TakeQuizScreen.tsx for the client-side fix) was
 * deployed.
 *
 * See utils/quizRegrade.js for the actual recompute logic (and its unit
 * tests in tests/quizRegrade.test.js, which don't need a database) — this
 * script is just the CLI/DB orchestration: find affected users, regrade
 * each attempt completed before a cutoff, and save the ones that actually
 * changed.
 *
 * Usage:
 *   node server/scripts/regrade_historical_quizzes.js --cutoff <ISO date> [--dry-run]
 *
 * --cutoff (required): attempts with completedAt (falling back to
 *   createdAt) strictly before this instant are regraded; attempts at/after
 *   it are left untouched, since they were already saved under the fixed
 *   0-based convention. Pass the moment the indexing fix went live in
 *   production — no default is guessed, since guessing wrong either
 *   corrupts already-correct data or leaves legacy data unfixed.
 * --dry-run (optional): report what would change without writing to the DB.
 *
 * Reads MONGODB_URI from the environment the same way server.js does.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { regradeAttempt } = require('../utils/quizRegrade');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/userDB';

function parseArgs(argv) {
    const args = { dryRun: false, cutoff: null };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--dry-run') {
            args.dryRun = true;
        } else if (argv[i] === '--cutoff') {
            args.cutoff = argv[i + 1];
            i++;
        }
    }
    return args;
}

function usageAndExit() {
    console.error('Usage: node server/scripts/regrade_historical_quizzes.js --cutoff <ISO date> [--dry-run]');
    console.error('  --cutoff is required: the moment the 0-based indexing fix went live.');
    process.exit(1);
}

async function run() {
    const { cutoff, dryRun } = parseArgs(process.argv.slice(2));
    if (!cutoff) {
        usageAndExit();
        return;
    }

    const cutoffDate = new Date(cutoff);
    if (Number.isNaN(cutoffDate.getTime())) {
        console.error(`Invalid --cutoff value: "${cutoff}" is not a parseable date.`);
        process.exit(1);
        return;
    }

    await mongoose.connect(mongoURI);
    console.log(`Connected to ${mongoURI}`);
    console.log(`Regrading attempts completed before ${cutoffDate.toISOString()}${dryRun ? ' (dry run)' : ''}\n`);

    const users = await User.find({ 'quizzes.0': { $exists: true } });

    let usersChanged = 0;
    let attemptsRegraded = 0;
    let attemptsUnchanged = 0;
    let attemptsSkippedUnsafe = 0;
    let attemptsAfterCutoff = 0;

    for (const user of users) {
        let userChanged = false;

        for (const attempt of user.quizzes) {
            const attemptDate = attempt.completedAt || attempt.createdAt;
            if (attemptDate && attemptDate >= cutoffDate) {
                attemptsAfterCutoff++;
                continue;
            }

            const result = regradeAttempt(attempt.toObject());

            if (result.skippedUnsafe) {
                attemptsSkippedUnsafe++;
                console.warn(
                    `Skipping unsafe attempt: user=${user.username} quizId=${attempt.id} ` +
                    `attemptId=${attempt._id} — a question's selection contains 0, which is ` +
                    'impossible under the legacy 1-based encoding. Needs manual review.'
                );
                continue;
            }

            if (!result.changed) {
                attemptsUnchanged++;
                continue;
            }

            attemptsRegraded++;
            userChanged = true;
            attempt.questions = result.questions;
            attempt.score = result.score;
            console.log(
                `Regraded: user=${user.username} quizId=${attempt.id} attemptId=${attempt._id} ` +
                `-> score=${result.score}/${attempt.totalQuestions}`
            );
        }

        if (userChanged) {
            usersChanged++;
            if (!dryRun) {
                await user.save();
            }
        }
    }

    console.log('\nDone.');
    console.log(`Users with regraded attempts: ${usersChanged}`);
    console.log(`Attempts regraded: ${attemptsRegraded}`);
    console.log(`Attempts already correct (no change): ${attemptsUnchanged}`);
    console.log(`Attempts skipped as unsafe (needs manual review): ${attemptsSkippedUnsafe}`);
    console.log(`Attempts left untouched (at/after cutoff): ${attemptsAfterCutoff}`);
    if (dryRun) {
        console.log('\nDry run — no changes were written. Re-run without --dry-run to apply.');
    }

    await mongoose.disconnect();
}

run().catch((err) => {
    console.error('Regrade failed:', err);
    process.exit(1);
});
