import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminUserService } from './admin-user.service';

describe('AdminUserService', () => {
  let service: AdminUserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(AdminUserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('reopenQuiz() POSTs to /api/admin/user/:userId/reopen-quiz/:quizId with an empty body', () => {
    const response = { message: 'Quiz reopened successfully', userId: 'u1', quizId: 5, reopenedQuizIds: [5] };

    service.reopenQuiz('u1', 5).subscribe(result => {
      expect(result).toEqual(response);
    });

    const req = httpMock.expectOne('/api/admin/user/u1/reopen-quiz/5');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(response);
  });

  it('reopenQuiz() surfaces the backend error message when the quiz was never taken', (done) => {
    service.reopenQuiz('u1', 99).subscribe({
      next: () => fail('expected an error'),
      error: (message: string) => {
        expect(message).toBe('This user has no completed attempt for that quiz to reopen');
        done();
      }
    });

    const req = httpMock.expectOne('/api/admin/user/u1/reopen-quiz/99');
    req.flush(
      { error: { code: 'QUIZ_NOT_TAKEN', message: 'This user has no completed attempt for that quiz to reopen' } },
      { status: 404, statusText: 'Not Found' }
    );
  });
});
