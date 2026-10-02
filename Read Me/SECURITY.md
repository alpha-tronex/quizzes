# Security Enhancement: JWT Authentication Implementation

## Overview
The application has been enhanced with JWT (JSON Web Token) based authentication to improve security. This replaces the previous approach of storing user data in localStorage without proper session management.

## What Was Changed

### Backend Changes

1. **JWT Middleware** (`server/middleware/authMiddleware.js`)
   - Created authentication middleware using `jsonwebtoken` library
   - `verifyToken()`: Validates JWT tokens on protected routes
   - `verifyAdmin()`: Ensures only admin users can access admin-only routes
   - `generateToken()`: Creates JWT tokens; lifetime is `JWT_EXPIRES_IN`
     (defaults to 30 days if unset)
   - Token payload includes: user ID, username, type, and email
   - The server now refuses to start at all if `JWT_SECRET` is unset — there
     is no fallback/default secret

2. **Protected Routes**
   - **Auth Routes** (`server/routes/authRoutes.js`):
     - Login and register now return JWT tokens
     - `/api/user/update` requires valid token
     - `/api/login` rejects an archived account with `403 ACCOUNT_ARCHIVED`
       (checked only after the password itself verifies, so a wrong password
       on an archived account still returns the ordinary `401
       INVALID_CREDENTIALS` rather than leaking archived status)
     - `DELETE /api/account` requires valid token — self-service, irreversible
       account deletion (see "Account Deletion & Archival" below); scoped to
       `req.user.id` from the token, so no id can be passed in the body
   
   - **Quiz Routes** (`server/routes/quizRoutes.js`):
     - `/api/quizzes` - requires authentication; results filtered to the
       caller's accessible cohort(s) for students (see `utils/cohortAccess.js`)
     - `/api/quiz` (GET/POST) - requires authentication; cohort- and
       retake-lock-checked for students; score is always recomputed
       server-side (`utils/quizScoring.js`), never trusted from the client
     - `/api/quiz/history/:username` - requires authentication
   
   - **Cohort Routes** (`server/routes/cohortRoutes.js`,
     `server/routes/adminCohortRoutes.js`):
     - `/api/cohort/mine` - requires authentication (student-facing)
     - `/api/admin/cohorts` and `/api/admin/cohorts/:id` - require admin token

   - **Admin Routes** (`server/routes/adminUserRoutes.js`,
     `server/routes/adminQuizRoutes.js`):
     - `/api/admin/users` - requires admin token
     - `/api/admin/user/:id` (GET/PUT/DELETE) - requires admin token; DELETE
       is a hard-delete (see "Account Deletion & Archival" below)
     - `/api/admin/user/:userId/reopen-quiz/:quizId` (POST/DELETE) - requires
       admin token; grants/revokes a one-time retake of a locked quiz
     - `/api/admin/user/:id/archive` (POST/DELETE) - requires admin token;
       idempotent toggle that archives/unarchives a user (blocks/restores
       login without deleting data)

3. **Token Generation**
   - Tokens are generated on successful login/registration
   - Tokens expire after `JWT_EXPIRES_IN` (30 days by default)
   - Token secret stored in the environment (`JWT_SECRET`) — required, no
     fallback

### Frontend Changes

1. **HTTP Interceptor** (`src/app/core/services/auth.interceptor.ts`)
   - Automatically adds `Authorization: Bearer <token>` header to all HTTP requests
   - Intercepts 401 (Unauthorized) responses
   - Automatically redirects to login page when token is invalid/expired
   - Clears localStorage on authentication failure

2. **User Model** (`src/app/shared/models/users.ts`)
   - Added optional `token` field to User class
   - Token stored in localStorage with user data

3. **Login Service** (`src/app/core/services/login-service.ts`)
   - Updated to store token received from server
   - `updateUser()` preserves token when updating user data
   - Token automatically included in all API calls via interceptor

4. **App Module** (`src/app/app.module.ts`)
   - Registered `AuthInterceptor` as HTTP interceptor
   - Interceptor applies to all HTTP requests automatically

## Security Benefits

### 1. **Stateless Authentication**
   - Server doesn't need to maintain session state
   - Tokens are self-contained and verifiable
   - Scales better for distributed systems

