const { regradeQuestion, regradeAttempt, numericSort, arraysEqual } = require('../utils/quizRegrade');

// Unit tests for the historical backfill's pure recompute logic (see
// scripts/regrade_historical_quizzes.js). Unlike quizRoutes.test.js /
// quizScoring.test.js, these need no database — regradeQuestion/
// regradeAttempt operate on plain objects, which is the whole point of
// splitting them out of the script.

describe('numericSort()', () => {
    it('sorts numerically, not lexicographically', () => {
        expect(numericSort([10, 2, 1])).toEqual([1, 2, 10]);
    });

    it('does not mutate the input array', () => {
        const input = [3, 1, 2];
        numericSort(input);
        expect(input).toEqual([3, 1, 2]);
    });
});

describe('arraysEqual()', () => {
    it('is true for identical arrays in the same order', () => {
        expect(arraysEqual([1, 2], [1, 2])).toBe(true);
    });

    it('is false for different lengths or values', () => {
        expect(arraysEqual([1, 2], [1])).toBe(false);
        expect(arraysEqual([1, 2], [1, 3])).toBe(false);
    });
});

describe('regradeQuestion()', () => {
    it('shifts a legacy 1-based selection down to 0-based', () => {
        const question = { questionNum: 0, selection: [2], correct: [1] };

        const result = regradeQuestion(question);

        expect(result.selection).toEqual([1]);
        expect(result.isCorrect).toBe(true);
    });

    it('marks correct at index 0 — the case the old client-side bug could never satisfy', () => {
        const question = { questionNum: 0, selection: [1], correct: [0] };

        const result = regradeQuestion(question);

        expect(result.selection).toEqual([0]);
        expect(result.isCorrect).toBe(true);
    });

    it('marks incorrect when the shifted selection does not match correct', () => {
        const question = { questionNum: 0, selection: [1], correct: [2] };

        const result = regradeQuestion(question);

        expect(result.selection).toEqual([0]);
        expect(result.isCorrect).toBe(false);
    });

    it('sorts numerically, not lexicographically, when comparing multi-select answers', () => {
        // Legacy 1-based selection [11, 3] shifts to 0-based [10, 2], which
        // should match correct [2, 10] regardless of order.
        const question = { questionNum: 0, selection: [11, 3], correct: [2, 10] };

        const result = regradeQuestion(question);

        expect(result.isCorrect).toBe(true);
    });

    it('returns null when selection contains a 0 (impossible under 1-based encoding)', () => {
        const question = { questionNum: 0, selection: [0, 1], correct: [0] };

        expect(regradeQuestion(question)).toBeNull();
    });

    it('treats a missing/empty selection as legacy "no answer" and marks it incorrect', () => {
        const question = { questionNum: 0, selection: [], correct: [0] };

        const result = regradeQuestion(question);

        expect(result.selection).toEqual([]);
        expect(result.isCorrect).toBe(false);
    });

    it('preserves other question fields (question text, answers, questionNum)', () => {
        const question = {
            questionNum: 3,
            question: 'Solve for x',
            answers: ['3', '4', '5', '6'],
            selection: [2],
            correct: [1]
        };

        const result = regradeQuestion(question);

        expect(result).toMatchObject({
            questionNum: 3,
            question: 'Solve for x',
            answers: ['3', '4', '5', '6']
        });
    });
});

describe('regradeAttempt()', () => {
    it('regrades every question and recomputes the attempt score', () => {
        const attempt = {
            score: 0, // wrong, per the old bug — both of these are actually correct once shifted
            questions: [
                { questionNum: 0, selection: [2], correct: [1] },
                { questionNum: 1, selection: [1], correct: [0] }
            ]
        };

        const result = regradeAttempt(attempt);

        expect(result.skippedUnsafe).toBe(false);
        expect(result.changed).toBe(true);
        expect(result.score).toBe(2);
        expect(result.questions[0]).toMatchObject({ selection: [1], isCorrect: true });
        expect(result.questions[1]).toMatchObject({ selection: [0], isCorrect: true });
    });

    it('reports skippedUnsafe and leaves the attempt untouched if any question is unsafe', () => {
        const attempt = {
            score: 1,
            questions: [
                { questionNum: 0, selection: [2], correct: [1] },
                { questionNum: 1, selection: [0], correct: [0] } // unsafe: 0 in selection
            ]
        };

        const result = regradeAttempt(attempt);

        expect(result.skippedUnsafe).toBe(true);
        expect(result.changed).toBe(false);
        expect(result.questions).toBe(attempt.questions);
        expect(result.score).toBe(attempt.score);
    });

    it('reports changed:false for an attempt with no questions', () => {
        const attempt = { score: 0, questions: [] };

        const result = regradeAttempt(attempt);

        expect(result).toEqual({ skippedUnsafe: false, changed: false, questions: [], score: 0 });
    });

    it('detects a per-question change even when the overall score happens to stay the same', () => {
        // Old (buggy) scoring marked q0 correct and q1 incorrect. After the
        // shift it's the reverse — same score (1), but `changed` must still
        // be true because the comparison is per-question, not just score.
        const attempt = {
            score: 1,
            questions: [
                { questionNum: 0, selection: [1], correct: [1], isCorrect: true },
                { questionNum: 1, selection: [1], correct: [0], isCorrect: false }
            ]
        };

        const result = regradeAttempt(attempt);

        expect(result.score).toBe(1);
        expect(result.changed).toBe(true);
        expect(result.questions[0].isCorrect).toBe(false);
        expect(result.questions[1].isCorrect).toBe(true);
    });

    it('is not idempotent to run twice — confirms why the script needs a cutoff-date guard', () => {
        const attempt = {
            score: 0,
            questions: [{ questionNum: 0, selection: [1], correct: [0] }]
        };

        const firstPass = regradeAttempt(attempt);
        expect(firstPass.questions[0].selection).toEqual([0]);

        // Regrading the already-regraded output reinterprets its 0-based
        // selection [0] as legacy 1-based, which is unsafe (0 is impossible
        // under 1-based encoding) — this is exactly the corruption the
        // script's --cutoff guard exists to prevent.
        const secondPass = regradeAttempt({ score: firstPass.score, questions: firstPass.questions });
        expect(secondPass.skippedUnsafe).toBe(true);
    });
});
