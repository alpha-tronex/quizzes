import { Component, OnInit } from '@angular/core';
import { Cohort } from '@models/cohort';
import { AdminCohortService } from '@admin/services/admin-cohort.service';
import { LoggerService } from '@core/services/logger.service';

@Component({
    selector: 'app-cohort-management',
    templateUrl: './cohort-management.component.html',
    styleUrls: ['./cohort-management.component.css'],
    standalone: false
})
export class CohortManagementComponent implements OnInit {
  cohorts: Cohort[] = [];
  loading: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' | '' = '';

  showConfirmModal: boolean = false;
  confirmCohort: Cohort | null = null;

  constructor(
    private adminCohortService: AdminCohortService,
    private logger: LoggerService
  ) { }

  ngOnInit() {
    this.loadCohorts();
  }

  loadCohorts(): void {
    this.loading = true;
    this.adminCohortService.getAllCohorts().subscribe({
      next: (data) => {
        this.cohorts = data;
        this.loading = false;
      },
      error: (error) => {
        this.logger.error('Error loading cohorts', error);
        this.showMessage('Failed to load cohorts', 'error');
        this.loading = false;
      }
    });
  }

  get totalCohorts(): number {
    return this.cohorts.length;
  }

  get activeCohorts(): number {
    const now = new Date();
    return this.cohorts.filter(c => new Date(c.startDate) <= now && new Date(c.endDate) >= now).length;
  }

  get totalStudentEnrollments(): number {
    return this.cohorts.reduce((sum, c) => sum + (c.students?.length || 0), 0);
  }

  cohortStatus(cohort: Cohort): 'upcoming' | 'active' | 'ended' {
    const now = new Date();
    if (new Date(cohort.startDate) > now) return 'upcoming';
    if (new Date(cohort.endDate) < now) return 'ended';
    return 'active';
  }

  statusBadgeClass(cohort: Cohort): string {
    switch (this.cohortStatus(cohort)) {
      case 'active': return 'bg-success';
      case 'upcoming': return 'bg-info';
      case 'ended': return 'bg-secondary';
    }
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  deleteCohort(cohort: Cohort): void {
    this.confirmCohort = cohort;
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmCohort = null;
  }

  confirmDelete(): void {
    if (!this.confirmCohort) {
      return;
    }

    const cohort = this.confirmCohort;
    this.loading = true;
    this.adminCohortService.deleteCohort(cohort.id).subscribe({
      next: () => {
        this.cohorts = this.cohorts.filter(c => c.id !== cohort.id);
        this.showMessage(`Cohort "${cohort.name}" deleted successfully`, 'success');
        this.loading = false;
      },
      error: (error) => {
        this.logger.error('Error deleting cohort', error);
        this.showMessage('Failed to delete cohort: ' + error, 'error');
        this.loading = false;
      }
    });
    this.closeConfirmModal();
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
      this.messageType = '';
    }, 5000);
  }
}
