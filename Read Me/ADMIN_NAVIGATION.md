# Admin Navigation System

## Overview
The admin section now has an improved navigation system with a dashboard, breadcrumb navigation, and a quick actions menu.

## Components

### 1. Admin Dashboard (`admin-dashboard/`)
The dashboard serves as the admin landing page and displays key statistics:
- **Total Users**: Count of all registered users
- **Total Admins**: Count of users with admin privileges
- **Total Students**: Count of regular student users
- **Total Quizzes**: Number of available quizzes in the system
- **Total Quiz Attempts**: Sum of all quiz attempts across all users

The dashboard also includes the breadcrumb navigation and quick actions menu for easy access to all admin functions.

**Route**: `/admin` (default route)

### 2. Admin Breadcrumb (`admin-breadcrumb/`)
Provides contextual navigation showing the current location within the admin section.

**Features**:
- Automatically updates based on current route
- Shows clickable links to parent pages
- Displays a home icon for the dashboard
- Uses a clean, readable design with Bootstrap styling

**Example breadcrumbs**:
- Admin Dashboard
- Admin Dashboard > User Management
- Admin Dashboard > User Details
- Admin Dashboard > Quiz Management

### 3. Admin Menu (`admin-menu/`)
A card-based quick actions menu that provides fast access to all admin functions.

**Menu Items**:
1. **User Management** (Primary) - View, edit, and manage user accounts,
   including changing type, granting quiz retakes, archiving/unarchiving
   (idempotent toggle that blocks/restores login without deleting data —
   see `Read Me/SECURITY.md`'s "Account Deletion & Archival" section), and
   hard-deleting an account. Also shows a dismissible banner above the
   stats cards for each unacknowledged account-deletion notice — created
   when a student in one of your real (non-guest) cohorts deletes their
   own account. Clicking "Acknowledge" just dismisses the banner; the
   deletion itself already happened and can't be undone.
2. **Create Quiz** (Success) - Create a new quiz from scratch
3. **Upload Quiz** (Info) - Upload a quiz from a JSON file
4. **Quiz Management** (Warning) - Delete quiz data and files
5. **Cohort Management** - Create/edit cohorts and manage which students and
   quizzes belong to each one (gates which quizzes a student can see; see
   `server/utils/cohortAccess.js`)

**Features**:
- Color-coded cards for visual distinction
- Hover effects with smooth animations
- Icon-based navigation for better UX
- Descriptive text for each section

## Integration

### Routes
All admin routes are defined in `admin-routing.module.ts`:
```typescript
const routes: Routes = [
  { path: '', component: AdminDashboardComponent },           // Dashboard (default)
  { path: 'user-management', component: UserManagementComponent },
  { path: 'user-details/:id', component: UserDetailsComponent },
  { path: 'create-quiz', component: CreateQuizComponent },
  { path: 'edit-quiz/:id', component: EditQuizComponent },
  { path: 'upload-quiz', component: UploadQuizComponent },
  { path: 'quiz-management', component: QuizManagementComponent },
  { path: 'cohort-management', component: CohortManagementComponent },
  { path: 'create-cohort', component: CohortFormComponent },
  { path: 'edit-cohort/:id', component: CohortFormComponent }
];
```

### Header Navigation
The main navigation header includes a new "Dashboard" link at the top of the Admin dropdown menu, separated by a divider for clarity.

### Breadcrumbs on All Pages
All admin pages now include the breadcrumb component at the top:
- User Management
- User Details
- Create Quiz
- Upload Quiz
- Quiz Management
- Cohort Management

## Usage

### For Administrators
1. Click "Admin" in the main navigation
2. Select "Dashboard" to view the overview
3. Use the quick actions cards or header dropdown to navigate to specific sections
4. The breadcrumb trail shows your current location and allows quick navigation back to parent pages

### For Developers
To add a new admin page:
1. Create the component in the appropriate folder (`users/` or `quizzes/`)
2. Add the route to `admin-routing.module.ts`
3. Declare the component in `admin.module.ts`
4. Add `<app-admin-breadcrumb></app-admin-breadcrumb>` at the top of the component's template
5. Add a menu item to `admin-menu.component.ts` if it should appear in quick actions
6. Update the breadcrumb route labels in `admin-breadcrumb.component.ts` if needed

## Styling

### Dashboard Stats Cards
- Hover effect: Cards lift slightly and show a shadow
- Icon animation: Icons scale up on hover
- Color coding: Each stat has a distinct Bootstrap color class

### Breadcrumb
- Light background with border
- Hover effect on links
- Custom separator (›) between items
- Active item is bold

### Admin Menu Cards
- Border color matches the card's theme
- Hover effect: Card lifts and shows shadow
- Icon scales up on hover
- Arrow in footer slides right on hover

## Statistics Calculation

The dashboard loads statistics in `loadDashboardStats()`:
```typescript
- totalUsers: Total count from AdminService.getAllUsers()
- totalAdmins: Filter users where type === 'admin'
- totalStudents: Filter users where type !== 'admin'
- totalQuizzes: Count from AdminService.getAvailableQuizzes()
- totalQuizAttempts: Reduce sum of all user.quizzes.length
```

## Future Enhancements

Potential improvements for the admin navigation system:
1. Add charts to visualize statistics (e.g., quiz completion rates)
2. Show recent activity feed on dashboard
3. Add search functionality to breadcrumbs for large admin sections
4. Include quick stats on each admin page
5. Add user role-based menu item filtering
6. Implement real-time statistics updates with WebSocket
