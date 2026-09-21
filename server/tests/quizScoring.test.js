const { computeAuthoritativeScore } = require('../utils/quizScoring');

// Regression tests for the server-side scoring fix. Before this, POST
// /api/quiz trusted whatever score/isCorrect the client submitted, which is
// what let the client-side 1-based/0-based indexing bug (see
// questions.component.ts / TakeQuizScreen.tsx) silently corrupt every
// student's saved score. computeAuthoritativeScore() ignores any
// correct/isCorrect/score the client submits and recomputes everything from
// the canonical Quiz document instead.

function makeQuiz(overrides = {}) {
    return {
        questions: [
            { questionNum: 0, answers: ['3', '4', '5', '6'], correct: [1] },
            { questionNum: 1, answers: ['True', 'False'], correct: [0] }
        ],
        ...overrides
    };
}

describe('computeAuthoritativeScore()', () => {
    it('marks a question correct when selection matches the canonical correct indices', () => {
        const quiz = makeQuiz();
        const submitted = [
            { questionNum: 0, selection: [1] },
            { questionNum: 1, selection: [0] }
        ];

        const result = computeAuthoritativeScore(quiz, submitted);

        expect(result.score).toBe(2);
        expect(result.totalQuestions).toBe(2);
        expect(result.questions[0]).toMatchObject({ isCorrect: true, correct: [1] });
        expect(result.questions[1]).toMatchObject({ isCorrect: true, correct: [0] });
    });

    it('scores a question correct at index 0 (the case the old bug could never satisfy)', () => {
        const quiz = makeQuiz();
        const submitted = [
            { questionNum: 0, selection: [0] }, // wrong on purpose
            { questionNum: 1, selection: [0] }  // correct: index 0
        ];

        const result = computeAuthoritativeScore(quiz, submitted);

        expect(result.questions[1].isCorrect).toBe(true);
        expect(result.score).toBe(1);
    });

    it('ignores a client-submitted correct/isCorrect and derives its own', () => {
        const quiz = makeQuiz();
        const submitted = [
            // Client lies: claims it's correct and supplies a bogus `correct`.
            { questionNum: 0, selection: [3], correct: [3], isCorrect: true }
        ];

        const result = computeAuthoritativeScore(quiz, submitted);

        expect(result.questions[0]).toMatchObject({ correct: [1], isCorrect: false });
        expect(result.score).toBe(0);
    });

    it('sorts numerically, not lexicographically, when comparing multi-select answers', () => {
        const quiz = makeQuiz({
            questions: [
                { questionNum: 0, answers: Array.from({ length: 11 }, (_, i) => String(i)), correct: [2, 10] }
            ]
        });
        const submitted = [{ questionNum: 0, selection: [10, 2] }];

        const result = computeAuthoritativeScore(quiz, submitted);

        expect(result.questions[0].isCorrect).toBe(true);
    });

    it('marks a question incorrect when the selection is a partial match', () => {
        const quiz = makeQuiz({
            questions: [{ questionNum: 0, answers: ['A', 'B', 'C'], correct: [0, 2] }]
        });
        const submitted = [{ questionNum: 0, selection: [0] }];

        const result = computeAuthoritativeScore(quiz, submitted);

        expect(result.questions[0].isCorrect).toBe(false);
    });

    it('treats a question with no matching questionNum in the canonical quiz as unscorable (empty correct)', () => {
        const quiz = makeQuiz();
        const submitted = [{ questionNum: 99, selection: [0] }];

        const result = computeAuthoritativeScore(quiz, submitted);

        expect(result.questions[0]).toMatchObject({ correct: [], isCorrect: false });
    });

    it('handles a missing/empty submitted questions array', () => {
        const quiz = makeQuiz();

        expect(computeAuthoritativeScore(quiz, undefined)).toEqual({ questions: [], score: 0, totalQuestions: 0 });
        expect(computeAuthoritativeScore(quiz, [])).toEqual({ questions: [], score: 0, totalQuestions: 0 });
    });

    it('preserves other submitted question fields (e.g. question text, answers, selection)', () => {
        const quiz = makeQuiz();
        const submitted = [{ questionNum: 0, question: 'Solve for x', answers: ['3', '4', '5', '6'], selection: [1] }];

        const result = computeAuthoritativeScore(quiz, submitted);

        expect(result.questions[0]).toMatchObject({
            questionNum: 0,
            question: 'Solve for x',
            answers: ['3', '4', '5', '6'],
            selection: [1]
        });
    });
});
