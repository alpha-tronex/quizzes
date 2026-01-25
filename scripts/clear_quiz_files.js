#!/usr/bin/env node

/**
 * Script to delete all quiz files from the server/quizzes folder
 * 
 * Usage:
 *   node scripts/clear_quiz_files.js
 * 
 * Warning: This operation cannot be undone!
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Quiz files directory
const QUIZ_DIR = path.join(__dirname, '../server/quizzes');

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
 * Get all quiz JSON files in the directory
 */
function getQuizFiles() {
    try {
        if (!fs.existsSync(QUIZ_DIR)) {
            throw new Error(`Quiz directory does not exist: ${QUIZ_DIR}`);
        }

        const files = fs.readdirSync(QUIZ_DIR);
        return files.filter(file => file.endsWith('.json') && file.startsWith('quiz_'));
    } catch (error) {
        throw new Error(`Error reading quiz directory: ${error.message}`);
    }
}

/**
 * Delete all quiz files
 */
async function clearAllQuizFiles() {
    try {
        console.log(`\nScanning quiz directory: ${QUIZ_DIR}`);
        
        // Get list of quiz files
        const quizFiles = getQuizFiles();
        
        if (quizFiles.length === 0) {
            console.log("\nNo quiz files found. Nothing to delete.");
            return;
        }

        console.log(`\nFound ${quizFiles.length} quiz file(s):`);
        quizFiles.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file}`);
        });

        // Get confirmation
        console.log("\n⚠️  WARNING: This will permanently delete all quiz files!");
        console.log("This action CANNOT be undone.");
        console.log("Users will no longer be able to take these quizzes.\n");
        
        const confirmed = await confirmAction("Are you sure you want to continue? (yes/no): ");
        
        if (!confirmed) {
            console.log("\nOperation cancelled. No files were deleted.");
            return;
        }

        // Final confirmation
        const finalConfirmed = await confirmAction("\nFinal confirmation - Type 'yes' to proceed: ");
        
        if (!finalConfirmed) {
            console.log("\nOperation cancelled. No files were deleted.");
            return;
        }

        // Delete files
        console.log("\nDeleting quiz files...");
        let deletedCount = 0;
        let errors = [];

        for (const file of quizFiles) {
            const filePath = path.join(QUIZ_DIR, file);
            try {
                fs.unlinkSync(filePath);
                deletedCount++;
                console.log(`  ✓ Deleted: ${file}`);
            } catch (error) {
                errors.push({ file, error: error.message });
                console.error(`  ✗ Failed to delete ${file}: ${error.message}`);
            }
        }

        console.log("\n" + "=".repeat(60));
        console.log("✅ Operation completed!");
        console.log(`   Files deleted: ${deletedCount}`);
        if (errors.length > 0) {
            console.log(`   Errors: ${errors.length}`);
        }
        console.log("=".repeat(60));

        if (errors.length > 0) {
            console.log("\nErrors encountered:");
            errors.forEach(({ file, error }) => {
                console.log(`  - ${file}: ${error}`);
            });
        }

    } catch (error) {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run the script
console.log("=".repeat(60));
console.log("Clear Quiz Files Script");
console.log("=".repeat(60));

clearAllQuizFiles()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error("Unexpected error:", error);
        rl.close();
        process.exit(1);
    });
