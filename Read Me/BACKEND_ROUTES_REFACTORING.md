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

## New Structure
```
server/routes/
  ├── adminUserRoutes.js   (312 lines - admin user management)
  ├── adminQuizRoutes.js   (221 lines - admin quiz file operations)
  ├── quizRoutes.js        (80 lines - student quiz operations)
  ├── authRoutes.js        (authentication)
  └── utilRoutes.js        (utilities)
```

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

**Features**:
- User CRUD operations with validation
- Username uniqueness checking
- User type management (promote/demote)
- User quiz data management
- Comprehensive validation using validators module

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
**Purpose**: Student-facing quiz operations (unchanged)

| Method | Endpoint | Description | Middleware |
|--------|----------|-------------|------------|
| GET | `/api/quizzes` | Get list of available quizzes | verifyToken |
| GET | `/api/quiz` | Get specific quiz data | verifyToken |
| POST | `/api/quiz` | Submit completed quiz | verifyToken |
| GET | `/api/quiz/history/:username` | Get quiz history for user | verifyToken |

**Features**:
- Quiz listing with ID and title
- Quiz data retrieval
- Quiz submission and storage
- User quiz history

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

### Server.js Updates
```javascript
// Old
const adminRoutes = require('./routes/adminRoutes.js');
const quizUploadRoutes = require('./routes/quizUploadRoutes.js');
adminRoutes(app, User);
quizUploadRoutes(app);

// New
const adminUserRoutes = require('./routes/adminUserRoutes.js');
const adminQuizRoutes = require('./routes/adminQuizRoutes.js');
adminUserRoutes(app, User);
adminQuizRoutes(app);
```

## Testing Checklist

After refactoring, verify:
- ✅ Server starts without errors
- ✅ User management operations work (list, get, update, delete)
- ✅ User type changes work (promote/demote)
- ✅ Quiz upload works
- ✅ Quiz file deletion works
- ✅ User quiz data deletion works
- ✅ Student quiz operations work (list, get, submit, history)

## Future Enhancements

Potential improvements for the route architecture:

1. **Router-based approach**: Convert from `app.route()` to Express Router
2. **Validation middleware**: Extract validation logic into separate middleware
3. **Error handling middleware**: Centralized error handling
4. **Rate limiting**: Add rate limiting for admin operations
5. **Logging middleware**: Comprehensive request/response logging
6. **API versioning**: Support for `/api/v1/` endpoints
7. **OpenAPI documentation**: Auto-generated API documentation
8. **Controller pattern**: Separate route handlers from business logic
