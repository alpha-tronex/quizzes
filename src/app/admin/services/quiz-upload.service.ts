import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class QuizUploadService {

  constructor(private http: HttpClient) { }

  uploadQuiz(quizData: any): Observable<any> {
    return this.http.post('/api/quiz/upload', quizData).pipe(
      tap(response => console.log('Quiz uploaded:', response)),
      catchError(this.handleError)
    );
  }

  getQuizList(): Observable<any[]> {
    return this.http.get<any[]>('/api/quiz/list').pipe(
      catchError(this.handleError)
    );
  }

  deleteQuiz(quizId: number): Observable<any> {
    return this.http.delete(`/api/quiz/delete/${quizId}`).pipe(
      tap(() => console.log('Quiz deleted:', quizId)),
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
    
    console.error('Quiz upload service error:', errorMessage);
    return throwError(() => errorMessage);
  }
}
