import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminBreadcrumbComponent } from '../admin-breadcrumb/admin-breadcrumb.component';
import { AdminMenuComponent } from '../admin-menu/admin-menu.component';
import { RouterTestingModule } from '@angular/router/testing';
import { AccountDeletionNotice } from '@models/account-deletion-notice';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let httpMock: HttpTestingController;

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        AdminDashboardComponent,
        AdminBreadcrumbComponent,
        AdminMenuComponent
      ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    // Only verifies requests this spec itself flushed below — the stats
    // calls (getAllUsers/getAvailableQuizzes) are left unflushed in tests
    // that don't care about them, matching UserManagementComponent's spec.
    httpMock.match(() => true).forEach((req) => {
      if (!req.cancelled) {
        req.flush([]);
      }
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('account deletion notices', () => {
    it('loads unacknowledged notices on init', () => {
      const req = httpMock.expectOne('/api/admin/account-deletion-notices');
      req.flush([sampleNotice]);

      expect(component.deletionNotices).toEqual([sampleNotice]);
    });

    it('logs and leaves the list empty on a load failure', () => {
      const req = httpMock.expectOne('/api/admin/account-deletion-notices');
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

      expect(component.deletionNotices).toEqual([]);
    });

    it('acknowledging a notice removes it from the list', () => {
      httpMock.expectOne('/api/admin/account-deletion-notices').flush([sampleNotice]);

      component.acknowledgeNotice(sampleNotice);
      const ackReq = httpMock.expectOne('/api/admin/account-deletion-notices/n1/acknowledge');
      expect(ackReq.request.method).toBe('POST');
      ackReq.flush({ message: 'Notice acknowledged', id: 'n1', acknowledged: true });

      expect(component.deletionNotices).toEqual([]);
      expect(component.acknowledgingNoticeId).toBeNull();
    });

    it('clears the pending state and alerts on an acknowledge failure', () => {
      httpMock.expectOne('/api/admin/account-deletion-notices').flush([sampleNotice]);
      spyOn(window, 'alert');

      component.acknowledgeNotice(sampleNotice);
      const ackReq = httpMock.expectOne('/api/admin/account-deletion-notices/n1/acknowledge');
      ackReq.flush('Boom', { status: 500, statusText: 'Internal Server Error' });

      expect(component.deletionNotices).toEqual([sampleNotice]);
      expect(component.acknowledgingNoticeId).toBeNull();
      expect(window.alert).toHaveBeenCalled();
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
