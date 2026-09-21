import { Component, OnInit } from '@angular/core';
import { User } from '@models/users';
import { AdminUserService } from '@admin/services/admin-user.service';
import { LoginService } from '@core/services/login-service';
import { LoggerService } from '@core/services/logger.service';

@Component({
    selector: 'app-user-management',
    templateUrl: './user-management.component.html',
    styleUrls: ['./user-management.component.css'],
    standalone: false
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  selectedUser: User | null = null;
  loading: boolean = false;
  errorMessage: string = '';
  reviewedQuiz: any = null;
  // `quiz.id` currently being reopened/revoked, so only that row's button
  // shows a pending state — see executeReopenQuiz()/executeRevokeReopen().
  reopeningQuizId: number | null = null;
  revokingQuizId: number | null = null;
  private modalInstance: any = null;
  // private confirmModalInstance: any = null;
    showConfirmModal: boolean = false;
  confirmAction: 'promote' | 'delete' | 'reopen-quiz' | 'revoke-reopen' | null = null;
  confirmUser: User | null = null;
  // Set alongside confirmUser when confirmAction is 'reopen-quiz' or
  // 'revoke-reopen' — the confirm modal only carries one payload object, so
  // these two actions need the target quiz as well as the target user.
  confirmQuiz: any = null;
  confirmMessage: string = '';
  confirmTitle: string = '';

  // Dashboard statistics
  get totalUsers(): number {
    return this.users.length;
  }

  get totalAdmins(): number {
    return this.users.filter(u => u.type === 'admin').length;
  }

  get totalStudents(): number {
    return this.users.filter(u => u.type === 'student' || !u.type).length;
  }

  get totalQuizzesTaken(): number {
    return this.users.reduce((sum, user) => sum + (user.quizzes?.length || 0), 0);
  }

  constructor(
    private adminUserService: AdminUserService,
    private loginService: LoginService,
    private logger: LoggerService
  ) { }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.adminUserService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (error) => {
        this.logger.error('Error loading users', error);
        this.errorMessage = 'Failed to load users. Please try again.';
        this.loading = false;
      }
    });
  }

  onUserSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const userId = target.value;
    
    if (userId) {
      this.selectedUser = this.users.find(u => u.id === userId) || null;
    } else {
      this.selectedUser = null;
    }
  }

  getUserDisplayName(user: User): string {
    const name = `${user.fname || ''} ${user.lname || ''}`.trim();
    return name ? `${user.uname} (${name})` : user.uname;
  }

  changeUserType(user: User): void {
    if (!user || !user.id) {
      return;
    }

    const currentType = user.type || 'student';
    const newType = currentType === 'admin' ? 'student' : 'admin';
    const action = newType === 'admin' ? 'promote to administrator' : 'demote to student';
    
    // Prevent admin from demoting themselves
    const currentUser = this.loginService.user;
    if (currentUser && currentUser.id === user.id && currentType === 'admin' && newType === 'student') {
      this.confirmUser = user;
      this.confirmAction = null; // Informational only
      this.confirmTitle = 'Cannot Demote Yourself';
      this.confirmMessage = 'You cannot demote your own account from administrator while logged in.';
      this.showConfirmModal = true;
      return;
    }
    
    this.confirmUser = user;
    this.confirmAction = 'promote';
    this.confirmTitle = 'Change User Type';
    this.confirmMessage = `Are you sure you want to ${action} user "${user.uname}"?`;
    this.showConfirmModal = true;
  }

  private executePromote(): void {
    if (!this.confirmUser || !this.confirmUser.id) {
      return;
    }

    const currentType = this.confirmUser.type || 'student';
    const newType = currentType === 'admin' ? 'student' : 'admin';
    
    this.adminUserService.updateUserType(this.confirmUser.id, newType).subscribe({
      next: (_updatedUser) => {
        // Update the selected user
        if (this.selectedUser && this.selectedUser.id === this.confirmUser!.id) {
          this.selectedUser.type = newType;
        }
        
        // Update the user in the users array
        const userIndex = this.users.findIndex(u => u.id === this.confirmUser!.id);
        if (userIndex !== -1) {
          this.users[userIndex].type = newType;
        }
        
        this.logger.info('User type updated successfully');
      },
      error: (error) => {
        this.logger.error('Error updating user type', error);
        alert('Failed to update user type: ' + error);
      }
    });
  }

  deleteUser(user: User): void {
    if (!user || !user.id) {
      return;
    }

    // Prevent user from deleting themselves
    const currentUser = this.loginService.user;
    if (currentUser && currentUser.id === user.id) {
      this.confirmUser = user;
      this.confirmAction = null; // No action, just informational
      this.confirmTitle = 'Cannot Delete Account';
      this.confirmMessage = 'You cannot delete your own account while logged in.';
      this.showConfirmModal = true;
      return;
    }

    this.confirmUser = user;
    this.confirmAction = 'delete';
    this.confirmTitle = 'Delete User';
    this.confirmMessage = `Are you sure you want to delete user "${user.uname}"?`;
    this.showConfirmModal = true;
  }

  private executeDelete(): void {
    if (!this.confirmUser || !this.confirmUser.id) {
      return;
    }

    this.adminUserService.deleteUser(this.confirmUser.id).subscribe({
      next: () => {
        // Remove user from the list
        this.users = this.users.filter(u => u.id !== this.confirmUser!.id);
        
        // Clear selected user if it was the deleted one
        if (this.selectedUser && this.selectedUser.id === this.confirmUser!.id) {
          this.selectedUser = null;
        }
        
        alert('User deleted successfully');
      },
      error: (error) => {
        this.logger.error('Error deleting user', error);
        alert('Failed to delete user: ' + error);
      }
    });
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getScoreBadgeClass(score: number, total: number): string {
    if (!total) return 'bg-secondary';
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'bg-success';
    if (percentage >= 60) return 'bg-warning';
    return 'bg-danger';
  }

  formatDuration(seconds: number): string {
    if (!seconds || seconds < 0) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  reviewQuiz(quiz: any): void {
    this.reviewedQuiz = quiz;
    
    // Use Bootstrap's modal API to show the modal
    const modalElement = document.getElementById('quizReviewModal');
    if (modalElement) {
      // Dispose of existing instance if any
      if (this.modalInstance) {
        this.modalInstance.dispose();
      }
      this.modalInstance = new (window as any).bootstrap.Modal(modalElement);
      this.modalInstance.show();
    }
  }

  closeModal(): void {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
  }

  // A quiz stays reopened (one more attempt available) until the student
  // submits a retake, at which point the server clears it from
  // reopenedQuizIds again — see POST /api/quiz.
  isQuizReopened(quiz: any): boolean {
    return !!this.selectedUser?.reopenedQuizIds?.includes(quiz.id);
  }

  // Opens the confirm modal rather than reopening immediately — a misclick
  // here silently grants the wrong student (or the wrong quiz) an extra
  // attempt, so it goes through the same confirm-before-acting pattern as
  // deleteUser()/changeUserType() rather than firing on a single click.
  reopenQuiz(quiz: any): void {
    if (!this.selectedUser || !this.selectedUser.id || this.isQuizReopened(quiz)) {
      return;
    }

    this.confirmUser = this.selectedUser;
    this.confirmQuiz = quiz;
    this.confirmAction = 'reopen-quiz';
    this.confirmTitle = 'Reopen Quiz';
    this.confirmMessage = `Grant "${this.selectedUser.uname}" one more attempt at "${quiz.title}"?`;
    this.showConfirmModal = true;
  }

  private executeReopenQuiz(): void {
    if (!this.confirmUser || !this.confirmUser.id || !this.confirmQuiz) {
      return;
    }

    const user = this.confirmUser;
    const quiz = this.confirmQuiz;
    this.reopeningQuizId = quiz.id;

    this.adminUserService.reopenQuiz(user.id!, quiz.id).subscribe({
      next: () => {
        if (this.selectedUser && this.selectedUser.id === user.id) {
          this.selectedUser.reopenedQuizIds = [...(this.selectedUser.reopenedQuizIds || []), quiz.id];
        }
        this.reopeningQuizId = null;
        this.logger.info('Quiz reopened for user', { userId: user.id, quizId: quiz.id });
      },
      error: (error) => {
        this.logger.error('Error reopening quiz', error);
        alert('Failed to reopen quiz: ' + error);
        this.reopeningQuizId = null;
      }
    });
  }

  // Cancels an outstanding reopen grant before the student uses it — the
  // undo path for a misclick on reopenQuiz(). Also confirm-gated, same
  // rationale.
  revokeReopen(quiz: any): void {
    if (!this.selectedUser || !this.selectedUser.id || !this.isQuizReopened(quiz)) {
      return;
    }

    this.confirmUser = this.selectedUser;
    this.confirmQuiz = quiz;
    this.confirmAction = 'revoke-reopen';
    this.confirmTitle = 'Cancel Reopen';
    this.confirmMessage = `Cancel "${this.selectedUser.uname}"'s extra attempt at "${quiz.title}"?`;
    this.showConfirmModal = true;
  }

  private executeRevokeReopen(): void {
    if (!this.confirmUser || !this.confirmUser.id || !this.confirmQuiz) {
      return;
    }

    const user = this.confirmUser;
    const quiz = this.confirmQuiz;
    this.revokingQuizId = quiz.id;

    this.adminUserService.revokeReopen(user.id!, quiz.id).subscribe({
      next: () => {
        if (this.selectedUser && this.selectedUser.id === user.id) {
          this.selectedUser.reopenedQuizIds = (this.selectedUser.reopenedQuizIds || []).filter(id => id !== quiz.id);
        }
        this.revokingQuizId = null;
        this.logger.info('Reopen grant revoked for user', { userId: user.id, quizId: quiz.id });
      },
      error: (error) => {
        this.logger.error('Error revoking reopen grant', error);
        alert('Failed to cancel reopen: ' + error);
        this.revokingQuizId = null;
      }
    });
  }

  getAnswerText(question: any, answerNum: number): string {
    if (!question.answers || answerNum < 1 || answerNum > question.answers.length) {
      return 'N/A';
    }
    return question.answers[answerNum - 1];
  }

  // showConfirmModal is now a boolean property controlling modal visibility

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    // Reset confirmation state
    this.confirmAction = null;
    this.confirmUser = null;
    this.confirmQuiz = null;
    this.confirmMessage = '';
    this.confirmTitle = '';
  }

  confirmActionExecute(): void {
    if (this.confirmAction === 'promote') {
      this.executePromote();
    } else if (this.confirmAction === 'delete') {
      this.executeDelete();
    } else if (this.confirmAction === 'reopen-quiz') {
      this.executeReopenQuiz();
    } else if (this.confirmAction === 'revoke-reopen') {
      this.executeRevokeReopen();
    }
    this.closeConfirmModal();
  }

  getConfirmButtonClass(): string {
    if (this.confirmAction === 'delete') return 'btn-danger';
    if (this.confirmAction === 'reopen-quiz') return 'btn-warning';
    if (this.confirmAction === 'revoke-reopen') return 'btn-secondary';
    return 'btn-primary';
  }

  getConfirmButtonText(): string {
    if (this.confirmAction === 'delete') return 'Delete';
    if (this.confirmAction === 'reopen-quiz') return 'Reopen';
    if (this.confirmAction === 'revoke-reopen') return 'Cancel Reopen';
    return 'Confirm';
  }

}
