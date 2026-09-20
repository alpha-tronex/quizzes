import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Cohort, CohortPayload } from '@models/cohort';
import { LoggerService } from '@core/services/logger.service';

@Injectable({
  providedIn: 'root'
})
export class AdminCohortService {

  constructor(private http: HttpClient, private logger: LoggerService) { }

  getAllCohorts(): Observable<Cohort[]> {
    return this.http.get<Cohort[]>('/api/admin/cohorts').pipe(
      catchError((error) => this.handleError(error))
    );
  }

  getCohortById(cohortId: string): Observable<Cohort> {
    return this.http.get<Cohort>(`/api/admin/cohorts/${cohortId}`).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  createCohort(payload: CohortPayload): Observable<Cohort> {
    return this.http.post<Cohort>('/api/admin/cohorts', payload).pipe(
      tap(response => this.logger.info('Cohort created', response)),
      catchError((error) => this.handleError(error))
    );
  }

  updateCohort(cohortId: string, payload: Partial<CohortPayload>): Observable<Cohort> {
    return this.http.put<Cohort>(`/api/admin/cohorts/${cohortId}`, payload).pipe(
      tap(response => this.logger.info('Cohort updated', response)),
      catchError((error) => this.handleError(error))
    );
  }

  deleteCohort(cohortId: string): Observable<any> {
    return this.http.delete(`/api/admin/cohorts/${cohortId}`).pipe(
      tap(() => this.logger.info('Cohort deleted', { cohortId })),
      catchError((error) => this.handleError(error))
    );
  }

  // Server errors arrive as { error: { code, message, details? } } (see
  // server/utils/apiError.js / middleware/errorHandler.js). `details` carries
  // the field-level validation messages from adminCohortRoutes.js's
  // validateCohortPayload — surface them so a rejected save tells the admin
  // exactly what to fix instead of a generic failure string.
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      const apiError = error.error?.error;
      if (apiError && typeof apiError === 'object') {
        const details = Array.isArray(apiError.details) && apiError.details.length
          ? `: ${apiError.details.join(', ')}`
          : '';
        errorMessage = `${apiError.message || 'Request failed'}${details}`;
      } else {
        errorMessage = error.error?.message || error.message || 'Server error';
      }
    }

    this.logger.error('Admin cohort service error', errorMessage);
    return throwError(() => errorMessage);
  }
}
