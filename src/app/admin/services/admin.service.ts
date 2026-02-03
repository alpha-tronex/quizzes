import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User } from '@models/users';

/**
 * @deprecated This service has been split into AdminUserService and AdminQuizService.
 * Please use those services instead:
 * - AdminUserService for user management operations
 * - AdminQuizService for quiz management operations
 * This service is kept for backwards compatibility but will be removed in a future version.
 */
@Injectable({
  providedIn: 'root'
})
export class AdminService {

  constructor(private http: HttpClient) { }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/admin/users').pipe(
      catchError(this.handleError)
    );
  }

  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`/api/admin/user/${userId}`).pipe(
      catchError(this.handleError)
    );
  }

  updateUser(user: User): Observable<User> {
    return this.http.put<User>(`/api/admin/user/${user.id}`, user).pipe(
      tap(response => console.log('User updated:', response)),
      catchError(this.handleError)
    );
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`/api/admin/user/${userId}`).pipe(
      tap(() => console.log('User deleted:', userId)),
      catchError(this.handleError)
    );
  }

  updateUserType(userId: string, type: string): Observable<User> {
    return this.http.patch<User>(`/api/admin/user/${userId}/type`, { type }).pipe(
      tap(response => console.log('User type updated:', response)),
      catchError(this.handleError)
    );
  }

  // Quiz Management Methods
  deleteUserQuizData(userId: string): Observable<any> {
    return this.http.delete(`/api/admin/user/${userId}/quizzes`).pipe(
      tap(() => console.log('User quiz data deleted:', userId)),
      catchError(this.handleError)
    );
  }

  deleteSpecificUserQuiz(userId: string, quizId: string): Observable<any> {
    return this.http.delete(`/api/admin/user/${userId}/quiz/${quizId}`).pipe(
      tap(() => console.log('Specific quiz deleted from user:', userId, quizId)),
      catchError(this.handleError)
    );
  }

  deleteAllUsersQuizData(): Observable<any> {
    return this.http.delete('/api/admin/quizzes/all-users-data').pipe(
      tap(() => console.log('All users quiz data deleted')),
      catchError(this.handleError)
    );
  }

  getAvailableQuizzes(): Observable<any[]> {
    return this.http.get<any[]>('/api/quizzes').pipe(
      catchError(this.handleError)
    );
  }

  deleteQuizFile(quizId: string): Observable<any> {
    return this.http.delete(`/api/admin/quiz-file/${quizId}`).pipe(
      tap(() => console.log('Quiz file deleted:', quizId)),
      catchError(this.handleError)
    );
  }

  deleteAllQuizFiles(): Observable<any> {
    return this.http.delete('/api/admin/quiz-files/all').pipe(
      tap(() => console.log('All quiz files deleted')),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.error || error.error?.message || error.message || 'Server error';
    }
    
    console.error('Admin service error:', errorMessage);
    return throwError(() => errorMessage);
  }
}
