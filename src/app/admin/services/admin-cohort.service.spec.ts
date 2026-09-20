import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminCohortService } from './admin-cohort.service';
import { Cohort, CohortPayload } from '@models/cohort';

describe('AdminCohortService', () => {
  let service: AdminCohortService;
  let httpMock: HttpTestingController;

  const sampleCohort: Cohort = {
    id: 'c1',
    name: 'Fall Cohort',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-06-01T00:00:00.000Z',
    students: [{ id: 'u1', uname: 'stu1', fname: 'Test', lname: 'User' }],
    quizzes: [{ id: 5, title: 'Fiqh Basics' }]
  };

  const samplePayload: CohortPayload = {
    name: 'Fall Cohort',
    startDate: '2026-01-01',
    endDate: '2026-06-01',
    students: ['u1'],
    quizzes: [5]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(AdminCohortService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAllCohorts() GETs /api/admin/cohorts and returns the list', () => {
    service.getAllCohorts().subscribe(cohorts => {
      expect(cohorts).toEqual([sampleCohort]);
    });

    const req = httpMock.expectOne('/api/admin/cohorts');
    expect(req.request.method).toBe('GET');
    req.flush([sampleCohort]);
  });

  it('getCohortById() GETs /api/admin/cohorts/:id', () => {
    service.getCohortById('c1').subscribe(cohort => {
      expect(cohort).toEqual(sampleCohort);
    });

    const req = httpMock.expectOne('/api/admin/cohorts/c1');
    expect(req.request.method).toBe('GET');
    req.flush(sampleCohort);
  });

  it('createCohort() POSTs the payload to /api/admin/cohorts', () => {
    service.createCohort(samplePayload).subscribe(cohort => {
      expect(cohort).toEqual(sampleCohort);
    });

    const req = httpMock.expectOne('/api/admin/cohorts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(samplePayload);
    req.flush(sampleCohort);
  });

  it('updateCohort() PUTs a partial payload to /api/admin/cohorts/:id', () => {
    const partial = { name: 'Renamed' };
    service.updateCohort('c1', partial).subscribe(cohort => {
      expect(cohort).toEqual(sampleCohort);
    });

    const req = httpMock.expectOne('/api/admin/cohorts/c1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(partial);
    req.flush(sampleCohort);
  });

  it('deleteCohort() DELETEs /api/admin/cohorts/:id', () => {
    service.deleteCohort('c1').subscribe(response => {
      expect(response).toEqual({ message: 'Cohort deleted successfully' });
    });

    const req = httpMock.expectOne('/api/admin/cohorts/c1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Cohort deleted successfully' });
  });

  it('surfaces the backend { code, message, details } error shape as a readable string', (done) => {
    service.createCohort(samplePayload).subscribe({
      next: () => fail('expected an error'),
      error: (message: string) => {
        expect(message).toBe('Validation failed: name is required, endDate must be after startDate');
        done();
      }
    });

    const req = httpMock.expectOne('/api/admin/cohorts');
    req.flush(
      { error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: ['name is required', 'endDate must be after startDate'] } },
      { status: 400, statusText: 'Bad Request' }
    );
  });

  it('falls back to a generic message when the error body has no details', (done) => {
    service.deleteCohort('missing').subscribe({
      next: () => fail('expected an error'),
      error: (message: string) => {
        expect(message).toBe('Cohort not found');
        done();
      }
    });

    const req = httpMock.expectOne('/api/admin/cohorts/missing');
    req.flush(
      { error: { code: 'COHORT_NOT_FOUND', message: 'Cohort not found' } },
      { status: 404, statusText: 'Not Found' }
    );
  });
});
