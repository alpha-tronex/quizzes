import { Component, OnInit } from '@angular/core';
import { AdminUserService } from '@admin/services/admin-user.service';
import { AdminQuizService } from '@admin/services/admin-quiz.service';
import { LoggerService } from '@core/services/logger.service';
import { AccountDeletionNotice } from '@models/account-deletion-notice';

@Component({
    selector: 'app-admin-dashboard',
    templateUrl: './admin-dashboard.component.html',
    styleUrls: ['./admin-dashboard.component.css'],
    standalone: false
})
export class AdminDashboardComponent implements OnInit {
  loading: boolean = true;
  totalUsers: number = 0;
  totalAdmins: number = 0;
  totalStudents: number = 0;
  totalQuizzes: number = 0;
  totalQuizAttempts: number = 0;

  // Unacknowledged "a cohort student deleted their own account" notices
  // (see AdminUserService.getAccountDeletionNotices) — shown as a
  // dismissible banner above the stats cards. Loaded independently of
  // loadDashboardStats() so a failure here doesn't block the rest of the
  // dashboard from rendering.
  deletionNotices: AccountDeletionNotice[] = [];
  // `notice.id` currently being acknowledged, so only that banner's button
  // shows a pending state — same pattern as UserManagementComponent's
  // archivingUserId.
  acknowledgingNoticeId: string | null = null;

  constructor(
    private adminUserService: AdminUserService,
    private adminQuizService: AdminQuizService,
    private logger: LoggerService
  ) { }

  ngOnInit() {
    this.loadDashboardStats();
    this.loadDeletionNotices();
  }

  loadDeletionNotices(): void {
    this.adminUserService.getAccountDeletionNotices().subscribe({
      next: (notices) => {
        this.deletionNotices = notices;
      },
      error: (error) => {
        this.logger.error('Error loading account deletion notices', error);
      }
    });
  }

  // Full name, falling back to the username alone when both name fields are
  // blank — mirrors UserManagementComponent.getUserDisplayName's rationale.
  noticeStudentLabel(notice: AccountDeletionNotice): string {
    const name = `${notice.studentFname || ''} ${notice.studentLname || ''}`.trim();
    return name ? `${notice.studentUsername} (${name})` : notice.studentUsername;
  }

  acknowledgeNotice(notice: AccountDeletionNotice): void {
    this.acknowledgingNoticeId = notice.id;

    this.adminUserService.acknowledgeAccountDeletionNotice(notice.id).subscribe({
      next: () => {
        // The banner only ever shows unacknowledged notices, so once one is
        // acknowledged it's simply removed from view rather than re-fetched.
        this.deletionNotices = this.deletionNotices.filter((n) => n.id !== notice.id);
        this.acknowledgingNoticeId = null;
      },
      error: (error) => {
        this.logger.error('Error acknowledging account deletion notice', error);
        alert('Failed to acknowledge notice: ' + error);
        this.acknowledgingNoticeId = null;
      }
    });
  }

  loadDashboardStats(): void {
    this.loading = true;
    
    // Load users
    this.adminUserService.getAllUsers().subscribe({
      next: (users) => {
        this.totalUsers = users.length;
        this.totalAdmins = users.filter(u => u.type === 'admin').length;
        this.totalStudents = users.filter(u => u.type !== 'admin').length;
        this.totalQuizAttempts = users.reduce((sum, user) => sum + (user.quizzes?.length || 0), 0);
        this.loading = false;
      },
      error: (error) => {
        this.logger.error('Error loading dashboard stats', error);
        this.loading = false;
      }
    });

    // Load quizzes
    this.adminQuizService.getAvailableQuizzes().subscribe({
      next: (quizzes) => {
        this.totalQuizzes = quizzes.length;
      },
      error: (error) => {
        this.logger.error('Error loading quizzes', error);
      }
    });
  }
}
