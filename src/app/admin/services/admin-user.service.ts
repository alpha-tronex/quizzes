import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User } from '@models/users';
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
