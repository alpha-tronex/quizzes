import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';

import { UserManagementComponent } from './user-management.component';
import { AdminUserService } from '@admin/services/admin-user.service';
import { LoginService } from '@core/services/login-service';
import { User } from '@models/users';
import { AccountDeletionNotice } from '@models/account-deletion-notice';

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

  describe('isLatestAttemptForQuiz()', () => {
    it('is true when the quiz has only one attempt', () => {
      const attempt = { id: 5, completedAt: '2026-01-01T00:00:00.000Z' };
      component.selectedUser = { id: 'u1', quizzes: [attempt] } as unknown as User;

      expect(component.isLatestAttemptForQuiz(attempt)).toBe(true);
    });

    it('is true only for the most recently completed attempt among duplicates', () => {
      // Mirrors "Hasan Test" reopened twice: three attempts, same quiz id.
      const first = { id: 5, title: 'Hasan Test', completedAt: '2026-01-01T00:00:00.000Z' };
      const second = { id: 5, title: 'Hasan Test', completedAt: '2026-02-01T00:00:00.000Z' };
      const third = { id: 5, title: 'Hasan Test', completedAt: '2026-03-01T00:00:00.000Z' };
      component.selectedUser = { id: 'u1', quizzes: [first, second, third] } as unknown as User;

      expect(component.isLatestAttemptForQuiz(first)).toBe(false);
      expect(component.isLatestAttemptForQuiz(second)).toBe(false);
      expect(component.isLatestAttemptForQuiz(third)).toBe(true);
    });

    it('treats attempts of different quizzes independently', () => {
      const quizA = { id: 5, completedAt: '2026-01-01T00:00:00.000Z' };
      const quizB = { id: 9, completedAt: '2026-01-15T00:00:00.000Z' };
      component.selectedUser = { id: 'u1', quizzes: [quizA, quizB] } as unknown as User;

      expect(component.isLatestAttemptForQuiz(quizA)).toBe(true);
      expect(component.isLatestAttemptForQuiz(quizB)).toBe(true);
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

  describe('reviewQuiz()', () => {
    it('sets the reviewed quiz and opens the review modal', () => {
      const quiz = { id: 5, title: 'Hasan Test' };

      component.reviewQuiz(quiz);

      expect(component.reviewedQuiz).toBe(quiz);
      expect(component.showReviewModal).toBe(true);
    });

    it('closeReviewModal() hides the review modal', () => {
      component.reviewQuiz({ id: 5, title: 'Hasan Test' });

      component.closeReviewModal();

      expect(component.showReviewModal).toBe(false);
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

  describe('archiveUser()', () => {
    it('does nothing if the user has no id', () => {
      spyOn(adminUserService, 'archiveUser');

      component.archiveUser({ uname: 'student1' } as unknown as User);

      expect(adminUserService.archiveUser).not.toHaveBeenCalled();
      expect(component.showConfirmModal).toBe(false);
    });

    it('does nothing if the user is already archived', () => {
      spyOn(adminUserService, 'archiveUser');

      component.archiveUser({ id: 'u1', uname: 'student1', archived: true } as unknown as User);

      expect(adminUserService.archiveUser).not.toHaveBeenCalled();
      expect(component.showConfirmModal).toBe(false);
    });

    it('shows an informational modal instead of confirming when archiving yourself', () => {
      const loginService = TestBed.inject(LoginService);
      loginService.user = { id: 'u1' } as unknown as User;
      spyOn(adminUserService, 'archiveUser');

      component.archiveUser({ id: 'u1', uname: 'student1' } as unknown as User);

      expect(adminUserService.archiveUser).not.toHaveBeenCalled();
      expect(component.confirmAction).toBeNull();
      expect(component.showConfirmModal).toBe(true);
    });

    it('opens the confirm modal without calling the service yet', () => {
      spyOn(adminUserService, 'archiveUser');

      component.archiveUser({ id: 'u1', uname: 'student1' } as unknown as User);

      expect(adminUserService.archiveUser).not.toHaveBeenCalled();
      expect(component.showConfirmModal).toBe(true);
      expect(component.confirmAction).toBe('archive');
      expect(component.confirmMessage).toContain('student1');
    });

    it('calls the service and marks the user archived once confirmed', () => {
      const user = { id: 'u1', uname: 'student1', archived: false } as unknown as User;
      component.selectedUser = user;
      component.users = [user];
      const archivedAt = '2026-09-29T00:00:00.000Z';
      spyOn(adminUserService, 'archiveUser').and.returnValue(of({
        message: 'User archived successfully', id: 'u1', archived: true, archivedAt
      }));

      component.archiveUser(user);
      component.confirmActionExecute();

      expect(adminUserService.archiveUser).toHaveBeenCalledWith('u1');
      expect(component.selectedUser!.archived).toBe(true);
      expect(component.selectedUser!.archivedAt).toBe(archivedAt as any);
      expect(component.users[0].archived).toBe(true);
      expect(component.archivingUserId).toBeNull();
      expect(component.showConfirmModal).toBe(false);
    });

    it('clears the pending state and alerts on error', () => {
      const user = { id: 'u1', uname: 'student1', archived: false } as unknown as User;
      component.selectedUser = user;
      spyOn(adminUserService, 'archiveUser').and.returnValue(throwError(() => 'Server error'));
      spyOn(window, 'alert');

      component.archiveUser(user);
      component.confirmActionExecute();

      expect(component.archivingUserId).toBeNull();
      expect(component.selectedUser!.archived).toBe(false);
      expect(window.alert).toHaveBeenCalledWith('Failed to archive user: Server error');
    });
  });

  describe('unarchiveUser()', () => {
    it('does nothing if the user has no id', () => {
      spyOn(adminUserService, 'unarchiveUser');

      component.unarchiveUser({ uname: 'student1', archived: true } as unknown as User);

      expect(adminUserService.unarchiveUser).not.toHaveBeenCalled();
      expect(component.showConfirmModal).toBe(false);
    });

    it('does nothing if the user is not currently archived', () => {
      spyOn(adminUserService, 'unarchiveUser');

      component.unarchiveUser({ id: 'u1', uname: 'student1', archived: false } as unknown as User);

      expect(adminUserService.unarchiveUser).not.toHaveBeenCalled();
      expect(component.showConfirmModal).toBe(false);
    });

    it('opens the confirm modal without calling the service yet', () => {
      spyOn(adminUserService, 'unarchiveUser');

      component.unarchiveUser({ id: 'u1', uname: 'student1', archived: true } as unknown as User);

      expect(adminUserService.unarchiveUser).not.toHaveBeenCalled();
      expect(component.showConfirmModal).toBe(true);
      expect(component.confirmAction).toBe('unarchive');
    });

    it('calls the service and marks the user unarchived once confirmed', () => {
      const user = { id: 'u1', uname: 'student1', archived: true, archivedAt: '2026-09-01T00:00:00.000Z' } as unknown as User;
      component.selectedUser = user;
      component.users = [user];
      spyOn(adminUserService, 'unarchiveUser').and.returnValue(of({
        message: 'User unarchived successfully', id: 'u1', archived: false, archivedAt: null
      }));

      component.unarchiveUser(user);
      component.confirmActionExecute();

      expect(adminUserService.unarchiveUser).toHaveBeenCalledWith('u1');
      expect(component.selectedUser!.archived).toBe(false);
      expect(component.selectedUser!.archivedAt).toBeNull();
      expect(component.users[0].archived).toBe(false);
      expect(component.archivingUserId).toBeNull();
      expect(component.showConfirmModal).toBe(false);
    });

    it('clears the pending state and alerts on error', () => {
      const user = { id: 'u1', uname: 'student1', archived: true } as unknown as User;
      component.selectedUser = user;
      spyOn(adminUserService, 'unarchiveUser').and.returnValue(throwError(() => 'Server error'));
      spyOn(window, 'alert');

      component.unarchiveUser(user);
      component.confirmActionExecute();

      expect(component.archivingUserId).toBeNull();
      expect(component.selectedUser!.archived).toBe(true);
      expect(window.alert).toHaveBeenCalledWith('Failed to unarchive user: Server error');
    });
  });

  describe('getUserDisplayName()', () => {
    it('appends [Archived] for an archived user', () => {
      const user = { uname: 'student1', fname: 'Ada', lname: 'Lovelace', archived: true } as unknown as User;

      expect(component.getUserDisplayName(user)).toBe('student1 (Ada Lovelace) [Archived]');
    });

    it('does not append [Archived] for a non-archived user', () => {
      const user = { uname: 'student1', fname: 'Ada', lname: 'Lovelace', archived: false } as unknown as User;

      expect(component.getUserDisplayName(user)).toBe('student1 (Ada Lovelace)');
    });
  });

  describe('refreshSelectedUser()', () => {
    it('does nothing when there is no selected user', () => {
      component.selectedUser = null;
      spyOn(adminUserService, 'getUserById');

      component.refreshSelectedUser();

      expect(adminUserService.getUserById).not.toHaveBeenCalled();
    });

    it('updates selectedUser and the matching entry in users on success', () => {
      const stale = { id: 'u1', uname: 'student1', reopenedQuizIds: [] } as unknown as User;
      const fresh = { id: 'u1', uname: 'student1', reopenedQuizIds: [5] } as unknown as User;
      component.selectedUser = stale;
      component.users = [stale];
      spyOn(adminUserService, 'getUserById').and.returnValue(of(fresh));

      component.refreshSelectedUser();

      expect(adminUserService.getUserById).toHaveBeenCalledWith('u1');
      expect(component.selectedUser).toBe(fresh);
      expect(component.users[0]).toBe(fresh);
    });

    it('discards the response if the admin switched to a different user while the request was in flight', () => {
      const userA = { id: 'u1', uname: 'student1' } as unknown as User;
      const userB = { id: 'u2', uname: 'student2' } as unknown as User;
      const freshA = { id: 'u1', uname: 'student1', reopenedQuizIds: [5] } as unknown as User;
      component.selectedUser = userA;
      component.users = [userA, userB];
      const pending = new Subject<User>();
      spyOn(adminUserService, 'getUserById').and.returnValue(pending.asObservable());

      component.refreshSelectedUser();
      component.selectedUser = userB; // admin switched users before the response arrived
      pending.next(freshA);

      expect(component.selectedUser).toBe(userB);
      expect(component.users[0]).toBe(userA);
    });

    it('logs the error and leaves selectedUser unchanged on failure', () => {
      const user = { id: 'u1', uname: 'student1' } as unknown as User;
      component.selectedUser = user;
      spyOn(adminUserService, 'getUserById').and.returnValue(throwError(() => 'Network error'));

      component.refreshSelectedUser();

      expect(component.selectedUser).toBe(user);
    });
  });

  describe('lifecycle: focus + poll refresh', () => {
    it('refreshes the selected user when the window regains focus', () => {
      spyOn(component, 'refreshSelectedUser');

      window.dispatchEvent(new Event('focus'));

      expect(component.refreshSelectedUser).toHaveBeenCalled();
    });

    it('polls refreshSelectedUser on an interval', fakeAsync(() => {
      // The outer `beforeEach` calls `fixture.detectChanges()` (and so
      // `ngOnInit`'s `setInterval`) outside of this `fakeAsync` zone, so
      // `tick()` below can't see or advance that real timer — it only
      // drives timers registered while a fakeAsync zone is active. Tear
      // down and re-run `ngOnInit` here so the interval is actually
      // registered inside the fake clock this test controls.
      component.ngOnDestroy();
      spyOn(component, 'refreshSelectedUser');
      component.ngOnInit();

      tick(component.refreshPollMs);
      expect(component.refreshSelectedUser).toHaveBeenCalledTimes(1);

      tick(component.refreshPollMs);
      expect(component.refreshSelectedUser).toHaveBeenCalledTimes(2);

      // Clear the interval ourselves so fakeAsync doesn't flag it as a
      // leftover periodic timer at the end of this test.
      component.ngOnDestroy();
    }));

    it('ngOnDestroy stops both the focus listener and the poll interval', fakeAsync(() => {
      spyOn(component, 'refreshSelectedUser');

      component.ngOnDestroy();
      window.dispatchEvent(new Event('focus'));
      tick(component.refreshPollMs);

      expect(component.refreshSelectedUser).not.toHaveBeenCalled();
    }));
  });

  // Regression tests for the same 1-based/0-based scoring bug fixed in
  // questions.component.ts: the admin review modal's getAnswerText()
  // subtracted 1 from answerNum, treating `selection`/`correct` as 1-based
  // positions when they are actually stored 0-based (matching Quiz.correct
  // in the DB). This made the review modal show wrong or 'N/A' answer text
  // for any answer at index 0, independent of the underlying scoring bug.
  describe('getAnswerText() (0-based, matching Quiz.correct)', () => {
    const question = {
      answers: ['True', 'False', 'Maybe']
    };

    it('indexes answers[] directly with no off-by-one', () => {
      expect(component.getAnswerText(question, 0)).toBe('True');
      expect(component.getAnswerText(question, 1)).toBe('False');
      expect(component.getAnswerText(question, 2)).toBe('Maybe');
    });

    it('resolves the correct text for an answer at index 0 (previously mishandled)', () => {
      expect(component.getAnswerText(question, 0)).toBe('True');
    });

    it('returns N/A for an out-of-range index', () => {
      expect(component.getAnswerText(question, -1)).toBe('N/A');
      expect(component.getAnswerText(question, 3)).toBe('N/A');
    });

    it('returns N/A when the question has no answers', () => {
      expect(component.getAnswerText({ answers: null }, 0)).toBe('N/A');
    });
  });

  describe('account deletion notices', () => {
    const sampleNotice: AccountDeletionNotice = {
      id: 'n1',
      studentUsername: 'hasan',
      studentFname: 'Hasan',
      studentLname: 'Test',
      cohortNames: ['Fall 2026'],
      quizzesTakenCount: 3,
      deletedAt: new Date('2026-09-30'),
      acknowledged: false,
      acknowledgedByUsername: null,
      acknowledgedAt: null
    };

    describe('loadDeletionNotices()', () => {
      it('populates deletionNotices on success', () => {
        spyOn(adminUserService, 'getAccountDeletionNotices').and.returnValue(of([sampleNotice]));

        component.loadDeletionNotices();

        expect(component.deletionNotices).toEqual([sampleNotice]);
      });

      it('logs and leaves the list empty on failure', () => {
        spyOn(adminUserService, 'getAccountDeletionNotices').and.returnValue(throwError(() => 'Server error'));

        component.loadDeletionNotices();

        expect(component.deletionNotices).toEqual([]);
      });
    });

    describe('acknowledgeNotice()', () => {
      it('calls the service and removes the notice from the list on success', () => {
        component.deletionNotices = [sampleNotice];
        spyOn(adminUserService, 'acknowledgeAccountDeletionNotice').and.returnValue(of({ message: 'ok' }));

        component.acknowledgeNotice(sampleNotice);

        expect(adminUserService.acknowledgeAccountDeletionNotice).toHaveBeenCalledWith('n1');
        expect(component.deletionNotices).toEqual([]);
        expect(component.acknowledgingNoticeId).toBeNull();
      });

      it('clears the pending state and alerts on failure, leaving the notice in the list', () => {
        component.deletionNotices = [sampleNotice];
        spyOn(adminUserService, 'acknowledgeAccountDeletionNotice').and.returnValue(throwError(() => 'Boom'));
        spyOn(window, 'alert');

        component.acknowledgeNotice(sampleNotice);

        expect(component.deletionNotices).toEqual([sampleNotice]);
        expect(component.acknowledgingNoticeId).toBeNull();
        expect(window.alert).toHaveBeenCalledWith('Failed to acknowledge notice: Boom');
      });
    });

    describe('noticeStudentLabel()', () => {
      it('includes the full name when present', () => {
        expect(component.noticeStudentLabel(sampleNotice)).toBe('hasan (Hasan Test)');
      });

      it('falls back to just the username when both name fields are blank', () => {
        expect(component.noticeStudentLabel({ ...sampleNotice, studentFname: '', studentLname: '' }))
          .toBe('hasan');
      });
    });
  });
});