### 2. **Token Expiration**
   - Tokens expire after `JWT_EXPIRES_IN` (30 days by default — a longer
     lifetime than a typical refresh-token setup, an accepted tradeoff for
     this app's data sensitivity: quiz scores, not financial/health data)
   - Reduces risk of stolen tokens being used indefinitely
   - Forces periodic re-authentication

### 3. **Route Protection**
   - API endpoints are protected with middleware
   - Unauthorized requests are blocked at the server level
   - Admin-only routes require admin privileges

### 4. **Automatic Token Management**
   - Frontend interceptor handles token injection
   - No manual token management in components
   - Consistent authentication across all API calls

### 5. **Role-Based Access Control**
   - Admin routes protected with `verifyAdmin` middleware
   - User type validated from token payload
   - Prevents privilege escalation

## How It Works

### Authentication Flow

1. **Login/Register**
   ```
   User → Frontend → POST /api/login → Backend
   Backend → Validates credentials → Generates JWT
   Backend → Returns user data + token
   Frontend → Stores user + token in localStorage
   ```

2. **API Requests**
   ```
   Component → HTTP Request → Interceptor
   Interceptor → Adds "Authorization: Bearer <token>"
   Server → Middleware verifies token
   Server → Processes request if valid
   Server → Returns 401 if invalid/expired
   Interceptor → Catches 401 → Redirects to login
   ```

3. **Token Validation**
   ```
   Request → verifyToken middleware
   Middleware → Extracts token from header
   Middleware → Verifies signature with JWT_SECRET
   Middleware → Checks expiration
   Middleware → Adds user data to req.user
   Middleware → Calls next() or returns error
   ```

## Account Deletion & Archival

Two distinct, intentionally separate mechanisms — added to satisfy Apple App
Store Guideline 5.1.1(v), which requires that any app supporting in-app
account creation also support in-app account deletion (not just
deactivation):

1. **Self-service hard delete** — `DELETE /api/account` (any authenticated
   user, guest or real-cohort student). Immediately and irreversibly deletes
   the caller's own `User` document and, via the shared
   `deleteUserCascade(userId, User, Cohort)` helper
   (`server/utils/userDeletion.js`), pulls their id out of every `Cohort`'s
   `students` array so no orphaned references remain. This is the path the
   mobile app's Account screen ("Delete my account") and, in the future, any
   web equivalent, would call. There is no undo.

2. **Admin archive/unarchive** — `POST`/`DELETE
   /api/admin/user/:id/archive`. A reversible housekeeping toggle: sets
   `User.archived = true` and `archivedAt = <timestamp>` (or clears both).
   An archived user's data and quiz history are untouched, but `POST
   /api/login` rejects them with `403 ACCOUNT_ARCHIVED`. This exists for
   admins who want to suspend an account without the student having to
   delete their own data, and is explicitly *not* the app's only deletion
   path — per 5.1.1(v), a customer-service-only deletion flow isn't
   sufficient for an education app, hence mechanism #1 above.

3. **Admin hard delete** — `DELETE /api/admin/user/:id` also routes through
   `deleteUserCascade`, so an admin-initiated delete gets the same
   cohort-cleanup guarantee as the self-service path.

Both `User.archived`/`archivedAt` fields and `deleteUserCascade` are covered
by Jest tests in `server/tests/authRoutes.test.js` and
`server/tests/adminUserRoutes.test.js`.

**Cohort admin notification.** If the student who self-deletes (mechanism
#1 above) belonged to at least one real (non-guest) cohort, `DELETE
/api/account` also creates an `AccountDeletionNotice`
(`server/models/AccountDeletionNotice.js`) — a standalone snapshot (name,
username, cohort name(s), quiz count, timestamp) for admins, since a cohort
departure affects a real course roster. Guest/no-cohort deletions don't
create one. This never delays or affects the deletion itself, which stays
immediate; a notice-creation failure is logged and swallowed rather than
surfaced to the student (see `server/utils/accountDeletionNotices.js`).
Admins see unacknowledged notices as a banner on the Angular admin's User
Management page (`GET /api/admin/account-deletion-notices`); acknowledging one
(`POST /api/admin/account-deletion-notices/:id/acknowledge`, idempotent)
just flags it seen — the record itself is never deleted, so it doubles as
a simple history log.

## Environment Variables

Add to `.env` (or `server/.env.production` in production — see `.env.example`):
```env
# Required — server refuses to start if unset, no fallback secret
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production-12345
# Optional, defaults to 30d if unset
JWT_EXPIRES_IN=30d
# Optional, comma-separated browser origins; leave unset for same-origin only
CORS_ORIGINS=
```

**Important**: Change `JWT_SECRET` to a strong, random string in production!

## Best Practices Implemented

1. ✅ **Passwords Hashed**: Using bcrypt with salt rounds
2. ✅ **Tokens Expire**: `JWT_EXPIRES_IN`, 30 days by default
3. ✅ **HTTPS Ready**: Token transmitted in Authorization header
4. ✅ **No Passwords in Responses**: Password field excluded from API responses
5. ✅ **Role-Based Access**: Admin middleware for privileged routes
6. ✅ **Automatic Logout**: Invalid tokens trigger re-authentication
7. ✅ **Centralized Auth**: HTTP interceptor manages all authentication
8. ✅ **Centralized Error Handling**: every route passes errors to a single
   `errorHandler` middleware (`server/middleware/errorHandler.js`) via
   `ApiError` (`server/utils/apiError.js`), producing a consistent
   `{ error: { code, message } }` response body instead of ad-hoc shapes

## Testing

1. **Test Login**:
   - Login with valid credentials
   - Check that token is in localStorage: `localStorage.getItem('currentUser')`
   - Verify token is included in subsequent requests (check Network tab)

2. **Test Token Expiration**:
   - Wait for `JWT_EXPIRES_IN` to elapse (or manually expire/forge a token)
   - Make an API request
   - Should redirect to login page

3. **Test Admin Routes**:
   - Login as regular user
   - Try accessing `/api/admin/users`
   - Should receive 403 Forbidden

4. **Test Protected Routes**:
   - Clear localStorage
   - Try accessing `/api/quizzes`
   - Should receive 401 Unauthorized

## Future Enhancements

Consider these additional security improvements (CORS is already handled —
see below — the rest are still open):

1. **Refresh Tokens**: Implement refresh token mechanism for seamless re-authentication
2. **Token Blacklist**: Maintain blacklist of revoked tokens (logout)
3. **Rate Limiting**: Prevent brute force attacks on the login endpoint (not yet implemented)
4. **Password Requirements**: Enforce stronger password policies
5. **Two-Factor Authentication**: Add 2FA for admin accounts
6. **Security Headers**: Add helmet.js for security headers (not yet implemented)
7. **Input Sanitization**: Prevent XSS and SQL injection
8. **Audit Logging**: Log authentication attempts and admin actions

CORS is already implemented and configured via the `CORS_ORIGINS` env var
(same-origin only unless explicitly set — see `server/app.js`), so it's no
longer a future item.

## Production Deployment Checklist

- [x] Strong `JWT_SECRET` required (server refuses to boot without it)
- [x] HTTPS enabled (Certbot/nginx on Hetzner — see `../DEPLOY.md`)
- [x] CORS configured (`CORS_ORIGINS` env var, same-origin by default)
- [ ] Set secure cookie flags if using cookies (currently localStorage, not cookies)
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Regular security audits
- [ ] Keep dependencies updated

## Dependencies

```json
{
  "jsonwebtoken": "^9.0.3",
  "bcrypt": "^6.0.0"
}
```

(See `server/package.json` for the current pinned versions.)

## Technical Details

**JWT Structure**:
```
Header.Payload.Signature

Payload contains:
- id: user._id
- username: user.username
- type: user.type (student/admin)
- email: user.email
- exp: expiration timestamp
```

**Token Storage**: localStorage (consider httpOnly cookies for enhanced security in future)

**Token Verification**: HS256 (the `jsonwebtoken` library's default signing algorithm) with the shared `JWT_SECRET`

## Troubleshooting

**401 Unauthorized errors**:
- Check if token exists in localStorage
- Verify token hasn't expired
- Ensure JWT_SECRET matches between environments

**403 Forbidden errors**:
- Verify user has correct role (admin vs student)
- Check token payload contains correct user type

**Token not being sent**:
- Verify interceptor is registered in app.module
- Check browser console for errors
- Inspect Network tab for Authorization header
