import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';

import { CohortFormComponent } from './cohort-form.component';
import { AdminCohortService } from '@admin/services/admin-cohort.service';
import { AdminUserService } from '@admin/services/admin-user.service';
import { AdminQuizService } from '@admin/services/admin-quiz.service';
import { LoggerService } from '@core/services/logger.service';
import { Cohort } from '@models/cohort';
import { User } from '@models/users';

describe('CohortFormComponent', () => {
  let component: CohortFormComponent;
  let fixture: ComponentFixture<CohortFormComponent>;
  let adminCohortServiceSpy: jasmine.SpyObj<AdminCohortService>;
  let adminUserServiceSpy: jasmine.SpyObj<AdminUserService>;
  let adminQuizServiceSpy: jasmine.SpyObj<AdminQuizService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let loggerSpy: jasmine.SpyObj<LoggerService>;
  let paramsSubject: Subject<any>;

  const students: Partial<User>[] = [
    { id: 'u1', uname: 'stu1', fname: 'Alice', lname: 'Adams', type: 'student' },
    { id: 'u2', uname: 'stu2', fname: 'Bob', lname: 'Baker', type: 'student' },
    { id: 'admin1', uname: 'admin', fname: 'Ada', lname: 'Min', type: 'admin' }
  ];

  const quizzes = [{ id: 1, title: 'Fiqh Basics' }, { id: 2, title: 'Seerah 101' }];

  const sampleCohort: Cohort = {
    id: 'c1',
    name: 'Fall Cohort',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-06-01T00:00:00.000Z',
    students: [{ id: 'u1', uname: 'stu1', fname: 'Alice', lname: 'Adams' }],
    quizzes: [{ id: 1, title: 'Fiqh Basics' }]
  };

  function configure(routeParams: any = {}) {
    paramsSubject = new Subject();

    adminCohortServiceSpy = jasmine.createSpyObj('AdminCohortService', [
      'getCohortById', 'createCohort', 'updateCohort'
    ]);
    adminUserServiceSpy = jasmine.createSpyObj('AdminUserService', ['getAllUsers']);
    adminQuizServiceSpy = jasmine.createSpyObj('AdminQuizService', ['getAvailableQuizzes']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    loggerSpy = jasmine.createSpyObj('LoggerService', ['info', 'error', 'warn']);

    adminUserServiceSpy.getAllUsers.and.returnValue(of(students as User[]));
    adminQuizServiceSpy.getAvailableQuizzes.and.returnValue(of(quizzes));

    TestBed.configureTestingModule({
      declarations: [ CohortFormComponent ],
      providers: [
        { provide: AdminCohortService, useValue: adminCohortServiceSpy },
        { provide: AdminUserService, useValue: adminUserServiceSpy },
        { provide: AdminQuizService, useValue: adminQuizServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: LoggerService, useValue: loggerSpy },
        { provide: ActivatedRoute, useValue: { params: paramsSubject.asObservable() } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CohortFormComponent);
    component = fixture.componentInstance;
  }

  describe('create mode', () => {
    beforeEach(() => {
      configure();
      fixture.detectChanges();
      paramsSubject.next({});
    });

    it('loads students (filtered to type student) and quizzes, and stays in create mode', () => {
      expect(component.isEditMode).toBeFalse();
      expect(component.students.map(s => s.id)).toEqual(['u1', 'u2']);
      expect(component.quizzes).toEqual(quizzes);
      expect(component.loading).toBeFalse();
      expect(adminCohortServiceSpy.getCohortById).not.toHaveBeenCalled();
    });

    it('surfaces an error when loading students/quizzes fails', () => {
      adminUserServiceSpy.getAllUsers.and.returnValue(throwError(() => 'Boom'));
      paramsSubject.next({});
      expect(component.errorMessage).toBe('Failed to load students and quizzes');
      expect(component.loading).toBeFalse();
    });

    it('filteredStudents narrows by name or username', () => {
      component.studentSearch = 'bob';
      expect(component.filteredStudents.map(s => s.id)).toEqual(['u2']);

      component.studentSearch = 'stu';
      expect(component.filteredStudents.map(s => s.id)).toEqual(['u1', 'u2']);
    });

    it('toggleStudent and toggleQuiz add/remove selections', () => {
      component.toggleStudent('u1');
      expect(component.isStudentSelected('u1')).toBeTrue();
      component.toggleStudent('u1');
      expect(component.isStudentSelected('u1')).toBeFalse();

      component.toggleQuiz(1);
      expect(component.isQuizSelected(1)).toBeTrue();
      component.toggleQuiz(1);
      expect(component.isQuizSelected(1)).toBeFalse();
    });

    describe('save validation', () => {
      it('requires a name', () => {
        component.name = '   ';
        component.startDate = '2026-01-01';
        component.endDate = '2026-06-01';
        component.save();
        expect(component.errorMessage).toBe('Please enter a cohort name');
        expect(adminCohortServiceSpy.createCohort).not.toHaveBeenCalled();
      });

      it('requires start and end dates', () => {
        component.name = 'Cohort';
        component.startDate = '';
        component.endDate = '';
        component.save();
        expect(component.errorMessage).toBe('Please select a start and end date');
      });

      it('requires end date to be after start date', () => {
        component.name = 'Cohort';
        component.startDate = '2026-06-01';
        component.endDate = '2026-01-01';
        component.save();
        expect(component.errorMessage).toBe('End date must be after start date');
      });
    });

    it('creates a cohort with the selected students/quizzes and navigates away', fakeAsync(() => {
      adminCohortServiceSpy.createCohort.and.returnValue(of(sampleCohort));
      component.name = 'Fall Cohort';
      component.startDate = '2026-01-01';
      component.endDate = '2026-06-01';
      component.toggleStudent('u1');
      component.toggleQuiz(1);

      component.save();

      expect(adminCohortServiceSpy.createCohort).toHaveBeenCalledWith({
        name: 'Fall Cohort',
        startDate: '2026-01-01',
        endDate: '2026-06-01',
        students: ['u1'],
        quizzes: [1]
      });
      expect(component.successMessage).toContain('created successfully');

      tick(1200);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/cohort-management']);
    }));

    it('surfaces a create error without navigating', () => {
      adminCohortServiceSpy.createCohort.and.returnValue(throwError(() => 'Validation failed: name is required'));
      component.name = 'Fall Cohort';
      component.startDate = '2026-01-01';
      component.endDate = '2026-06-01';

      component.save();

      expect(component.errorMessage).toBe('Validation failed: name is required');
      expect(component.isSubmitting).toBeFalse();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    beforeEach(() => {
      configure();
      fixture.detectChanges();
      adminCohortServiceSpy.getCohortById.and.returnValue(of(sampleCohort));
      paramsSubject.next({ id: 'c1' });
    });

    it('loads the cohort and pre-populates the form', () => {
      expect(component.isEditMode).toBeTrue();
      expect(adminCohortServiceSpy.getCohortById).toHaveBeenCalledWith('c1');
      expect(component.name).toBe('Fall Cohort');
      expect(component.startDate).toBe('2026-01-01');
      expect(component.endDate).toBe('2026-06-01');
      expect(component.isStudentSelected('u1')).toBeTrue();
      expect(component.isQuizSelected(1)).toBeTrue();
      expect(component.loading).toBeFalse();
    });

    it('updates the cohort on save', () => {
      adminCohortServiceSpy.updateCohort.and.returnValue(of(sampleCohort));
      component.name = 'Renamed Cohort';

      component.save();

      expect(adminCohortServiceSpy.updateCohort).toHaveBeenCalledWith('c1', jasmine.objectContaining({
        name: 'Renamed Cohort'
      }));
      expect(component.successMessage).toContain('updated successfully');
    });

    it('surfaces an error when loading the cohort fails', () => {
      adminCohortServiceSpy.getCohortById.and.returnValue(throwError(() => 'Cohort not found'));
      paramsSubject.next({ id: 'missing' });
      expect(component.errorMessage).toBe('Failed to load cohort');
      expect(component.loading).toBeFalse();
    });
  });
});
