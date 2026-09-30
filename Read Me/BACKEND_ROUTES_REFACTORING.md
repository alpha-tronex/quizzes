# Backend Routes Refactoring

## Overview
The backend routes have been refactored from a mixed structure into a clean, domain-based architecture that aligns with the frontend services.

## Previous Structure
```
server/routes/
  ├── adminRoutes.js       (370 lines - mixed user & quiz operations)
  ├── quizRoutes.js        (80 lines - student quiz operations)
  ├── quizUploadRoutes.js  (162 lines - admin quiz upload)
  ├── authRoutes.js        (authentication)
  └── utilRoutes.js        (utilities)
```

## Current Structure
```
server/routes/
  ├── adminUserRoutes.js    (admin user management + retake reopen/un-reopen)
  ├── adminQuizRoutes.js    (admin quiz upload/list/delete — quizzes live in Mongo)
  ├── adminCohortRoutes.js  (admin cohort CRUD)
  ├── quizRoutes.js         (student quiz operations: list/get/submit/history)
  ├── cohortRoutes.js       (student-facing "which cohort am I in" endpoint)
  ├── authRoutes.js         (authentication)
  └── utilRoutes.js         (utilities)
```

`adminCohortRoutes.js` and `cohortRoutes.js` were added after the original
refactor described below, once the cohort feature (students grouped into
date-scoped cohorts that gate which quizzes they can see) shipped — see
`server/models/Cohort.js` and `server/utils/cohortAccess.js`.

Error handling was also centralized after the original refactor: every route
now throws/passes an `ApiError` (`server/utils/apiError.js`) to `next()`
instead of building its own response body, and
`server/middleware/errorHandler.js` (registered last in `app.js`) is the
single place that turns that into a `{ error: { code, message } }` response.
This replaces the previously inconsistent mix of raw error dumps,
`{ error: string }`, and `{ errors: string[] }` shapes.

## Route Mapping

### Admin User Routes (`adminUserRoutes.js`)
**Purpose**: All user management and user quiz data operations for administrators

| Method | Endpoint | Description | Middleware |
|--------|----------|-------------|------------|
| GET | `/api/admin/users` | Get all users | verifyToken, verifyAdmin |
| GET | `/api/admin/user/:id` | Get user by ID | verifyToken, verifyAdmin |
| PUT | `/api/admin/user/:id` | Update user details | verifyToken, verifyAdmin |
| DELETE | `/api/admin/user/:id` | Delete user account | verifyToken, verifyAdmin |
| PATCH | `/api/admin/user/:id/type` | Update user type (admin/student) | verifyToken, verifyAdmin |
| DELETE | `/api/admin/user/:id/quizzes` | Delete all quizzes for a user | verifyToken, verifyAdmin |
| DELETE | `/api/admin/user/:userId/quiz/:quizId` | Delete specific quiz from user | verifyToken, verifyAdmin |
| DELETE | `/api/admin/quizzes/all-users-data` | Delete all quiz data from all users | verifyToken, verifyAdmin |
| POST | `/api/admin/user/:userId/reopen-quiz/:quizId` | Grant one more attempt at an already-completed (locked) quiz | verifyToken, verifyAdmin |
| DELETE | `/api/admin/user/:userId/reopen-quiz/:quizId` | Revoke an outstanding reopen grant | verifyToken, verifyAdmin |

**Features**:
- User CRUD operations with validation
- Username uniqueness checking
- User type management (promote/demote)
- User quiz data management
- Comprehensive validation using validators module
- Quiz retake lock reopen/un-reopen: a quiz is locked for a student after
  they complete it once (`server/utils/quizStatus.js`); these endpoints grant
  or revoke a one-time reopen for a specific student/quiz pair

### Admin Quiz Routes (`adminQuizRoutes.js`)
**Purpose**: Quiz file operations (upload, list, delete) for administrators

| Method | Endpoint | Description | Middleware |
|--------|----------|-------------|------------|
| POST | `/api/quiz/upload` | Upload new quiz file | verifyToken, verifyAdmin |
| GET | `/api/quiz/list` | List all uploaded quizzes | verifyToken, verifyAdmin |
| DELETE | `/api/admin/quiz-file/:quizId` | Delete specific quiz file | verifyToken, verifyAdmin |
| DELETE | `/api/admin/quiz-files/all` | Delete all quiz files | verifyToken, verifyAdmin |
| DELETE | `/api/quiz/delete/:id` | Delete quiz by ID (alternative) | verifyToken, verifyAdmin |

**Features**:
- Quiz validation (title, questions, answers, instructions)
- Auto-assign lowest available quiz ID (fills gaps)
- Duplicate title checking
- Batch file operations
- Comprehensive question validation

### Quiz Routes (`quizRoutes.js`)
**Purpose**: Student-facing quiz operations

| Method | Endpoint | Description | Middleware |
|--------|----------|-------------|------------|
| GET | `/api/quizzes` | List quizzes accessible to the caller's cohort(s), with taken/locked status | verifyToken |
| GET | `/api/quiz` | Get a specific quiz's questions (cohort-checked) | verifyToken |
| POST | `/api/quiz` | Submit a completed quiz attempt (cohort- and lock-checked) | verifyToken |
| GET | `/api/quiz/history/:username` | Get quiz history for a user, with live-joined titles | verifyToken |

**Features**:
- Quiz listing filtered by the caller's active cohort(s) — see
  `server/utils/cohortAccess.js`; admins see every quiz
