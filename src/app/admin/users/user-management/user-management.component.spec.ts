import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { UserManagementComponent } from './user-management.component';
import { AdminUserService } from '@admin/services/admin-user.service';
import { User } from '@models/users';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let adminUserService: AdminUserService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [ UserManagementComponent ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    adminUserService = TestBed.inject(AdminUserService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isQuizReopened()', () => {
    it('is false when the user has no reopenedQuizIds', () => {
      component.selectedUser = { id: 'u1', reopenedQuizIds: [] } as unknown as User;

      expect(component.isQuizReopened({ id: 5 })).toBe(false);
    });

    it('is true when the quiz id is present in reopenedQuizIds', () => {
      component.selectedUser = { id: 'u1', reopenedQuizIds: [5] } as unknown as User;

      expect(component.isQuizReopened({ id: 5 })).toBe(true);
    });
  });

  describe('reopenQuiz()', () => {
    it('does nothing if there is no selected user', () => {
      component.selectedUser = null;
      spyOn(adminUserService, 'reopenQuiz');

      component.reopenQuiz({ id: 5 });

      expect(adminUserService.reopenQuiz).not.toHaveBeenCalled();
      expect(component.showConfirmModal).toBe(false);
    });

    it('does nothing if the quiz is already reopened', () => {
      component.selectedUser = { id: 'u1', reopenedQuizIds: [5] } as unknown as User;
      spyOn(adminUserService, 'reopenQuiz');

      component.reopenQuiz({ id: 5 });

      expect(adminUserService.reopenQuiz).not.toHaveBeenCalled();
      expect(component.showConfirmModal).toBe(false);
    });

    it('opens the confirm modal without calling the service yet', () => {
      component.selectedUser = { id: 'u1', uname: 'student1', reopenedQuizIds: [] } as unknown as User;
      spyOn(adminUserService, 'reopenQuiz');

      component.reopenQuiz({ id: 5, title: 'Hasan Test' });

      expect(adminUserService.reopenQuiz).not.toHaveBeenCalled();
      expect(component.showConfirmModal).toBe(true);
      expect(component.confirmAction).toBe('reopen-quiz');
      expect(component.confirmMessage).toContain('Hasan Test');
    });

    it('calls the service and adds the quiz id to reopenedQuizIds once confirmed', () => {
      component.selectedUser = { id: 'u1', uname: 'student1', reopenedQuizIds: [] } as unknown as User;
      spyOn(adminUserService, 'reopenQuiz').and.returnValue(of({
        message: 'Quiz reopened successfully', userId: 'u1', quizId: 5, reopenedQuizIds: [5]
      }));

      component.reopenQuiz({ id: 5, title: 'Hasan Test' });
      component.confirmActionExecute();

      expect(adminUserService.reopenQuiz).toHaveBeenCalledWith('u1', 5);
      expect(component.selectedUser!.reopenedQuizIds).toEqual([5]);
      expect(component.reopeningQuizId).toBeNull();
      expect(component.showConfirmModal).toBe(false);
    });

    it('clears the pending state and alerts on error', () => {
      component.selectedUser = { id: 'u1', uname: 'student1', reopenedQuizIds: [] } as unknown as User;
      spyOn(adminUserService, 'reopenQuiz').and.returnValue(throwError(() => 'This user has no completed attempt for that quiz to reopen'));
      spyOn(window, 'alert');

      component.reopenQuiz({ id: 5, title: 'Hasan Test' });
      component.confirmActionExecute();

      expect(component.reopeningQuizId).toBeNull();
      expect(component.selectedUser!.reopenedQuizIds).toEqual([]);
      expect(window.alert).toHaveBeenCalledWith('Failed to reopen quiz: This user has no completed attempt for that quiz to reopen');
    });
  });

  describe('revokeReopen()', () => {
    it('does nothing if there is no selected user', () => {
      component.selectedUser = null;
      spyOn(adminUserService, 'revokeReopen');

      component.revokeReopen({ id: 5 });

      expect(adminUserService.revokeReopen).not.toHaveBeenCalled();
      expect(component.showConfirmModal).toBe(false);
    });

    it('does nothing if the quiz is not currently reopened', () => {
      component.selectedUser = { id: 'u1', reopenedQuizIds: [] } as unknown as User;
      spyOn(adminUserService, 'revokeReopen');

      component.revokeReopen({ id: 5 });

      expect(adminUserService.revokeReopen).not.toHaveBeenCalled();
      expect(component.showConfirmModal).toBe(false);
    });

    it('opens the confirm modal without calling the service yet', () => {
      component.selectedUser = { id: 'u1', uname: 'student1', reopenedQuizIds: [5] } as unknown as User;
      spyOn(adminUserService, 'revokeReopen');

      component.revokeReopen({ id: 5, title: 'Hasan Test' });

      expect(adminUserService.revokeReopen).not.toHaveBeenCalled();
      expect(component.showConfirmModal).toBe(true);
      expect(component.confirmAction).toBe('revoke-reopen');
    });

    it('calls the service and removes the quiz id from reopenedQuizIds once confirmed', () => {
      component.selectedUser = { id: 'u1', uname: 'student1', reopenedQuizIds: [2, 5] } as unknown as User;
      spyOn(adminUserService, 'revokeReopen').and.returnValue(of({
        message: 'Reopen grant revoked successfully', userId: 'u1', quizId: 5, reopenedQuizIds: [2]
      }));

      component.revokeReopen({ id: 5, title: 'Hasan Test' });
      component.confirmActionExecute();

      expect(adminUserService.revokeReopen).toHaveBeenCalledWith('u1', 5);
      expect(component.selectedUser!.reopenedQuizIds).toEqual([2]);
      expect(component.revokingQuizId).toBeNull();
      expect(component.showConfirmModal).toBe(false);
    });

    it('clears the pending state and alerts on error', () => {
      component.selectedUser = { id: 'u1', uname: 'student1', reopenedQuizIds: [5] } as unknown as User;
      spyOn(adminUserService, 'revokeReopen').and.returnValue(throwError(() => 'User not found'));
      spyOn(window, 'alert');

      component.revokeReopen({ id: 5, title: 'Hasan Test' });
      component.confirmActionExecute();

      expect(component.revokingQuizId).toBeNull();
      expect(component.selectedUser!.reopenedQuizIds).toEqual([5]);
      expect(window.alert).toHaveBeenCalledWith('Failed to cancel reopen: User not found');
    });
  });
});
