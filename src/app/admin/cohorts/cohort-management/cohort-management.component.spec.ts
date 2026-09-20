import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CohortManagementComponent } from './cohort-management.component';
import { AdminCohortService } from '@admin/services/admin-cohort.service';
import { LoggerService } from '@core/services/logger.service';
import { Cohort } from '@models/cohort';

describe('CohortManagementComponent', () => {
  let component: CohortManagementComponent;
  let fixture: ComponentFixture<CohortManagementComponent>;
  let adminCohortServiceSpy: jasmine.SpyObj<AdminCohortService>;
  let loggerSpy: jasmine.SpyObj<LoggerService>;

  const now = new Date('2026-09-20T00:00:00.000Z');

  const makeCohort = (overrides: Partial<Cohort> = {}): Cohort => ({
    id: 'c1',
    name: 'Fall Cohort',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-12-01T00:00:00.000Z',
    students: [{ id: 'u1', uname: 'stu1', fname: 'Test', lname: 'User' }],
    quizzes: [{ id: 5, title: 'Fiqh Basics' }],
    ...overrides
  });

  beforeEach(async () => {
    adminCohortServiceSpy = jasmine.createSpyObj('AdminCohortService', [
      'getAllCohorts', 'deleteCohort'
    ]);
    loggerSpy = jasmine.createSpyObj('LoggerService', ['info', 'error', 'warn']);

    adminCohortServiceSpy.getAllCohorts.and.returnValue(of([makeCohort()]));

    await TestBed.configureTestingModule({
      declarations: [ CohortManagementComponent ],
      providers: [
        { provide: AdminCohortService, useValue: adminCohortServiceSpy },
        { provide: LoggerService, useValue: loggerSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(now);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  function createComponent() {
    fixture = TestBed.createComponent(CohortManagementComponent);
    component = fixture.componentInstance;
  }

  it('should create', () => {
    createComponent();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('loadCohorts', () => {
    it('populates cohorts and clears loading on success', () => {
      createComponent();
      fixture.detectChanges();

      expect(adminCohortServiceSpy.getAllCohorts).toHaveBeenCalled();
      expect(component.cohorts.length).toBe(1);
      expect(component.loading).toBeFalse();
    });

    it('shows an error message and clears loading on failure', () => {
      adminCohortServiceSpy.getAllCohorts.and.returnValue(throwError(() => 'Boom'));
      createComponent();
      fixture.detectChanges();

      expect(component.loading).toBeFalse();
      expect(component.message).toBe('Failed to load cohorts');
      expect(component.messageType).toBe('error');
      expect(loggerSpy.error).toHaveBeenCalled();
    });
  });

  describe('dashboard getters', () => {
    beforeEach(() => {
      createComponent();
    });

    it('totalCohorts reflects the number of loaded cohorts', () => {
      component.cohorts = [makeCohort({ id: 'a' }), makeCohort({ id: 'b' })];
      expect(component.totalCohorts).toBe(2);
    });

    it('activeCohorts counts only cohorts whose date range spans now', () => {
      component.cohorts = [
        makeCohort({ id: 'active', startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-12-01T00:00:00.000Z' }),
        makeCohort({ id: 'upcoming', startDate: '2027-01-01T00:00:00.000Z', endDate: '2027-06-01T00:00:00.000Z' }),
        makeCohort({ id: 'ended', startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-06-01T00:00:00.000Z' })
      ];
      expect(component.activeCohorts).toBe(1);
    });

    it('totalStudentEnrollments sums student counts across all cohorts', () => {
      component.cohorts = [
        makeCohort({ id: 'a', students: [{ id: 'u1', uname: 's1', fname: 'A', lname: 'B' }] }),
        makeCohort({ id: 'b', students: [
          { id: 'u2', uname: 's2', fname: 'C', lname: 'D' },
          { id: 'u3', uname: 's3', fname: 'E', lname: 'F' }
        ] })
      ];
      expect(component.totalStudentEnrollments).toBe(3);
    });
  });

  describe('cohortStatus / statusBadgeClass', () => {
    beforeEach(() => {
      createComponent();
    });

    it('returns upcoming for a cohort that has not started', () => {
      const cohort = makeCohort({ startDate: '2027-01-01T00:00:00.000Z', endDate: '2027-06-01T00:00:00.000Z' });
      expect(component.cohortStatus(cohort)).toBe('upcoming');
      expect(component.statusBadgeClass(cohort)).toBe('bg-info');
    });

    it('returns active for a cohort within its date range', () => {
      const cohort = makeCohort({ startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-12-01T00:00:00.000Z' });
      expect(component.cohortStatus(cohort)).toBe('active');
      expect(component.statusBadgeClass(cohort)).toBe('bg-success');
    });

    it('returns ended for a cohort whose end date has passed', () => {
      const cohort = makeCohort({ startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-06-01T00:00:00.000Z' });
      expect(component.cohortStatus(cohort)).toBe('ended');
      expect(component.statusBadgeClass(cohort)).toBe('bg-secondary');
    });
  });

  describe('formatDate', () => {
    beforeEach(() => {
      createComponent();
    });

    it('formats a date string as a readable short date', () => {
      expect(component.formatDate('2026-01-01T00:00:00.000Z')).toBe('Jan 1, 2026');
    });

    it('returns N/A for a falsy date', () => {
      expect(component.formatDate(null)).toBe('N/A');
    });
  });

  describe('delete flow', () => {
    beforeEach(() => {
      createComponent();
      fixture.detectChanges();
    });

    it('deleteCohort opens the confirm modal for the selected cohort', () => {
      const cohort = component.cohorts[0];
      component.deleteCohort(cohort);
      expect(component.showConfirmModal).toBeTrue();
      expect(component.confirmCohort).toBe(cohort);
    });

    it('closeConfirmModal resets the modal state', () => {
      component.deleteCohort(component.cohorts[0]);
      component.closeConfirmModal();
      expect(component.showConfirmModal).toBeFalse();
      expect(component.confirmCohort).toBeNull();
    });

    it('confirmDelete removes the cohort and shows a success message', () => {
      const cohort = component.cohorts[0];
      adminCohortServiceSpy.deleteCohort.and.returnValue(of({ message: 'Cohort deleted successfully' }));
      component.deleteCohort(cohort);

      component.confirmDelete();

      expect(adminCohortServiceSpy.deleteCohort).toHaveBeenCalledWith(cohort.id);
      expect(component.cohorts.find(c => c.id === cohort.id)).toBeUndefined();
      expect(component.message).toContain('deleted successfully');
      expect(component.messageType).toBe('success');
      expect(component.showConfirmModal).toBeFalse();
    });

    it('confirmDelete surfaces an error and keeps the cohort on failure', () => {
      const cohort = component.cohorts[0];
      adminCohortServiceSpy.deleteCohort.and.returnValue(throwError(() => 'Cohort not found'));
      component.deleteCohort(cohort);

      component.confirmDelete();

      expect(component.cohorts.find(c => c.id === cohort.id)).toBe(cohort);
      expect(component.messageType).toBe('error');
      expect(component.message).toContain('Cohort not found');
    });

    it('confirmDelete is a no-op when no cohort is selected', () => {
      component.confirmCohort = null;
      component.confirmDelete();
      expect(adminCohortServiceSpy.deleteCohort).not.toHaveBeenCalled();
    });
  });

  describe('message auto-dismiss', () => {
    it('clears the message after 5 seconds', fakeAsync(() => {
      createComponent();
      fixture.detectChanges();
      const cohort = component.cohorts[0];
      adminCohortServiceSpy.deleteCohort.and.returnValue(of({ message: 'Cohort deleted successfully' }));
      component.deleteCohort(cohort);
      component.confirmDelete();

      expect(component.message).not.toBe('');
      tick(5000);
      expect(component.message).toBe('');
      expect(component.messageType).toBe('');
    }));
  });
});
