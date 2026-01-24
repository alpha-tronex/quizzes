const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const fs = require('fs');
const path = require('path');

module.exports = function(app) {
    // Upload quiz (admin only)
    app.route("/api/quiz/upload")
        .post(verifyToken, verifyAdmin, async (req, res) => {
            try {
                const quizData = req.body;
                
                // Validate required fields (ID will be auto-assigned)
                if (!quizData.title) {
                    return res.status(400).json({ error: 'Quiz must have a title field' });
                }
                if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
                    return res.status(400).json({ error: 'Quiz must have a questions array with at least one question' });
                }
                
                // Validate each question
                for (let i = 0; i < quizData.questions.length; i++) {
                    const q = quizData.questions[i];
                    if (!q.question) {
                        return res.status(400).json({ error: `Question ${i + 1} is missing the question field` });
                    }
                    if (!q.instructions) {
                        return res.status(400).json({ error: `Question ${i + 1} is missing the instructions field` });
                    }
                    if (!q.correct || !Array.isArray(q.correct) || q.correct.length === 0) {
                        return res.status(400).json({ error: `Question ${i + 1} must have a correct answer array` });
                    }
                    // Check for at least 2 answers
                    if (!q.answers || !Array.isArray(q.answers)) {
                        return res.status(400).json({ error: `Question ${i + 1} must have an answers array` });
                    }
                    const answerCount = q.answers.filter(a => a && a.trim() !== '').length;
                    if (answerCount < 2) {
                        return res.status(400).json({ error: `Question ${i + 1} must have at least 2 answers` });
                    }
                }
                
                // Auto-assign quiz ID using lowest available ID
                const quizzesDir = path.join(__dirname, '../quizzes');
                
                // Create quizzes directory if it doesn't exist
                if (!fs.existsSync(quizzesDir)) {
                    fs.mkdirSync(quizzesDir, { recursive: true });
                }
                
                // Check for duplicate titles
                if (fs.existsSync(quizzesDir)) {
                    const quizFiles = fs.readdirSync(quizzesDir).filter(file => file.endsWith('.json'));
                    for (const file of quizFiles) {
                        const filePath = path.join(quizzesDir, file);
                        const existingQuiz = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        if (existingQuiz.title && existingQuiz.title.toLowerCase() === quizData.title.toLowerCase()) {
                            return res.status(400).json({ 
                                error: `A quiz with the title "${quizData.title}" already exists (ID: ${existingQuiz.id})` 
                            });
                        }
                    }
                }
                
                // Get all existing quiz IDs
                const existingIds = [];
                if (fs.existsSync(quizzesDir)) {
                    const quizFiles = fs.readdirSync(quizzesDir).filter(file => file.endsWith('.json'));
                    quizFiles.forEach(file => {
                        const match = file.match(/quiz_(\d+)\.json/);
                        if (match) {
                            existingIds.push(parseInt(match[1], 10));
                        }
                    });
                }
                
                // Sort IDs to find gaps
                existingIds.sort((a, b) => a - b);
                
                // Find the lowest available ID (fills gaps first)
                let newId = 0;
                for (let i = 0; i < existingIds.length; i++) {
                    if (existingIds[i] !== newId) {
                        // Found a gap, use this ID
                        break;
                    }
                    newId++;
                }
                
                // Assign the lowest available ID (overwrite any existing ID in the data)
                quizData.id = newId;
                
                const filePath = path.join(quizzesDir, `quiz_${newId}.json`);
                
                // Write quiz to file
                fs.writeFileSync(filePath, JSON.stringify(quizData, null, 2), 'utf8');
                
                console.log(`Quiz uploaded: ${quizData.title} (ID: ${newId})`);
                
                res.status(201).json({ 
                    message: 'Quiz uploaded successfully', 
                    quizId: newId,
                    title: quizData.title
                });
            } catch (err) {
                console.log('Quiz upload error:', err);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

    // Get list of all uploaded quizzes (admin only)
    app.route("/api/quiz/list")
        .get(verifyToken, verifyAdmin, (req, res) => {
            try {
                const quizzesDir = path.join(__dirname, '../quizzes');
                
                if (!fs.existsSync(quizzesDir)) {
                    return res.status(200).json([]);
                }
                
                const quizFiles = fs.readdirSync(quizzesDir).filter(file => file.endsWith('.json'));
                
                const quizzes = quizFiles.map(file => {
                    const data = JSON.parse(fs.readFileSync(path.join(quizzesDir, file), 'utf8'));
                    return {
                        id: data.id,
                        title: data.title,
                        description: data.description || '',
                        questionCount: data.questions?.length || 0
                    };
                });
                
                res.status(200).json(quizzes);
            } catch (err) {
                console.log('Error listing quizzes:', err);
                res.status(500).json({ error: 'Failed to load quiz list' });
            }
        });

    // Delete quiz (admin only)
    app.route("/api/quiz/delete/:id")
        .delete(verifyToken, verifyAdmin, (req, res) => {
            try {
                const quizId = req.params.id;
                const quizzesDir = path.join(__dirname, '../quizzes');
                const filePath = path.join(quizzesDir, `quiz_${quizId}.json`);
                
                if (!fs.existsSync(filePath)) {
                    return res.status(404).json({ error: 'Quiz not found' });
                }
                
                fs.unlinkSync(filePath);
                
                console.log(`Quiz deleted: ID ${quizId}`);
                
                res.status(200).json({ message: 'Quiz deleted successfully' });
            } catch (err) {
                console.log('Quiz delete error:', err);
                res.status(500).json({ error: 'Failed to delete quiz' });
            }
        });
};
