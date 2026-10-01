import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User } from '@models/users';
import { AccountDeletionNotice } from '@models/account-deletion-notice';
import { LoggerService } from '@core/services/logger.service';

@Injectable({
  providedIn: 'root'
})
export class AdminUserService {

  constructor(private http: HttpClient, private logger: LoggerService) { }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/admin/users').pipe(
      catchError((error) => this.handleError(error))
    );
  }

  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`/api/admin/user/${userId}`).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  updateUser(user: User): Observable<User> {
    return this.http.put<User>(`/api/admin/user/${user.id}`, user).pipe(
      tap(response => this.logger.info('User updated', response)),
      catchError((error) => this.handleError(error))
    );
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`/api/admin/user/${userId}`).pipe(
      tap(() => this.logger.info('User deleted', { userId })),
      catchError((error) => this.handleError(error))
    );
  }

  updateUserType(userId: string, type: string): Observable<User> {
    return this.http.patch<User>(`/api/admin/user/${userId}/type`, { type }).pipe(
      tap(response => this.logger.info('User type updated', response)),
      catchError((error) => this.handleError(error))
    );
  }

  deleteUserQuizData(userId: string): Observable<any> {
    return this.http.delete(`/api/admin/user/${userId}/quizzes`).pipe(
      tap(() => this.logger.info('User quiz data deleted', { userId })),
      catchError((error) => this.handleError(error))
    );
  }

  deleteSpecificUserQuiz(userId: string, quizId: string): Observable<any> {
    return this.http.delete(`/api/admin/user/${userId}/quiz/${quizId}`).pipe(
      tap(() => this.logger.info('Specific quiz deleted from user', { userId, quizId })),
      catchError((error) => this.handleError(error))
    );
  }

  reopenQuiz(userId: string, quizId: number): Observable<any> {
    return this.http.post(`/api/admin/user/${userId}/reopen-quiz/${quizId}`, {}).pipe(
      tap(() => this.logger.info('Quiz reopened for user', { userId, quizId })),
      catchError((error) => this.handleError(error))
    );
  }

  // Revokes an outstanding reopen grant made in error (e.g. the wrong row
  // was clicked) before the student uses it — see reopenQuiz() above and
  // server/routes/adminUserRoutes.js's DELETE handler.
  revokeReopen(userId: string, quizId: number): Observable<any> {
    return this.http.delete(`/api/admin/user/${userId}/reopen-quiz/${quizId}`).pipe(
      tap(() => this.logger.info('Reopen grant revoked for user', { userId, quizId })),
      catchError((error) => this.handleError(error))
    );
  }

  // Archives a user — an idempotent housekeeping action distinct from
  // deleteUser()'s hard-delete: the account and its data are preserved, but
  // the server blocks that user from logging in (see POST
  // /api/admin/user/:id/archive and authRoutes.js's login handler).
  archiveUser(userId: string): Observable<any> {
    return this.http.post(`/api/admin/user/${userId}/archive`, {}).pipe(
      tap(() => this.logger.info('User archived', { userId })),
      catchError((error) => this.handleError(error))
    );
  }

  // Reverses archiveUser() — also idempotent server-side.
  unarchiveUser(userId: string): Observable<any> {
    return this.http.delete(`/api/admin/user/${userId}/archive`).pipe(
      tap(() => this.logger.info('User unarchived', { userId })),
      catchError((error) => this.handleError(error))
    );
  }

  // Account-deletion notices (see server/models/AccountDeletionNotice.js) —
  // created when a student in a real (non-guest) cohort deletes their own
  // account via DELETE /api/account. Defaults to unacknowledged-only, which
  // is what the dashboard banner needs.
  getAccountDeletionNotices(): Observable<AccountDeletionNotice[]> {
    return this.http.get<AccountDeletionNotice[]>('/api/admin/account-deletion-notices').pipe(
      catchError((error) => this.handleError(error))
    );
  }

  // Idempotent server-side: acknowledging an already-acknowledged notice is
  // a no-op that still returns 200, so this is safe to retry.
  acknowledgeAccountDeletionNotice(noticeId: string): Observable<any> {
    return this.http.post(`/api/admin/account-deletion-notices/${noticeId}/acknowledge`, {}).pipe(
      tap(() => this.logger.info('Account deletion notice acknowledged', { noticeId })),
      catchError((error) => this.handleError(error))
    );
  }

  // Server errors arrive as { error: { code, message, details? } } (see
  // server/utils/apiError.js), so `error.error?.error` is an object, not a
  // string — pull its `.message` out rather than surfacing "[object
  // Object]" to callers that display this directly (e.g. reopenQuiz()'s
  // "QUIZ_LOCKED"/"QUIZ_NOT_TAKEN" errors in user-management.component.ts).
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      const apiError = error.error?.error;
      errorMessage = (apiError && typeof apiError === 'object' ? apiError.message : apiError)
        || error.error?.message
        || error.message
        || 'Server error';
    }

    this.logger.error('Admin user service error', errorMessage);
    return throwError(() => errorMessage);
  }
}
