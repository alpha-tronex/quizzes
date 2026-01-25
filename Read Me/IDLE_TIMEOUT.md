# Idle Timeout Feature

## Overview
The application now includes an **automatic idle timeout** feature that logs out users after a period of inactivity. This enhances security by preventing unauthorized access to unattended sessions.

## Features

### 1. **Automatic Activity Monitoring**
The system monitors the following user activities:
- Mouse movements
- Mouse clicks
- Keyboard presses
- Scroll events
- Touch events (for mobile devices)
- API requests

### 2. **Configurable Timeout Duration**
Default settings (configurable in environment files):
- **Idle Timeout**: 30 minutes of inactivity
- **Warning Period**: 2 minutes before automatic logout

### 3. **User Warning Dialog**
Before automatic logout, users receive a warning dialog:
- Shows time remaining until logout
- Option to **stay logged in** (resets timer)
- Option to **logout now**

### 4. **Automatic Logout**
If user doesn't respond to warning or continues to be inactive:
- User is automatically logged out
- Redirected to login page
- Message displayed explaining reason for logout

### 5. **Smart Timer Reset**
The idle timer resets automatically on:
- Any user interaction (mouse, keyboard, touch)
- Successful API requests
- User choosing to stay logged in from warning dialog

## Configuration

### Environment Settings

Edit `src/environments/environment.ts` (development):
```typescript
export const environment = {
  production: false,
  idleTimeoutMinutes: 30,  // Change timeout duration
  idleWarningMinutes: 2     // Change warning time
};
```

Edit `src/environments/environment.prod.ts` (production):
```typescript
export const environment = {
  production: true,
  idleTimeoutMinutes: 30,   // Recommended: 15-30 minutes
  idleWarningMinutes: 2     // Recommended: 1-5 minutes
};
```

### Recommended Settings by Use Case

**High Security Environment** (Banking, Healthcare):
```typescript
idleTimeoutMinutes: 15,  // 15 minutes
idleWarningMinutes: 2    // 2 minutes warning
```

**Normal Security** (General Applications):
```typescript
idleTimeoutMinutes: 30,  // 30 minutes
idleWarningMinutes: 2    // 2 minutes warning
```

**Low Security / Convenience** (Internal Tools):
```typescript
idleTimeoutMinutes: 60,  // 1 hour
idleWarningMinutes: 5    // 5 minutes warning
```

## How It Works

### 1. Login
When user logs in or registers:
- Idle monitoring starts automatically
- Timer begins tracking user activity

### 2. Active Session
While user is active:
- Every interaction resets the idle timer
- API calls reset the idle timer
- User can work indefinitely as long as they're active

### 3. Inactive Period
After configured idle time:
- Warning dialog appears (e.g., 2 minutes before logout)
- User can choose to stay logged in or logout

### 4. Timeout Reached
If warning is ignored:
- User automatically logged out
- Redirected to login page
- Session data cleared

### 5. Logout
On manual logout:
- Idle monitoring stops
- Session data cleared

## Technical Implementation

### Key Files

1. **`src/app/services/idle-timeout.service.ts`**
   - Core idle timeout logic
   - Activity monitoring
   - Timer management

2. **`src/app/app.component.ts`**
   - Initializes idle monitoring on app start
   - Manages monitoring lifecycle

3. **`src/app/services/login-service.ts`**
   - Tracks login state
   - Signals when to start/stop monitoring

4. **`src/app/services/auth.interceptor.ts`**
   - Resets idle timer on API calls
   - Ensures continuous session during active API usage

### Activity Events Monitored
```typescript
const ACTIVITY_EVENTS = [
  'mousedown',   // Click events
  'mousemove',   // Mouse movement
  'keypress',    // Keyboard input
  'scroll',      // Page scrolling
  'touchstart',  // Mobile touch
  'click'        // Click events
];
```

## User Experience Flow

### Example: 30-minute timeout with 2-minute warning

