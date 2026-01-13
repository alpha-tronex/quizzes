import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Student } from '../classes/student';

@Injectable()
export class LoginService {
  loggedInStudentChange: Subject<Student> = new Subject<Student>();
  loggedInStudent: Student;
  http: HttpClient;

  constructor(http?: HttpClient) {
    this.http = http;
    this.loggedInStudentChange.subscribe((student) => {
      this.loggedInStudent = student;
    });
  }

  get userName(): string {
    if (!this.loggedInStudent) {
      return '';
    }
    return this.loggedInStudent.uname;
  }

  login(student): Observable<any> {
    return this.http.post<any>('/api/login', student).pipe(
      // retry(3),
      catchError(this.handleError)
    );
  }

  register(student): Observable<any> {
    console.log(student);
    return this.http.post<any>('/api/register', JSON.stringify(student),
    { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }).pipe(
      // retry(3),
      catchError(this.handleError)
    );
  }

  handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${JSON.stringify(error.error)}`);
    }
    // Propagate backend error body when available so components can show messages
    const backendError = error.error || 'Something bad happened; please try again later.';
    return throwError(backendError);
  }
}
