import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AdminQuizService {

  constructor(private http: HttpClient) { }

  getAvailableQuizzes(): Observable<any[]> {
    return this.http.get<any[]>('/api/quizzes').pipe(
      catchError(this.handleError)
    );
  }

  uploadQuiz(quizData: any): Observable<any> {
    return this.http.post('/api/quiz/upload', quizData).pipe(
      tap(() => console.log('Quiz uploaded successfully')),
      catchError(this.handleError)
    );
  }

  deleteAllUsersQuizData(): Observable<any> {
    return this.http.delete('/api/admin/quizzes/all-users-data').pipe(
      tap(() => console.log('All users quiz data deleted')),
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
    
    console.error('Admin quiz service error:', errorMessage);
    return throwError(() => errorMessage);
  }
}