```
Login
  ↓
User works actively (timer resets continuously)
  ↓
User stops activity at 12:00 PM
  ↓
28 minutes pass (12:28 PM)
  ↓
Warning dialog appears: "You will be logged out in 2 minutes"
  ↓
User clicks "Stay Logged In" → Timer resets, continues working
  OR
User ignores warning → Automatic logout at 12:30 PM
```

## Testing

### Manual Testing

1. **Test Activity Monitoring**:
   ```javascript
   // In browser console
   // Check if monitoring is active
   console.log('Idle timeout active:', 
     document.querySelector('app-root').__ngContext__[8].idleTimeoutService.isWatching());
   ```

2. **Test Warning Dialog**:
   - Login to the application
   - Don't interact for (timeout - warning) minutes
   - Warning dialog should appear

3. **Test Automatic Logout**:
   - Ignore the warning dialog
   - Wait for warning period to expire
   - Should be logged out and redirected

4. **Test Activity Reset**:
   - Wait for warning to appear
   - Move mouse or press a key
   - Timer should reset (can check console logs)

### Adjusting Timeout for Testing

For quick testing, temporarily change in `environment.ts`:
```typescript
export const environment = {
  production: false,
  idleTimeoutMinutes: 1,    // 1 minute timeout
  idleWarningMinutes: 0.25  // 15 seconds warning
};
```

Don't forget to rebuild after changing:
```bash
npm run build
```

## Security Benefits

1. **Prevents Unauthorized Access**
   - Unattended terminals automatically log out
   - Reduces risk of session hijacking

2. **Compliance**
   - Meets security requirements for:
     - HIPAA (Healthcare)
     - PCI-DSS (Payment cards)
     - SOC 2 (Security audits)
     - GDPR (Data protection)

3. **Session Management**
   - Works in conjunction with JWT token expiration
   - Two-layer protection:
     - Frontend: Idle timeout (30 min default)
     - Backend: JWT expiration (24 hours)

4. **User Awareness**
   - Warning dialog alerts users
   - Prevents unexpected data loss
   - Users can save work before timeout

## Troubleshooting

### Issue: Users complain about being logged out too quickly
**Solution**: Increase `idleTimeoutMinutes` in environment files

### Issue: Warning dialog not appearing
**Check**:
1. Idle monitoring started? (Check console logs)
2. Environment configuration correct?
3. Browser console for errors?

### Issue: Timer not resetting on activity
**Check**:
1. Event listeners attached? (Check console: "Idle timeout monitoring started")
2. Browser DevTools → Console → Look for activity logs

### Issue: Logout happens without warning
**Possible causes**:
1. `idleWarningMinutes` set too low
2. Warning dialog dismissed by user
3. Browser blocking dialogs

## Disabling Idle Timeout

To disable idle timeout (not recommended for production):

1. Set very high timeout value:
   ```typescript
   idleTimeoutMinutes: 480,  // 8 hours
   ```

2. Or comment out monitoring start in `app.component.ts`:
   ```typescript
   // this.idleTimeoutService.startWatching();
   ```

## Browser Compatibility

Tested and working on:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

Potential improvements:
1. **Visual countdown timer** instead of dialog
2. **Configurable per user role** (admins get longer timeout)
3. **Remember user preference** ("Don't warn me again for 24 hours")
4. **Activity dashboard** showing active sessions
5. **Server-side session tracking** (backup for client-side timeout)

## Best Practices

1. **Balance security and usability**:
   - Too short: Frustrates users
   - Too long: Security risk
   - Recommended: 15-30 minutes

2. **Warn users appropriately**:
   - Warning time should be long enough to save work
   - 2-5 minutes recommended

3. **Test with actual users**:
   - Monitor logout frequency
   - Gather feedback
   - Adjust settings accordingly

4. **Document for users**:
   - Inform users about idle timeout in:
     - Login page
     - Help documentation
     - First-time user tutorial

## Related Security Features

The idle timeout works alongside:
- **JWT Token Expiration** (24 hours)
- **HTTPS encryption** (in production)
- **Password hashing** (bcrypt)
- **Role-based access control** (admin routes)
- **HTTP Interceptor** (automatic token management)

See [SECURITY.md](SECURITY.md) for comprehensive security documentation.
