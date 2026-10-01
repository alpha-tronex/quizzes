const mongoose = require('mongoose');

// A lightweight, standalone record of a self-service account deletion
// (DELETE /api/account — see routes/authRoutes.js) for a student who was a
// member of at least one real (non-guest) cohort at the time they deleted
// their account. Created *after* the user document is already gone, so it
// snapshots just enough identifying info for an admin to recognize who left
// — it is not a soft-delete and has no bearing on the deletion itself,
// which stays immediate and irreversible per App Store Guideline 5.1.1(v).
//
// Guest-cohort/no-cohort deletions intentionally don't create one of these:
// the whole point is surfacing departures that affect a real course
// roster, not every account deletion in general (see
// utils/accountDeletionNotices.js for where that filtering happens).
//
// "Archiving" a notice (acknowledged: true) just means an admin has seen
// it — the record itself is never deleted, so it doubles as a simple
// historical log.
const accountDeletionNoticeSchema = new mongoose.Schema({
    studentUsername: { type: String, required: true },
    studentFname: { type: String, default: '' },
    studentLname: { type: String, default: '' },
    // Names, not ids — the Cohort document itself isn't touched by account
    // deletion, but storing a live reference would make this notice's
    // meaning drift if that cohort is later renamed or deleted; a name
    // snapshot stays an accurate record of what was true at deletion time.
    cohortNames: { type: [String], default: [] },
    quizzesTakenCount: { type: Number, default: 0 },
    deletedAt: { type: Date, required: true },
    acknowledged: { type: Boolean, default: false },
    acknowledgedByUsername: { type: String, default: null },
    acknowledgedAt: { type: Date, default: null }
}, { timestamps: true });

// The admin banner only ever queries unacknowledged notices.
accountDeletionNoticeSchema.index({ acknowledged: 1 });

module.exports = mongoose.models.AccountDeletionNotice
    || mongoose.model('AccountDeletionNotice', accountDeletionNoticeSchema);
