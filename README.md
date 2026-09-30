# Quiz Master

Full-stack quiz application: an Angular 20 admin/student web app backed by a
Node/Express + MongoDB (Mongoose) API, plus a React Native/Expo companion app
for iOS and Android that lives in a separate repo. Live in production at
**https://quizmaster.alphatronex.com**, deployed to a shared Hetzner VPS (see
[DEPLOY.md](DEPLOY.md)).

## Key features

- **Auth**: JWT-based login/register for `student` and `admin` accounts (see
  `server/middleware/authMiddleware.js`, [Read Me/AUTH_QUICK_REFERENCE.md](Read%20Me/AUTH_QUICK_REFERENCE.md)).
- **Cohorts**: students are grouped into date-scoped cohorts that gate which
  quizzes they can see/take; admins manage cohorts and their quiz/student
  membership from the admin UI (`server/models/Cohort.js`,
  `server/routes/adminCohortRoutes.js`, `server/utils/cohortAccess.js`).
  Students with no real cohort membership (fresh registrations, legacy
  accounts, App/Play Store reviewer accounts) fall back to a seeded "Guest"
  cohort with 3 sample quizzes instead of seeing an empty list — see
  `server/scripts/seed_guest_cohort.js`.
- **Quiz retake lock + reopen**: a quiz is locked after a student completes it
  once; an admin can reopen it to grant exactly one more attempt, or revoke an
  unused reopen grant (`server/utils/quizStatus.js`, the
  `/api/admin/user/:userId/reopen-quiz/:quizId` route).
- **Server-side authoritative scoring**: quiz scores are always recomputed on
  the server from the canonical quiz document, never trusted from the client
  (`server/utils/quizScoring.js`). A one-time backfill script
  (`server/scripts/regrade_historical_quizzes.js`) exists to regrade attempts
  saved before this was in place.
- **Quiz history**: a student's quiz history joins each attempt's title
  live against the current `Quiz` collection at read time, so a renamed quiz
  shows its current title, not a stale snapshot (`server/utils/quizHistory.js`).
- **Idle timeout**: automatic logout after inactivity on the web app (see
  [Read Me/IDLE_TIMEOUT.md](Read%20Me/IDLE_TIMEOUT.md)).
- **Privacy policy**: a static page at `/privacy`
  (https://quizmaster.alphatronex.com/privacy), required for the App Store
  submission of the companion mobile app.

## Local development

```bash
# install everything
npm install
cd server && npm install && cd ..

# environment
cp .env.example .env   # fill in MONGODB_URI / JWT_SECRET / etc.

# run the Angular dev server (proxies /api to the backend)
npm run dev

# run the backend API
npm run server

# run both build + serve for a production-style local run
npm run build && npm start
```

Other useful root scripts (see `package.json`): `npm test` (Angular/Karma
unit tests), `npm run typecheck`, `npm run lint`. Backend tests live in
`server/` and run with `cd server && npm test` (Jest + Supertest +
`mongodb-memory-server`; see `server/tests/`).

## Documentation

- [DEPLOY.md](DEPLOY.md) — current Hetzner deployment runbook (source of
  truth for how this app is actually deployed).
- [Read Me/](Read%20Me/) — feature-specific docs (auth, security, cohort/quiz
  routing, idle timeout, load testing).
- `loadtest/README.md` — k6 stress test against the live API.
