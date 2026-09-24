// Anchored to this file's directory (repo root's .env), not process.cwd() —
// see server.js for why. app.js is also required directly by Supertest in
// tests, so it needs the same cwd-independent resolution on its own.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const User = require('./models/User');
const Quiz = require('./models/Quiz');
const Cohort = require('./models/Cohort');

const authRoutes = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');
const cohortRoutes = require('./routes/cohortRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminQuizRoutes = require('./routes/adminQuizRoutes');
const adminCohortRoutes = require('./routes/adminCohortRoutes');
const utilRoutes = require('./routes/utilRoutes');
const errorHandler = require('./middleware/errorHandler');

/**
 * Express app factory — no `.listen()` here. Splitting this out from the
 * network bootstrap (server.js) lets Supertest exercise the app in-process
 * without a live port, and keeps server.js a thin, easy-to-reason-about
 * entrypoint.
 */
function createApp() {
    const app = express();

    // Serve Angular app (support multiple dev/prod layouts)
    const distBrowserPath = path.join(__dirname, '../dist/browser');
    const distPath = path.join(__dirname, '../dist');
    const srcPath = path.join(__dirname, '../src');

    // CORS: disabled (same-origin only) unless CORS_ORIGINS is explicitly set.
    // The mobile app (Expo web / dev tooling) needs this set to its dev server
    // origin(s); native mobile fetch isn't subject to browser CORS at all, so
    // this only matters for browser-based clients. See .env.example.
    const corsOrigins = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    app.use(cors({
        origin: corsOrigins.length ? corsOrigins : false,
        credentials: true
    }));

    if (fs.existsSync(distBrowserPath)) {
        app.use(express.static(distBrowserPath));
    } else if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
    } else {
        // fallback to serving the source index during development
        app.use(express.static(srcPath));
    }

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // Static privacy policy page, served as plain HTML (not part of the
    // Angular SPA) — needs a stable public URL for the App Store Connect
    // "Privacy Policy URL" field. Registered before the Angular catch-all
    // below so it isn't swallowed by that route.
    app.get('/privacy', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
    });

    // Setup authentication routes
    authRoutes(app, User);

    // Setup quiz routes (student-facing)
    quizRoutes(app, User, Quiz, Cohort);

    // Setup cohort-info route (student-facing)
    cohortRoutes(app, Cohort);

    // Setup admin routes
    adminUserRoutes(app, User);
    adminQuizRoutes(app, Quiz);
    adminCohortRoutes(app, Cohort, User, Quiz);

    // Setup utility routes
    utilRoutes(app);

    // Serve Angular app for any other GET request (must be after API routes)
    app.use((req, res, next) => {
        // If the request is for API, skip
        if (req.path && req.path.startsWith('/api/')) {
            return next();
        }

        let indexFile;
        if (fs.existsSync(path.join(distBrowserPath, 'index.html'))) {
            indexFile = path.join(distBrowserPath, 'index.html');
        } else if (fs.existsSync(path.join(distPath, 'index.html'))) {
            indexFile = path.join(distPath, 'index.html');
        } else {
            indexFile = path.join(srcPath, 'index.html');
        }

        // Set cache control headers for Safari compatibility
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(indexFile);
    });

    // Centralized error handler — must be registered last
    app.use(errorHandler);

    return app;
}

module.exports = createApp;
