import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User } from '@models/users';
import { LoggerService } from '@core/services/logger.service';

/**
 * Every failed request that goes through `handleError` below rejects with
 * one of these instead of the raw HTTP error body, so components never need
 * to guess which of the backend's historical error shapes they got.
 * `details` is always a non-empty array of user-facing strings (falling back
 * to `[message]` when the backend didn't send a field-level breakdown), so
 * components can display `details` directly without their own shape checks.
 */
export interface NormalizedApiError {
  message: string;
  details: string[];
}

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  //loggedInStudentChange: Subject<User> = new Subject<User>();
  welcomePhrase: string = 'Welcome to ISRA learning. Please login or register to start taking quizzes!';
  user: User;
  http: HttpClient;
  loggedIn: boolean = false;

  constructor(http: HttpClient, private logger: LoggerService) {
    this.http = http;
    /*
    this.loggedInStudentChange.subscribe((student) => {
      this.loggedInStudent = student;
    });
    */
  }

  get userName(): string {
    if (!this.user) {
      return '';
    }
    return this.user.uname;
  }

  isAdmin(): boolean {
    return this.user && this.user.type === 'admin';
  }

  isStudent(): boolean {
    return this.user && this.user.type === 'student';
  }

  
  login(user: User): Observable<User> {
    return this.http.post<User>('/api/login', user).pipe(
      // retry(3),
      tap(response => {
        this.user = response;
        this.logger.info('Logged in', { username: this.user?.uname });
        // Store user with token in localStorage for access across components
        localStorage.setItem('currentUser', JSON.stringify(response));
        // Signal that user is logged in (app.component will start idle monitoring)
        this.loggedIn = true;
      }),
      catchError((error) => {
        this.logger.error('Error in login', error);
        return this.handleError(error);
      })
    );
  }

  register(user: User): Observable<User> {
    this.logger.debug('Register payload', user);
    return this.http.post<User>('/api/register', JSON.stringify(user),
    { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }).pipe(
      // retry(3),
      tap(response => {
        this.user = response;
        this.logger.info('Registered user', { username: this.user?.uname });
        // Store user with token in localStorage for access across components
        // Signal that user is logged in (app.component will start idle monitoring)
        this.loggedIn = true;
        localStorage.setItem('currentUser', JSON.stringify(response));
      }),
      catchError((error) => {
        this.logger.error('Error in register', error);
        return this.handleError(error);
      })
    );
  }

  updateUser(user: User): Observable<User> {
    return this.http.put<User>('/api/user/update', user).pipe(
      tap(response => {
        this.user = response;
        this.logger.info('User updated', { username: this.user?.uname });
        // Update localStorage with new user data (preserve token)
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
          const parsedUser = JSON.parse(currentUser);
          const updatedUser = { ...response, token: parsedUser.token };
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
      }),
      catchError((error) => {
        this.logger.error('Error in updateUser', error);
        return this.handleError(error);
      })
    );
  }

  logout(): void {
    this.user = null;
    this.loggedIn = false;
    this.welcomePhrase = 'You have been logged off. Please log back in to continue taking quizzes.';
    // Clear user from localStorage
    localStorage.removeItem('currentUser');
  }

  handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      this.logger.error('Client/network error', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.
      this.logger.error(
        `Backend returned code ${error.status}, body was: ${JSON.stringify(error.error)}`
      );
    }
    return throwError(this.normalizeError(error));
  }

  /**
   * Reduces every error shape the backend has ever sent down to one
   * consistent `NormalizedApiError`:
   *  - current: `{ error: { code, message, details? } }` (server/utils/apiError.js)
   *  - legacy: `{ error: 'some string' }`
   *  - legacy: `{ errors: ['some', 'strings'] }`
   *  - a network/client-side failure with no response body at all
   */
  private normalizeError(error: HttpErrorResponse): NormalizedApiError {
    if (error.error instanceof ErrorEvent) {
      const message = 'Unable to reach the server. Please check your connection and try again.';
      return { message, details: [message] };
    }

    const body = error.error;

    if (body && typeof body === 'object') {
      // Current unified shape.
      if (body.error && typeof body.error === 'object') {
        const message = typeof body.error.message === 'string' && body.error.message
          ? body.error.message
          : GENERIC_ERROR_MESSAGE;
        const details = Array.isArray(body.error.details) && body.error.details.length
          ? body.error.details
          : [message];
        return { message, details };
      }

      // Legacy `{ error: 'string' }`.
      if (typeof body.error === 'string' && body.error) {
        return { message: body.error, details: [body.error] };
      }

      // Legacy `{ errors: string[] }`.
      if (Array.isArray(body.errors) && body.errors.length) {
        return { message: body.errors[0], details: body.errors };
      }
    }

    if (typeof body === 'string' && body) {
      return { message: body, details: [body] };
    }

    return { message: GENERIC_ERROR_MESSAGE, details: [GENERIC_ERROR_MESSAGE] };
  }
}
