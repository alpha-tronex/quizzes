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
    });

    it('does nothing if the quiz is already reopened', () => {
      component.selectedUser = { id: 'u1', reopenedQuizIds: [5] } as unknown as User;
      spyOn(adminUserService, 'reopenQuiz');

      component.reopenQuiz({ id: 5 });

      expect(adminUserService.reopenQuiz).not.toHaveBeenCalled();
    });

    it('calls the service and adds the quiz id to reopenedQuizIds on success', () => {
      component.selectedUser = { id: 'u1', reopenedQuizIds: [] } as unknown as User;
      spyOn(adminUserService, 'reopenQuiz').and.returnValue(of({
        message: 'Quiz reopened successfully', userId: 'u1', quizId: 5, reopenedQuizIds: [5]
      }));

      component.reopenQuiz({ id: 5 });

      expect(adminUserService.reopenQuiz).toHaveBeenCalledWith('u1', 5);
      expect(component.selectedUser!.reopenedQuizIds).toEqual([5]);
      expect(component.reopeningQuizId).toBeNull();
    });

    it('clears the pending state and alerts on error', () => {
      component.selectedUser = { id: 'u1', reopenedQuizIds: [] } as unknown as User;
      spyOn(adminUserService, 'reopenQuiz').and.returnValue(throwError(() => 'This user has no completed attempt for that quiz to reopen'));
      spyOn(window, 'alert');

      component.reopenQuiz({ id: 5 });

      expect(component.reopeningQuizId).toBeNull();
      expect(component.selectedUser!.reopenedQuizIds).toEqual([]);
      expect(window.alert).toHaveBeenCalledWith('Failed to reopen quiz: This user has no completed attempt for that quiz to reopen');
    });
  });
});
