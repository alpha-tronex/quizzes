/**
 * One-time migration: import existing server/quizzes/quiz_*.json files into
 * the `Quiz` MongoDB collection. Safe to re-run — quizzes already present in
 * Mongo (matched by quizId) are skipped, not overwritten.
 *
 * Usage:
 *   node server/scripts/migrate_quizzes_to_mongo.js
 *
 * Reads MONGODB_URI from the environment the same way server.js does.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');

const quizzesDir = path.join(__dirname, '../quizzes');
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/userDB';

async function migrate() {
    if (!fs.existsSync(quizzesDir)) {
        console.log(`No quizzes directory found at ${quizzesDir}, nothing to migrate.`);
        return;
    }

    const quizFiles = fs.readdirSync(quizzesDir).filter((file) => file.endsWith('.json'));
    if (quizFiles.length === 0) {
        console.log('No quiz JSON files found, nothing to migrate.');
        return;
    }

    await mongoose.connect(mongoURI);
    console.log(`Connected to ${mongoURI}`);

    let migrated = 0;
    let skipped = 0;

    for (const file of quizFiles) {
        const filePath = path.join(quizzesDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (data.id === undefined || !data.title) {
            console.warn(`Skipping ${file}: missing id or title`);
            skipped++;
            continue;
        }

        const existing = await Quiz.findOne({ quizId: data.id });
        if (existing) {
            console.log(`Quiz ${data.id} ("${data.title}") already exists in Mongo, skipping.`);
            skipped++;
            continue;
        }

        await Quiz.create({
            quizId: data.id,
            title: data.title,
            description: data.description || '',
            questions: data.questions || []
        });

        console.log(`Migrated quiz ${data.id}: "${data.title}" (${(data.questions || []).length} questions)`);
        migrated++;
    }

    console.log(`\nDone. Migrated: ${migrated}, skipped: ${skipped}.`);
    await mongoose.disconnect();
}

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
