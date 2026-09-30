# JWT Authentication Quick Reference

## For Developers

### Testing Authentication Locally

1. **Start the server**:
   ```bash
   cd server
   npm start
   ```

2. **Build and run Angular app**:
   ```bash
   npm run build
   # or for dev mode:
   ng serve
   ```

3. **Login via UI** or **Test with curl**:
   ```bash
   # Login
   curl -X POST http://localhost:3000/api/login \
     -H "Content-Type: application/json" \
     -d '{"uname":"admin","pass":"local123"}'
   
   # Response includes token:
   # {"id":"...","uname":"admin","token":"eyJhbGc..."}
   ```

4. **Use token in requests**:
   ```bash
   # Get protected resource
   curl -X GET http://localhost:3000/api/quizzes \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

### Key Files

```
server/
  middleware/
    authMiddleware.js       # verifyToken / verifyAdmin / generateToken
    errorHandler.js         # Centralized error handler (registered last in app.js)
  routes/
    authRoutes.js            # Login/register endpoints (generates tokens)
    quizRoutes.js             # Student-facing quiz endpoints (protected)
    cohortRoutes.js           # Student-facing "my cohort" endpoint (protected)
    adminUserRoutes.js        # Admin user management (protected + admin check)
    adminQuizRoutes.js        # Admin quiz upload/management (protected + admin check)
    adminCohortRoutes.js      # Admin cohort CRUD (protected + admin check)
  utils/
    apiError.js              # ApiError class -> { error: { code, message } } responses

src/app/
  core/services/
    auth.interceptor.ts     # Adds token to all requests
    login-service.ts        # Handles login/register
  app.module.ts             # Registers interceptor (LoginService/AuthInterceptor
                             # are imported from '@core/services/...')
```

### Environment Setup

**`.env` file** (in project root — see `.env.example`):
```env
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production-12345
MONGODB_URI=mongodb://localhost:27017/userDB
PORT=3000
# Optional, defaults to 30d if unset (see server/middleware/authMiddleware.js)
JWT_EXPIRES_IN=30d
```

⚠️ **Never commit real JWT secrets to git!** The server now refuses to start
at all if `JWT_SECRET` is unset — there is no default/fallback secret.

### How to Check if Auth is Working

1. **Frontend (Browser Console)**:
   ```javascript
   // Check stored user/token
   JSON.parse(localStorage.getItem('currentUser'))
   
   // Should show: { id, uname, email, ..., token: "eyJhbG..." }
   ```

2. **Backend (Server Logs)**:
   - Look for "status 200 success" after login
   - Check Network tab for `Authorization: Bearer ...` header

3. **Test Protected Route**:
   - Clear localStorage: `localStorage.clear()`
   - Try to access `/api/quizzes`
   - Should get 401 error and redirect to login

### Common Issues

**Problem**: 401 Unauthorized on all requests
- **Solution**: Check token in localStorage exists
- **Solution**: Verify interceptor is registered in app.module.ts
- **Solution**: Check JWT_SECRET matches in .env

**Problem**: 403 Forbidden on admin routes
- **Solution**: Verify user type is 'admin' in token payload
- **Solution**: Login with admin credentials

**Note**: all error responses (auth and otherwise) now use the shape
`{ "error": { "code": "SOME_CODE", "message": "..." } }`, produced by
`server/middleware/errorHandler.js` — not a raw string or an `errors` array.

**Problem**: Token expired
- **Solution**: Login again (tokens expire after `JWT_EXPIRES_IN`, 30 days by default)
- **Solution**: Consider implementing refresh token mechanism

### Adding New Protected Routes

**Backend**:
```javascript
const { verifyToken, verifyAdmin } = require('./middleware/authMiddleware');

// For authenticated users
app.get('/api/my-route', verifyToken, (req, res) => {
  // req.user contains decoded token data
  res.json({ userId: req.user.id });
});

// For admin only
app.get('/api/admin/my-route', verifyToken, verifyAdmin, (req, res) => {
  res.json({ message: 'Admin access granted' });
});
```

**Frontend**: No changes needed! Interceptor automatically adds token.

### Security Checklist

Development:
- [x] JWT tokens generated on login/register
- [x] Tokens include expiration (`JWT_EXPIRES_IN`, 30 days by default)
- [x] Protected routes require valid token
- [x] Admin routes require admin role
- [x] Interceptor adds token automatically
- [x] 401 responses trigger logout
- [x] Server refuses to boot without `JWT_SECRET` set (no fallback secret)

Production:
- [x] Strong `JWT_SECRET` (generated with `openssl rand -base64 48`, see DEPLOY.md)
- [x] HTTPS enabled (Certbot/nginx on Hetzner, see ../DEPLOY.md)
- [x] CORS configured (same-origin only unless `CORS_ORIGINS` is set)
- [ ] Rate limiting on login endpoint
- [ ] Helmet.js for security headers
- [ ] Regular dependency updates

### Testing Different User Roles

**Student Account**:
- Can access: quiz routes, own user update
- Cannot access: admin routes
- Which quizzes show up in `/api/quizzes` depends on cohort membership (see
  `server/utils/cohortAccess.js`) — a student with no real cohort falls back
  to the seeded Guest cohort's 3 quizzes rather than seeing everything.

**Admin Account**:
- Can access: everything
- Special privileges: user management

Test by logging in as different users and checking `/api/admin/users` access.

### Debugging Tips

1. **Token Inspection**:
   ```javascript
   // In browser console
   const user = JSON.parse(localStorage.getItem('currentUser'));
   const tokenParts = user.token.split('.');
   const payload = JSON.parse(atob(tokenParts[1]));
   console.log('Token payload:', payload);
   console.log('Expires:', new Date(payload.exp * 1000));
   ```

2. **Network Tab**:
   - Open DevTools → Network
   - Filter by XHR
   - Click any request
   - Check "Request Headers" for `Authorization: Bearer ...`

3. **Server Logs**:
   - Token verification errors appear in server console
   - Look for "Invalid token" or "Token expired" messages

### Quick Command Reference

```bash
# Install dependencies
cd server && npm install

# Generate strong secret (Linux/Mac)
openssl rand -base64 32

# Test token generation
node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({test:1}, 'secret', {expiresIn:'24h'}))"

# Check server can load auth middleware
cd server && node -e "require('./middleware/authMiddleware'); console.log('OK')"

# Build frontend
npm run build

# Start server
cd server && npm start
```
