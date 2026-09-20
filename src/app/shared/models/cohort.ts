// A Cohort groups students to a set of quizzes over a date range. Mirrors the
// response shape of server/routes/adminCohortRoutes.js's toCohortResponse()
// exactly, so no adapter/mapping layer is needed between API and template.

export interface CohortStudentSummary {
    id: string;
    uname: string;
    fname: string;
    lname: string;
}

export interface CohortQuizSummary {
    id: number;
    title: string;
}

export class Cohort {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    students: CohortStudentSummary[];
    quizzes: CohortQuizSummary[];
}

// POST/PUT /api/admin/cohorts body shape — students/quizzes are ID arrays,
// not the populated summaries the GET responses return (see server/routes/
// adminCohortRoutes.js's validateCohortPayload).
export interface CohortPayload {
    name: string;
    startDate: string;
    endDate: string;
    students: string[];
    quizzes: number[];
}
