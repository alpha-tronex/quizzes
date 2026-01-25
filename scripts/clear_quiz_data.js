#!/usr/bin/env node

/**
 * Script to clear all quiz data from all users in the database
 * 
 * Usage:
 *   node scripts/clear_quiz_data.js
 * 
 * Environment Variables:
 *   MONGODB_URI - MongoDB connection string (defaults to local)
 * 
 * Warning: This operation cannot be undone!
 */

require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");

// User Schema (must match server/server.js)
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
    quizzes: [{
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
        duration: Number
    }]
});

const User = mongoose.model("User", userSchema);

// Create readline interface for user confirmation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Prompts user for confirmation
 */
function confirmAction(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
    });
}

/**
 * Clear all quiz data from all users
 */
async function clearAllQuizData() {
    try {
        // Connect to MongoDB
        const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/userDB";
        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB successfully");

        // Get count of users with quiz data
        const usersWithQuizzes = await User.countDocuments({ 
            "quizzes.0": { $exists: true } 
        });
        
        const totalUsers = await User.countDocuments();
        
        console.log(`\nDatabase Statistics:`);
        console.log(`  Total users: ${totalUsers}`);
        console.log(`  Users with quiz data: ${usersWithQuizzes}`);

        if (usersWithQuizzes === 0) {
            console.log("\nNo quiz data found. Nothing to clear.");
            return;
        }

        // Get confirmation
        console.log("\n⚠️  WARNING: This will permanently delete all quiz data from all users!");
        console.log("This action CANNOT be undone.\n");
        
        const confirmed = await confirmAction("Are you sure you want to continue? (yes/no): ");
        
        if (!confirmed) {
            console.log("\nOperation cancelled. No data was modified.");
            return;
        }

        // Final confirmation
        const finalConfirmed = await confirmAction("\nFinal confirmation - Type 'yes' to proceed: ");
        
        if (!finalConfirmed) {
            console.log("\nOperation cancelled. No data was modified.");
            return;
        }

        // Clear quiz data
        console.log("\nClearing quiz data...");
        const result = await User.updateMany(
            {},
            { $set: { quizzes: [] } }
        );

        console.log("\n✅ Quiz data cleared successfully!");
        console.log(`   Users modified: ${result.modifiedCount}`);
        console.log(`   Matched documents: ${result.matchedCount}`);

    } catch (error) {
        console.error("\n❌ Error clearing quiz data:", error.message);
        process.exit(1);
    } finally {
        // Close readline and mongoose connection
        rl.close();
        await mongoose.connection.close();
        console.log("\nDatabase connection closed.");
    }
}

// Run the script
console.log("=".repeat(60));
console.log("Clear Quiz Data Script");
console.log("=".repeat(60));

clearAllQuizData()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error("Unexpected error:", error);
        process.exit(1);
    });