- Quiz data retrieval
- Quiz submission and storage, with:
  - server-side authoritative scoring — score/correctness is always
    recomputed from the canonical `Quiz` document, never trusted from the
    client (`server/utils/quizScoring.js`)
  - retake lock enforcement — a completed quiz is locked until an admin
    reopens it (`server/utils/quizStatus.js`)
- User quiz history, with each attempt's `title` joined live against the
  current `Quiz` collection at read time rather than a stale snapshot saved
  at submission time (`server/utils/quizHistory.js`)

### Cohort Routes (`cohortRoutes.js` / `adminCohortRoutes.js`)
**Purpose**: Cohorts group students to a date-scoped set of quizzes and gate
what a student can see in `/api/quizzes`/`/api/quiz`.

| Method | Endpoint | Description | Middleware |
|--------|----------|-------------|------------|
| GET | `/api/cohort/mine` | The caller's current cohort name(s), or "Guest" if none | verifyToken |
| GET | `/api/admin/cohorts` | List all cohorts | verifyToken, verifyAdmin |
| POST | `/api/admin/cohorts` | Create a cohort | verifyToken, verifyAdmin |
| GET | `/api/admin/cohorts/:id` | Get a cohort | verifyToken, verifyAdmin |
| PUT | `/api/admin/cohorts/:id` | Update a cohort | verifyToken, verifyAdmin |
| DELETE | `/api/admin/cohorts/:id` | Delete a cohort | verifyToken, verifyAdmin |

## Alignment with Frontend Services

The backend routes now perfectly align with the frontend service architecture:

### Frontend → Backend Mapping

**AdminUserService** → **adminUserRoutes.js**
```typescript
getAllUsers()           → GET /api/admin/users
getUserById()           → GET /api/admin/user/:id
updateUser()            → PUT /api/admin/user/:id
deleteUser()            → DELETE /api/admin/user/:id
updateUserType()        → PATCH /api/admin/user/:id/type
deleteUserQuizData()    → DELETE /api/admin/user/:id/quizzes
deleteSpecificUserQuiz()→ DELETE /api/admin/user/:userId/quiz/:quizId
```

**AdminQuizService** → **adminQuizRoutes.js**
```typescript
getAvailableQuizzes()   → GET /api/quizzes (from quizRoutes)
deleteAllUsersQuizData()→ DELETE /api/admin/quizzes/all-users-data (from adminUserRoutes)
deleteQuizFile()        → DELETE /api/admin/quiz-file/:quizId
deleteAllQuizFiles()    → DELETE /api/admin/quiz-files/all
```

**Note**: `getAvailableQuizzes()` uses the public quiz endpoint, and `deleteAllUsersQuizData()` is in adminUserRoutes since it operates on user data.

## Benefits of Refactoring

### 1. Clear Separation of Concerns
- User operations separated from quiz file operations
- Admin operations separated from student operations
- Each file has a single, well-defined responsibility

### 2. Improved Maintainability
- Smaller, focused files easier to understand and modify
- Clear naming conventions
- Reduced cognitive load when making changes

### 3. Better Alignment
- Backend structure mirrors frontend services
- Easier to understand data flow
- Consistent naming across stack

### 4. Enhanced Security
- Clear middleware application
- All admin operations protected by verifyAdmin
- Consistent authentication patterns

### 5. Scalability
- Easy to add new routes in appropriate files
- Clear place for new functionality
- Supports future feature additions

## Migration Notes

### No Breaking Changes
All existing endpoints remain unchanged:
- ✅ API paths identical
- ✅ Request/response formats unchanged
- ✅ Middleware unchanged
- ✅ Frontend code requires no changes

### app.js (route wiring, current)
```javascript
const authRoutes = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');
const cohortRoutes = require('./routes/cohortRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminQuizRoutes = require('./routes/adminQuizRoutes');
const adminCohortRoutes = require('./routes/adminCohortRoutes');
const utilRoutes = require('./routes/utilRoutes');
const errorHandler = require('./middleware/errorHandler');

authRoutes(app, User);
quizRoutes(app, User, Quiz, Cohort);
cohortRoutes(app, Cohort);
adminUserRoutes(app, User);
adminQuizRoutes(app, Quiz);
adminCohortRoutes(app, Cohort, User, Quiz);
utilRoutes(app);
// ... Angular SPA catch-all ...
app.use(errorHandler); // must be registered last
```

(The `server.js` entrypoint just connects to MongoDB and calls the `app.js`
factory — the network bootstrap and the route wiring are split so tests can
exercise the app in-process via Supertest without a live port.)

## Testing

The behavior described in this doc is covered by Jest + Supertest tests in
`server/tests/` (run via `cd server && npm test`), including
`quizRoutes.test.js`, `adminUserRoutes.test.js`, `adminQuizRoutes.test.js`,
`adminCohortRoutes.test.js`, `cohortRoutes.test.js`, `authRoutes.test.js`,
`authMiddleware.test.js`, `quizScoring.test.js`, `quizRegrade.test.js`, and
`quizHistory.test.js`.

## Future Enhancements

Potential improvements for the route architecture:

1. **Router-based approach**: Convert from `app.route()` to Express Router
2. **Validation middleware**: Extract validation logic into separate middleware
3. **Rate limiting**: Add rate limiting for admin operations and the login endpoint
4. **Logging middleware**: Comprehensive request/response logging
5. **API versioning**: Support for `/api/v1/` endpoints
6. **OpenAPI documentation**: Auto-generated API documentation
7. **Controller pattern**: Separate route handlers from business logic

(Centralized error handling — previously listed here as a future item — has
since shipped: see `server/middleware/errorHandler.js` and
`server/utils/apiError.js`.)
