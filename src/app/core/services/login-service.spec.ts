import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { LoginService, NormalizedApiError } from './login-service';
import type { User } from '@models/users';

describe('LoginService', () => {
  let service: LoginService;
  let httpMock: HttpTestingController;

  const credentials = { uname: 'admin', pass: 'wrong-password' } as unknown as User;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(LoginService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /**
   * These four cases cover every error shape the backend has ever sent from
   * /api/login and /api/register (see server/middleware/errorHandler.js and
   * its predecessor). Components rely on LoginService to collapse all of
   * them into one NormalizedApiError so they never have to guess the shape
   * themselves.
   */

  it('normalizes the current unified shape { error: { code, message } }', () => {
    let captured: NormalizedApiError;
    service.login(credentials).subscribe({ error: (err) => (captured = err) });

    httpMock.expectOne('/api/login').flush(
      { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(captured!.message).toBe('Invalid username or password');
    expect(captured!.details).toEqual(['Invalid username or password']);
  });

  it('surfaces a field-level details array from the current unified shape', () => {
    let captured: NormalizedApiError;
    service.login(credentials).subscribe({ error: (err) => (captured = err) });

    httpMock.expectOne('/api/login').flush(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: ['Username is required', 'Password must be at least 8 characters']
        }
      },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(captured!.message).toBe('Validation failed');
    expect(captured!.details).toEqual(['Username is required', 'Password must be at least 8 characters']);
  });

  it('normalizes the legacy { error: "string" } shape', () => {
    let captured: NormalizedApiError;
    service.login(credentials).subscribe({ error: (err) => (captured = err) });

    httpMock.expectOne('/api/login').flush(
      { error: 'Invalid credentials' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(captured!.message).toBe('Invalid credentials');
    expect(captured!.details).toEqual(['Invalid credentials']);
  });

  it('normalizes the legacy { errors: string[] } shape', () => {
    let captured: NormalizedApiError;
    service.login(credentials).subscribe({ error: (err) => (captured = err) });

    httpMock.expectOne('/api/login').flush(
      { errors: ['Username or email already in use'] },
      { status: 409, statusText: 'Conflict' }
    );

    expect(captured!.message).toBe('Username or email already in use');
    expect(captured!.details).toEqual(['Username or email already in use']);
  });

  it('falls back to a generic message on a client-side/network error', () => {
    let captured: NormalizedApiError;
    service.login(credentials).subscribe({ error: (err) => (captured = err) });

    httpMock.expectOne('/api/login').error(new ProgressEvent('error') as unknown as ErrorEvent);

    expect(captured!.details.length).toBeGreaterThan(0);
    expect(captured!.message).toBeTruthy();
  });

  it('falls back to a generic message when the response body is empty', () => {
    let captured: NormalizedApiError;
    service.login(credentials).subscribe({ error: (err) => (captured = err) });

    httpMock.expectOne('/api/login').flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(captured!.details).toEqual(['Something went wrong. Please try again.']);
  });
});
