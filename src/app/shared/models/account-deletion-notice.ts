// Mirrors server/models/AccountDeletionNotice.js's JSON shape, as returned
// by GET /api/admin/account-deletion-notices — see adminUserRoutes.js.
export class AccountDeletionNotice {
    id: string;
    studentUsername: string;
    studentFname: string;
    studentLname: string;
    cohortNames: string[];
    quizzesTakenCount: number;
    deletedAt: Date;
    acknowledged: boolean;
    acknowledgedByUsername: string | null;
    acknowledgedAt: Date | null;
}
