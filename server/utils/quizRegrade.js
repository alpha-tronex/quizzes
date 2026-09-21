/**
 * Pure regrade logic for the one-time historical backfill (see
 * scripts/regrade_historical_quizzes.js for the CLI/DB orchestration that
 * wraps this). Split out the same way utils/quizScoring.js is split from
 * routes/quizRoutes.js — so the core recompute logic is unit-testable
 * without a database.
 *
 * Historical attempts saved before the 0-based indexing fix recorded
 * `selection` as 1-based (`answerIndex + 1`) while `correct` — embedded on
 * the attempt at save time, see models/User.js's quizAttemptSchema — is
 * 0-based. `isCorrect`/`score` on those attempts were derived by comparing
 * the two directly, so they're wrong in the same systematic way the live
 * scoring bug was (and a question whose correct answer sits at index 0
 * could never have been recorded correct). This module reinterprets the
 * legacy `selection` as 1-based, shifts it down to 0-based, and recomputes
 * `isCorrect`/`score` from that against the (already-correct) embedded
 * `correct`.
 */

/** Numeric (not lexicographic) sort — see quizScoring.js for why this matters. */
function numericSort(arr) {
    return [...arr].sort((a, b) => a - b);
}

function arraysEqual(a, b) {
    return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Reinterprets one question's legacy 1-based `selection` as 0-based and
 * recomputes `isCorrect` against its embedded `correct`. Other fields
 * (question, answers, questionNum, ...) are carried through unchanged.
 *
 * Returns null if the question can't be safely reinterpreted: a 0 in
 * `selection` is impossible under the legacy 1-based encoding (the lowest
 * value a 1-based selection can hold is 1), so a question like that doesn't
 * match the assumption this backfill is built on and needs manual review
 * rather than a blind shift.
 */
function regradeQuestion(question) {
    const legacySelection = Array.isArray(question.selection) ? question.selection : [];
    if (legacySelection.some((value) => value <= 0)) {
        return null;
    }

    const selection = legacySelection.map((value) => value - 1);
    const correct = Array.isArray(question.correct) ? [...question.correct] : [];
    const isCorrect = arraysEqual(numericSort(selection), numericSort(correct));

    return { ...question, selection, isCorrect };
}

/**
 * Regrades every question on one saved attempt. Does not mutate `attempt`;
 * returns a plain result describing what the regraded attempt should look
 * like. The caller (the script) is responsible for writing it back.
 *
 * `skippedUnsafe: true` means at least one question failed the safety check
 * in regradeQuestion() — the whole attempt is left alone rather than
 * partially regraded, since a mixed-basis attempt needs a human, not a
 * guess.
 *
 * `changed` is false when regrading produced the exact same selection,
 * isCorrect, and score the attempt already had (e.g. an empty questions
 * array), so the caller knows not to bother writing it back.
 */
function regradeAttempt(attempt) {
    const originalQuestions = Array.isArray(attempt.questions) ? attempt.questions : [];
    if (originalQuestions.length === 0) {
        return { skippedUnsafe: false, changed: false, questions: originalQuestions, score: attempt.score };
    }

    const regradedQuestions = [];
    for (const question of originalQuestions) {
        const regraded = regradeQuestion(question);
        if (!regraded) {
            return { skippedUnsafe: true, changed: false, questions: originalQuestions, score: attempt.score };
        }
        regradedQuestions.push(regraded);
    }

    const score = regradedQuestions.filter((question) => question.isCorrect).length;
    const changed = score !== attempt.score || regradedQuestions.some((regraded, index) => {
        const original = originalQuestions[index];
        return !arraysEqual(original.selection || [], regraded.selection) ||
            Boolean(original.isCorrect) !== regraded.isCorrect;
    });

    return { skippedUnsafe: false, changed, questions: regradedQuestions, score };
}

module.exports = { regradeQuestion, regradeAttempt, numericSort, arraysEqual };
