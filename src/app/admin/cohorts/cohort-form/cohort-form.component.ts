import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminCohortService } from '@admin/services/admin-cohort.service';
import { AdminUserService } from '@admin/services/admin-user.service';
import { AdminQuizService } from '@admin/services/admin-quiz.service';
import { LoggerService } from '@core/services/logger.service';
import { CohortPayload, CohortQuizSummary } from '@models/cohort';
import { User } from '@models/users';

// Handles both "create" (no :id route param) and "edit" (:id present) so the
// name/date fields, the student/quiz pickers, and the save logic live in one
// place instead of being duplicated across separate create/edit components.
@Component({
    selector: 'app-cohort-form',
    templateUrl: './cohort-form.component.html',
    styleUrls: ['./cohort-form.component.css'],
    standalone: false
})
export class CohortFormComponent implements OnInit {
  isEditMode: boolean = false;
  cohortId: string | null = null;

  name: string = '';
  startDate: string = '';
  endDate: string = '';

  students: User[] = [];
  quizzes: CohortQuizSummary[] = [];
  selectedStudentIds = new Set<string>();
  selectedQuizIds = new Set<number>();

  studentSearch: string = '';

  loading: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private adminCohortService: AdminCohortService,
    private adminUserService: AdminUserService,
    private adminQuizService: AdminQuizService,
    private route: ActivatedRoute,
    private router: Router,
    private logger: LoggerService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.cohortId = params['id'] || null;
      this.isEditMode = !!this.cohortId;
      this.loadFormData();
    });
  }

  get filteredStudents(): User[] {
    const term = this.studentSearch.trim().toLowerCase();
    if (!term) {
      return this.students;
    }
    return this.students.filter(s =>
      s.uname.toLowerCase().includes(term) ||
      `${s.fname} ${s.lname}`.toLowerCase().includes(term)
    );
  }

  get selectedStudentCount(): number {
    return this.selectedStudentIds.size;
  }

  get selectedQuizCount(): number {
    return this.selectedQuizIds.size;
  }

  loadFormData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      users: this.adminUserService.getAllUsers(),
      quizzes: this.adminQuizService.getAvailableQuizzes()
    }).subscribe({
      next: ({ users, quizzes }) => {
        this.students = users.filter(u => u.type === 'student');
        this.quizzes = quizzes;

        if (this.isEditMode && this.cohortId) {
          this.loadCohort(this.cohortId);
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        this.logger.error('Error loading cohort form data', error);
        this.errorMessage = 'Failed to load students and quizzes';
        this.loading = false;
      }
    });
  }

  loadCohort(cohortId: string): void {
    this.adminCohortService.getCohortById(cohortId).subscribe({
      next: (cohort) => {
        this.name = cohort.name;
        this.startDate = this.toDateInputValue(cohort.startDate);
        this.endDate = this.toDateInputValue(cohort.endDate);
        this.selectedStudentIds = new Set(cohort.students.map(s => s.id));
        this.selectedQuizIds = new Set(cohort.quizzes.map(q => q.id));
        this.loading = false;
      },
      error: (error) => {
        this.logger.error('Error loading cohort', error);
        this.errorMessage = 'Failed to load cohort';
        this.loading = false;
      }
    });
  }

  isStudentSelected(id: string): boolean {
    return this.selectedStudentIds.has(id);
  }

  toggleStudent(id: string): void {
    if (this.selectedStudentIds.has(id)) {
      this.selectedStudentIds.delete(id);
    } else {
      this.selectedStudentIds.add(id);
    }
  }

  isQuizSelected(id: number): boolean {
    return this.selectedQuizIds.has(id);
  }

  toggleQuiz(id: number): void {
    if (this.selectedQuizIds.has(id)) {
      this.selectedQuizIds.delete(id);
    } else {
      this.selectedQuizIds.add(id);
    }
  }

  save(): void {
    if (!this.name.trim()) {
      this.errorMessage = 'Please enter a cohort name';
      return;
    }
    if (!this.startDate || !this.endDate) {
      this.errorMessage = 'Please select a start and end date';
      return;
    }
    if (this.startDate > this.endDate) {
      this.errorMessage = 'End date must be after start date';
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    const payload: CohortPayload = {
      name: this.name.trim(),
      startDate: this.startDate,
      endDate: this.endDate,
      students: Array.from(this.selectedStudentIds),
      quizzes: Array.from(this.selectedQuizIds)
    };

    const request$ = this.isEditMode && this.cohortId
      ? this.adminCohortService.updateCohort(this.cohortId, payload)
      : this.adminCohortService.createCohort(payload);

    request$.subscribe({
      next: () => {
        this.successMessage = `Cohort ${this.isEditMode ? 'updated' : 'created'} successfully!`;
        setTimeout(() => {
          this.router.navigate(['/admin/cohort-management']);
        }, 1200);
      },
      error: (error) => {
        this.errorMessage = error;
        this.isSubmitting = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/cohort-management']);
  }

  private toDateInputValue(date: string): string {
    if (!date) {
      return '';
    }
    return new Date(date).toISOString().slice(0, 10);
  }
}
